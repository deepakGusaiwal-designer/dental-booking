import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LogOut } from "lucide-react";
import AdminLogin from "@/components/AdminLogin";
import AppointmentsTable from "@/components/AppointmentsTable";
import { useAdmin } from "@/hooks/use-admin";

export default function AdminPanel() {
  const { session, ready, appointments, loading, signIn, signOut, cancel } =
    useAdmin();

  if (!ready) {
    return <p className="text-center py-10 text-slate-500">Loading…</p>;
  }

  if (!session) return <AdminLogin onSignIn={signIn} />;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Appointments</CardTitle>
          <CardDescription>
            {loading
              ? "Loading…"
              : `${appointments.length} upcoming booking${appointments.length === 1 ? "" : "s"}`}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </CardHeader>
      <CardContent>
        <AppointmentsTable appointments={appointments} onCancel={cancel} />
      </CardContent>
    </Card>
  );
}
