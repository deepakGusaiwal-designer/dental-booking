import { useEffect, useMemo, useState } from "react";
import { format, parseISO, startOfToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIME_SLOTS, isIndianMobile, normalizePhone, slotLabel } from "@/lib/booking";
import ToothArt from "@/components/ToothArt";

export default function BookingForm({ takenSlots, onBook, onLookupPhone }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(undefined);
  const [time, setTime] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [booked, setBooked] = useState(false);
  const [replaced, setReplaced] = useState(false);
  const [existingBooking, setExistingBooking] = useState(null);
  const [lastSubmitAt, setLastSubmitAt] = useState(0);

  // Live hint: this number already has a booking that we're about to replace.
  // Only the server can answer that, so wait for the number to look complete
  // and let typing settle before asking.
  useEffect(() => {
    if (!isIndianMobile(phone)) {
      setExistingBooking(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const found = await onLookupPhone(phone);
      if (!cancelled) setExistingBooking(found);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phone, onLookupPhone]);

  // Slots already gone on the chosen date. The caller's own booking doesn't
  // count — re-booking replaces it, so their current slot stays pickable.
  const takenTimes = useMemo(() => {
    if (!date) return new Set();
    const dateKey = format(date, "yyyy-MM-dd");
    const taken = new Set(
      takenSlots.filter((s) => s.date === dateKey).map((s) => s.slot)
    );
    if (existingBooking?.date === dateKey) taken.delete(existingBooking.time);
    return taken;
  }, [date, takenSlots, existingBooking]);

  // Dates with nothing left to offer, so the calendar can grey them out.
  const fullDates = useMemo(() => {
    const byDate = {};
    for (const s of takenSlots) {
      byDate[s.date] = (byDate[s.date] || new Set()).add(s.slot);
    }
    return new Set(
      Object.keys(byDate).filter((d) => byDate[d].size >= TIME_SLOTS.length)
    );
  }, [takenSlots]);

  // A slot picked before can become unavailable once the date changes.
  useEffect(() => {
    if (time && takenTimes.has(time)) setTime("");
  }, [takenTimes, time]);

  const allSlotsTaken = date && takenTimes.size >= TIME_SLOTS.length;

  const handleBook = async () => {
    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!normalizePhone(phone)) {
      setError("Phone number is required to book.");
      return;
    }
    if (!isIndianMobile(phone)) {
      setError(
        "Enter a valid Indian mobile number — 10 digits starting with 6, 7, 8 or 9."
      );
      return;
    }
    if (!date) {
      setError("Please pick a date for your appointment.");
      return;
    }
    if (!time) {
      setError("Please pick a time slot.");
      return;
    }

    if (website.trim()) {
      setError("Spam detected. Please refresh the page and try again.");
      return;
    }

    const now = Date.now();
    if (now - lastSubmitAt < 2000) {
      setError("Please wait a few seconds before trying again.");
      return;
    }
    setLastSubmitAt(now);

    setBusy(true);
    const result = await onBook({ name, phone, date, time, honeypot: website });
    setBusy(false);

    if (!result.ok) {
      if (result.reason === "network") {
        setError("Couldn't reach the clinic's booking system. Please try again.");
        return;
      }
      if (result.reason === "spam") {
        setError("Detected spam behavior. Please refresh the page and try again.");
        return;
      }
      setTime("");
      setError(
        `${slotLabel(time)} on ${format(date, "d MMM yyyy")} has just been taken. Please pick another slot.`
      );
      return;
    }

    setReplaced(result.replaced);
    setBooked(true);
    setName("");
    setPhone("");
    setDate(undefined);
    setTime("");
    setWebsite("");
    setExistingBooking(null);
  };

  return (
    <Card className="overflow-hidden">
      <div className="grid md:grid-cols-2">
        {/* Left: dental image */}
        <div className="bg-teal-100/50 flex flex-col items-center justify-center p-8 gap-4">
          {/* <ToothArt /> */}
          <p className="text-center text-sm text-teal-800 max-w-[240px]">
            Gentle, on-time dental checkups. Pick a slot that works for you.
          </p>
        </div>

        {/* Right: form */}
        <div className="p-6 sm:p-8">
          {booked ? (
            <div className="flex flex-col items-center text-center gap-3 py-8">
              <CheckCircle2 className="h-12 w-12 text-teal-600" />
              <h2 className="text-xl font-semibold">You're booked!</h2>
              <p className="text-sm text-slate-500">
                {replaced
                  ? "Your earlier booking on this number was cancelled and replaced with this one."
                  : "We'll call you on the number you provided to confirm."}
              </p>
              <Button variant="outline" onClick={() => setBooked(false)}>
                Book another
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Appointment details</h2>
                <p className="text-sm text-slate-500">
                  No account needed. All fields are required.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-teal-600">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError("");
                  }}
                  aria-invalid={!!error}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Mobile number <span className="text-teal-600">*</span>
                </Label>
                <div className="flex">
                  <span className="inline-flex h-12 items-center rounded-l-md border border-r-0 border-input bg-slate-50 px-3 text-sm text-slate-500">
                    +91
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    className="rounded-l-none"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => {
                      // digits only, capped at the 10 an Indian mobile has
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                      if (error) setError("");
                    }}
                    aria-invalid={!!error}
                  />
                </div>
                {existingBooking && (
                  <p className="text-xs text-amber-700">
                    This number already has a booking on{" "}
                    {format(parseISO(existingBooking.date), "d MMM yyyy")} at{" "}
                    {slotLabel(existingBooking.time)}. Booking again will replace
                    it.
                  </p>
                )}
              </div>

              <div className="sr-only">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  type="text"
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="Leave this field blank"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="date">
                    Date <span className="text-teal-600">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        size="lg"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "d MMM yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => {
                          setDate(d);
                          if (error) setError("");
                        }}
                        disabled={[
                          { before: startOfToday() },
                          (d) => fullDates.has(format(d, "yyyy-MM-dd")),
                        ]}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">
                    Time <span className="text-teal-600">*</span>
                  </Label>
                  <Select
                    value={time}
                    disabled={!date}
                    onValueChange={(v) => {
                      setTime(v);
                      if (error) setError("");
                    }}
                  >
                    <SelectTrigger id="time">
                      <SelectValue
                        placeholder={date ? "Pick a slot" : "Pick a date first"}
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {TIME_SLOTS.map((s) => (
                        <SelectItem
                          key={s.value}
                          value={s.value}
                          disabled={takenTimes.has(s.value)}
                        >
                          {s.label}
                          {takenTimes.has(s.value) && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              booked
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {allSlotsTaken && (
                <p className="text-sm text-amber-700">
                  Every slot on {format(date, "d MMM yyyy")} is booked. Please
                  choose another date.
                </p>
              )}

              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <Button
                size="lg"
                disabled={busy}
                className="w-full bg-teal-600 hover:bg-teal-700"
                onClick={handleBook}
              >
                {busy ? "Booking…" : "Book appointment"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
