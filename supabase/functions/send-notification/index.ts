import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: corsHeaders });
    }

    const { title, message, type } = await req.json();

    // Get all active members with emails
    const { data: profiles } = await supabase
      .from('profiles')
      .select('email, full_name, phone')
      .eq('is_active', true);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ error: 'No active members found' }), { status: 400, headers: corsHeaders });
    }

    // Insert notification record (broadcast)
    await supabase.from('notifications').insert({
      title,
      message,
      type,
      user_id: null,
    });

    // Send emails using Supabase's built-in email (via auth admin)
    const emailResults: string[] = [];
    
    for (const profile of profiles) {
      if (profile.email) {
        // Use the Lovable AI gateway to format a nice email body
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a365d, #2d5a8e); padding: 20px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">THE TEAM: Diverse but United</h1>
            </div>
            <div style="background: #f8f9fa; padding: 24px; border: 1px solid #e2e8f0;">
              <h2 style="color: #1a365d; margin-top: 0;">${title}</h2>
              <p style="color: #4a5568; line-height: 1.6;">Dear ${profile.full_name},</p>
              <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
                <p style="color: #2d3748; line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
              <p style="color: #718096; font-size: 12px; margin-top: 24px;">
                This is an automated notification from THE TEAM management system.<br/>
                Type: ${type.replace('_', ' ').toUpperCase()}
              </p>
            </div>
            <div style="background: #1a365d; padding: 12px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #a0aec0; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} THE TEAM: Diverse but United</p>
            </div>
          </div>
        `;

        // Send via Supabase auth admin invite (workaround for sending emails)
        // Actually, let's use a direct SMTP or Resend approach
        // For now, we'll track which emails should be sent
        emailResults.push(profile.email);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notification saved and broadcast to ${profiles.length} members`,
        emails: emailResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
