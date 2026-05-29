import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAuthStore, type User } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "ATTENDEE" as "ATTENDEE" | "EVENT_MANAGER",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api<{ user: User; token: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setAuth(data.user, data.token);
      navigate(form.role === "EVENT_MANAGER" ? "/manager" : "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-8">
        <h1 className="font-display text-2xl font-bold">Create account</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="Password (min 8 characters)"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={8}
            required
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text-muted">I am a</span>
            <select
              className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5"
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as "ATTENDEE" | "EVENT_MANAGER" })
              }
            >
              <option value="ATTENDEE">Event goer</option>
              <option value="EVENT_MANAGER">Event manager / organizer</option>
            </select>
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Sign up
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-400 hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
