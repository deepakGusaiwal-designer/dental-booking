import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env and fill both in."
  );
}

// This key ships to the browser by design. It is safe only because the
// appointments table has RLS with no anon policy — see supabase/schema.sql.
export const supabase = createClient(supabaseUrl, supabaseKey);
