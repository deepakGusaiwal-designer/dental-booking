import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Lock } from "lucide-react";

export default function AdminLogin({ onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const result = await onSignIn(email, password);
    setBusy(false);

    if (result.ok) {
      setPassword("");
      setError("");
    } else {
      // Supabase says "Invalid login credentials" for both a wrong password and
      // an unknown address, which is what we want to show either way.
      setError(result.message || "Sign in failed. Please try again.");
    }
  };

  return (
    <Card className="max-w-sm mx-auto">
      <CardHeader className="items-center text-center">
        <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 mb-1">
          <Lock className="h-5 w-5" />
        </div>
        <CardTitle>Staff access only</CardTitle>
        <CardDescription>Sign in to view and manage bookings.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="username"
              placeholder="staff@clinic.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              aria-invalid={!!error}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              aria-invalid={!!error}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
