import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Phone, Trash2 } from "lucide-react";
import { formatPhone, slotLabel } from "@/lib/booking";

export default function AppointmentsTable({ appointments, onCancel }) {
  const [pending, setPending] = useState(null);

  const handleCancel = async (a) => {
    if (!window.confirm(`Cancel ${a.name}'s appointment?`)) return;
    setPending(a.id);
    await onCancel(a.id);
    setPending(null);
  };

  if (appointments.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        <Phone className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">
          No appointments yet. New bookings will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Booked on</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell>
                <a href={`tel:+91${a.phone}`} className="hover:underline">
                  {formatPhone(a.phone)}
                </a>
              </TableCell>
              <TableCell>{format(parseISO(a.date), "d MMM yyyy")}</TableCell>
              <TableCell>{slotLabel(a.time)}</TableCell>
              <TableCell className="text-slate-500 text-xs">
                {a.createdAt}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending === a.id}
                  onClick={() => handleCancel(a)}
                  aria-label={`Cancel ${a.name}'s appointment`}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
