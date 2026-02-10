import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('M-Pesa Callback:', JSON.stringify(body));

    const callback = body?.Body?.stkCallback;
    if (!callback) {
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resultCode = callback.ResultCode;
    const checkoutRequestID = callback.CheckoutRequestID;

    if (resultCode === 0) {
      // Payment successful - extract details
      const items = callback.CallbackMetadata?.Item || [];
      const getItem = (name: string) => items.find((i: any) => i.Name === name)?.Value;

      const mpesaReceiptNumber = getItem('MpesaReceiptNumber');
      const amount = getItem('Amount');
      const phoneNumber = getItem('PhoneNumber');

      console.log(`Payment successful: ${mpesaReceiptNumber}, Amount: ${amount}, Phone: ${phoneNumber}`);

      // Update payment in database using service role
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Find pending payment with matching checkout request ID and update it
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString(),
          transaction_id: mpesaReceiptNumber,
        })
        .eq('transaction_id', checkoutRequestID)
        .eq('status', 'pending');

      if (error) {
        console.error('DB update error:', error);
      }
    } else {
      console.log(`Payment failed: ResultCode=${resultCode}, Desc=${callback.ResultDesc}`);
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

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
    console.error('Callback error:', error);
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
