import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const msg91AuthKey = Deno.env.get('MSG91_AUTH_KEY');
const msg91SenderId = Deno.env.get('MSG91_SENDER_ID');
const msg91Route = Deno.env.get('MSG91_ROUTE') || '4';
const msg91Country = Deno.env.get('MSG91_COUNTRY') || '91';

serve(async (req) => {
  try {
    const { name, phone, date, time } = await req.json();

    if (!msg91AuthKey || !msg91SenderId) {
      return new Response(
        JSON.stringify({ ok: false, reason: 'missing-config' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const digits = String(phone || '').replace(/\D/g, '');
    const mobile = digits.startsWith('91')
      ? digits
      : digits.startsWith('0')
        ? `91${digits.slice(1)}`
        : `91${digits}`;

    const message = `Hi ${name || 'there'}, your dental appointment is confirmed for ${date} at ${time}.`;
    const url = new URL('https://control.msg91.com/api/sendhttp.php');
    url.searchParams.set('authkey', msg91AuthKey);
    url.searchParams.set('mob', mobile);
    url.searchParams.set('message', message);
    url.searchParams.set('sender', msg91SenderId);
    url.searchParams.set('route', msg91Route);
    url.searchParams.set('country', msg91Country);
    url.searchParams.set('unicode', '1');

    const response = await fetch(url.toString(), { method: 'GET' });
    const text = await response.text();
    const ok = response.ok && !text.toLowerCase().includes('error');

    return new Response(JSON.stringify({ ok, raw: text }), {
      status: ok ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
