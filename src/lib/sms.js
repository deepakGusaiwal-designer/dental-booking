import { format } from "date-fns";
import { supabase } from "@/lib/supabase";

export async function sendBookingConfirmation({ name, phone, date, time }) {
  const normalizedPhone = String(phone || "").replace(/\D/g, "");

  if (!normalizedPhone) {
    return { ok: false, reason: "missing-phone" };
  }

  try {
    const payload = {
      name: String(name || "").trim(),
      phone: normalizedPhone,
      date: date instanceof Date ? format(date, "yyyy-MM-dd") : date,
      time,
    };

    const { data, error } = await supabase.functions.invoke(
      "send-booking-confirmation",
      { body: payload }
    );

    if (error) throw error;
    return { ok: data?.ok === true };
  } catch (error) {
    console.error("SMS confirmation failed", error);
    return { ok: false, reason: "sms-error" };
  }
}
