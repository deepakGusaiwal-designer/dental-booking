import { CalendarClock } from "lucide-react";

export default function SiteHeader() {
  return (
    <header className="flex items-center gap-2 mb-6">
      <div className="h-9 w-9 rounded-lg bg-teal-600 flex items-center justify-center text-white">
        <CalendarClock className="h-5 w-5" />
      </div>
      <div>
        <h1 className="text-lg font-semibold leading-none">
          Test
          {/* BrightSmile Dental */}
        </h1>
        <p className="text-xs text-slate-500">Book your checkup in seconds</p>
      </div>
    </header>
  );
}
