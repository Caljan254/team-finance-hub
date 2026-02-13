import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Known Safaricom M-Pesa IP ranges
const ALLOWED_IP_PREFIXES = ['196.201.214.', '196.201.212.'];

function isAllowedIP(req: Request): boolean {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')
    || '';
  if (!ip) return true; // Edge runtime may not expose IP
  return ALLOWED_IP_PREFIXES.some(prefix => ip.startsWith(prefix)) || ip === '127.0.0.1';
}

function isValidCallbackPayload(body: any): boolean {
  return body?.Body?.stkCallback &&
    typeof body.Body.stkCallback.ResultCode === 'number' &&
    typeof body.Body.stkCallback.CheckoutRequestID === 'string';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Enforce IP validation
    if (!isAllowedIP(req)) {
      console.warn('Rejected callback from unauthorized IP');
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    console.log('M-Pesa Callback received');

    // Reject invalid payloads
    if (!isValidCallbackPayload(body)) {
      console.warn('Invalid callback payload structure');
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callback = body.Body.stkCallback;
    const resultCode = callback.ResultCode;
    const checkoutRequestID = callback.CheckoutRequestID;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (resultCode === 0) {
      const items = callback.CallbackMetadata?.Item || [];
      const getItem = (name: string) => items.find((i: any) => i.Name === name)?.Value;

      const mpesaReceiptNumber = getItem('MpesaReceiptNumber');
      const amount = getItem('Amount');

      console.log(`Payment successful: Receipt=${mpesaReceiptNumber}, Amount=${amount}`);

      const { data: updatedPayments, error } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString(),
          transaction_id: mpesaReceiptNumber,
        })
        .eq('transaction_id', checkoutRequestID)
        .eq('status', 'pending')
        .select('user_id, month, year, amount');

      if (error) {
        console.error('DB update error:', error);
      }

      if (updatedPayments && updatedPayments.length > 0) {
        const payment = updatedPayments[0];
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', payment.user_id)
          .single();

        if (profile) {
          await supabase.from('contribution_records').upsert({
            member_name: profile.full_name,
            user_id: payment.user_id,
            month: payment.month,
            year: payment.year,
            amount: payment.amount,
            status: 'paid',
            paid_date: new Date().toISOString(),
            transaction_id: mpesaReceiptNumber,
          }, { onConflict: 'member_name,month,year' });
        }
      }
    } else {
      console.log(`Payment failed: ResultCode=${resultCode}`);

      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('transaction_id', checkoutRequestID)
        .eq('status', 'pending');
    }

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Callback processing error');
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
