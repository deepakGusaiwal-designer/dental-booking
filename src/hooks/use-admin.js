import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";

/**
 * Staff side: a real Supabase Auth session, plus the full appointment list
 * that RLS only hands out once that session exists.
 */
export function useAdmin() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("id, name, phone, date, slot, created_at")
      .gte("date", format(new Date(), "yyyy-MM-dd"))
      .order("date", { ascending: true })
      .order("slot", { ascending: true });
    setLoading(false);
    if (error) return;
    setAppointments(
      (data ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        phone: a.phone,
        date: a.date,
        time: a.slot,
        createdAt: new Date(a.created_at).toLocaleString(),
      }))
    );
  }, []);

  // Load once signed in, then follow the table live so the front desk sees a
  // booking land without refreshing.
  useEffect(() => {
    if (!session) {
      setAppointments([]);
      return;
    }
    refresh();
    const channel = supabase
      .channel("appointments-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        refresh
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session, refresh]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  }, []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  const cancel = useCallback(async (id) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    return { ok: !error };
  }, []);

  return { session, ready, appointments, loading, signIn, signOut, cancel };
}
