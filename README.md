# BrightSmile Dental — Appointment Booking

A React app for booking dental checkups, built with Vite, Tailwind CSS, shadcn/ui,
and Supabase (Postgres + Auth) for storage.

## Features
- **Book appointment** tab — name, Indian mobile number, date and a 15-minute slot
  between 10:00 AM and 9:00 PM. No account needed.
- **Admin** tab — staff sign in with a real email/password and see every upcoming
  booking, updating live as they come in. Bookings can be cancelled from the table.
- One booking per phone number, one booking per slot — both enforced by database
  constraints, not by the browser.

## Setup

### 1. Create the Supabase project
1. Sign up at [supabase.com](https://supabase.com) and create a project (the free
   tier is enough). Pick the region closest to your patients.
2. Open **SQL Editor → New query**, paste all of [supabase/schema.sql](supabase/schema.sql),
   and hit **Run**. This creates the table, the constraints, Row Level Security and
   the three functions the app calls.

### 2. Point the app at it
Copy `.env.example` to `.env` and fill in the two values from
**Project Settings → Data API** (URL) and **Project Settings → API Keys** (the
*anon* / publishable key):

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

`.env` is gitignored. Never put the `service_role` key in this file — anything
prefixed `VITE_` is compiled into the public JavaScript bundle.

### 3. Create the staff login
1. **Authentication → Users → Add user**, with an email and password. Tick
   *Auto Confirm User* so no confirmation email is needed.
2. **Authentication → Sign In / Providers → Email**: turn **off** "Allow new users
   to sign up". Otherwise anyone could create an account and read patient data.

### 4. Run it
```bash
npm install
npm run dev
```

## Deploying to your domain

```bash
npm run build     # produces dist/
```

`dist/` is plain static files, so any host works:

- **Vercel / Netlify / Cloudflare Pages** — connect the repo, build command
  `npm run build`, output directory `dist`. Add `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` in the host's environment-variable settings (the `.env`
  file is not committed), then add your domain and follow their DNS instructions.
  HTTPS is issued automatically.
- **cPanel / shared hosting** — upload the *contents* of `dist/` into `public_html`.

Whichever you choose, add your live domain under Supabase
**Authentication → URL Configuration → Site URL** so staff sign-in redirects work.

## How data is stored

The browser never touches the `appointments` table directly. RLS is on with **no
policy for the anon role**, so the public key cannot read a single row — patient
names and phone numbers are only reachable by a signed-in staff session.

The public side goes through three `security definer` functions instead:

| Function | Used for | Exposes |
| --- | --- | --- |
| `taken_slots()` | greying out booked slots | date + slot, no personal data |
| `booking_for_phone(phone)` | "this number already has a booking" hint | date + slot for one known number |
| `book_appointment(...)` | making a booking | nothing; re-validates and writes |

`book_appointment` re-checks the name, phone format, date and slot server-side and
does the replace-then-insert in one transaction, so two people racing for the same
slot can't both win.

## Project structure
```
supabase/schema.sql     # run once in the Supabase SQL editor
src/
  App.jsx               # the two-tab app (booking + admin)
  lib/supabase.js       # client, reads the VITE_ env vars
  lib/booking.js        # phone rules + the 15-minute slot table
  hooks/use-booking.js  # public availability + booking
  hooks/use-admin.js    # auth session + the full appointment list
  components/           # BookingForm, AdminPanel, AdminLogin, AppointmentsTable
  components/ui/        # shadcn components
```

## SMS confirmation setup

To send a confirmation SMS after a successful appointment booking, add a Supabase Edge Function named `send-booking-confirmation`.

### 1. Create the Edge Function
Run:

```bash
supabase functions new send-booking-confirmation
```

### 2. Add the function code
In the generated file, use your MSG91 account. The app is already wired to call the function with the booking details.

```ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const msg91AuthKey = Deno.env.get('MSG91_AUTH_KEY');
const msg91SenderId = Deno.env.get('MSG91_SENDER_ID');
const msg91Route = Deno.env.get('MSG91_ROUTE') || '4';
const msg91Country = Deno.env.get('MSG91_COUNTRY') || '91';

serve(async (req) => {
  try {
    const { name, phone, date, time } = await req.json();

    if (!msg91AuthKey || !msg91SenderId) {
      return new Response(JSON.stringify({ ok: false, reason: 'missing-config' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
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
```

### 3. Set environment variables
In the Supabase project dashboard, add these secrets:

- `MSG91_AUTH_KEY`
- `MSG91_SENDER_ID`
- `MSG91_ROUTE` (optional, default `4`)
- `MSG91_COUNTRY` (optional, default `91`)

### 4. Deploy the function
```bash
supabase functions deploy send-booking-confirmation
```

### 5. Optional: trigger from database instead of the frontend
If you want the SMS to be sent even when a booking is created from another source, you can also add a Postgres trigger or call the function from the database side. For now, the app triggers it after a successful client-side booking.

## Not included yet
- **Rate limiting** on `book_appointment`. Anyone with the public key can call it,
  so a determined person could spam bookings from many phone numbers. Adding a
  captcha (Supabase supports hCaptcha/Turnstile) is the usual fix.
