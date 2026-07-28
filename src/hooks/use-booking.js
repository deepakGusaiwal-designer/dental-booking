import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { normalizePhone } from "@/lib/booking";

/**
 * Public side of the booking flow.
 *
 * The anon key can't read the appointments table, so availability comes from
 * `taken_slots()`, which returns dates and slots but no patient data. Writes go
 * through `book_appointment()`, which re-checks everything server-side.
 */
export function useBooking() {
  const [takenSlots, setTakenSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("taken_slots");
    if (!error) setTakenSlots(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    // Availability goes stale while the tab sits in the background.
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  /**
   * @returns {Promise<{ok: true, replaced: boolean} | {ok: false, reason: string}>}
   */
  const book = useCallback(
    async ({ name, phone, date, time, honeypot = "" }) => {
      const { data, error } = await supabase.rpc("book_appointment", {
        p_name: name.trim(),
        p_phone: normalizePhone(phone),
        p_date: format(date, "yyyy-MM-dd"),
        p_slot: time,
        p_honeypot: honeypot,
      });

      if (error) {
        await refresh();
        return { ok: false, reason: "network" };
      }

      await refresh();
      return data;
    },
    [refresh]
  );

  /** Existing booking on this number, or null. @returns {Promise<{date, time}|null>} */
  const lookupByPhone = useCallback(async (phone) => {
    const { data, error } = await supabase.rpc("booking_for_phone", {
      p_phone: normalizePhone(phone),
    });
    if (error || !data?.length) return null;
    return { date: data[0].date, time: data[0].slot };
  }, []);

  return { takenSlots, loading, book, lookupByPhone, refresh };
}
