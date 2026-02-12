import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const REVENUCAT_WEBHOOK_AUTH = Deno.env.get('REVENUCAT_WEBHOOK_AUTH') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
  // Verify webhook auth
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${REVENUCAT_WEBHOOK_AUTH}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();
    const event = body.event;

    if (!event) {
      return new Response('No event in body', { status: 400 });
    }

    const appUserId = event.app_user_id;
    if (!appUserId) {
      return new Response('No app_user_id', { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const eventType = event.type;
    console.log(`[RevenueCat Webhook] Event: ${eventType} for user: ${appUserId}`);

    // Events that grant premium
    const grantEvents = [
      'INITIAL_PURCHASE',
      'RENEWAL',
      'PRODUCT_CHANGE',
      'UNCANCELLATION',
    ];

    // Events that revoke premium
    const revokeEvents = [
      'EXPIRATION',
      'BILLING_ISSUE',
      'CANCELLATION',
    ];

    if (grantEvents.includes(eventType)) {
      const expiresAt = event.expiration_at_ms
        ? new Date(event.expiration_at_ms).toISOString()
        : null;

      const { error } = await supabase
        .from('profiles')
        .update({
          is_premium: true,
          premium_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appUserId);

      if (error) {
        console.error('[RevenueCat Webhook] Update error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      console.log(`[RevenueCat Webhook] Premium granted for ${appUserId}`);
    } else if (revokeEvents.includes(eventType)) {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_premium: false,
          premium_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appUserId);

      if (error) {
        console.error('[RevenueCat Webhook] Update error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      console.log(`[RevenueCat Webhook] Premium revoked for ${appUserId}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[RevenueCat Webhook] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});
