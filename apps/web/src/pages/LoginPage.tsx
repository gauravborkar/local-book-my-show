import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAuthStore, type User } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api<{ user: User; token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAuth(data.user, data.token);
      if (data.user.role === "EVENT_MANAGER") navigate("/manager");
      else if (data.user.role === "ADMIN") navigate("/admin");
      else navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-8">
        <h1 className="font-display text-2xl font-bold">Welcome back</h1>
        <p className="mt-2 text-sm text-text-muted">Log in to book events and manage tickets</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Log in
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-text-muted">
          No account?{" "}
          <Link to="/register" className="text-brand-400 hover:underline">
            Sign up
          </Link>
        </p>
        <p className="mt-4 rounded-lg bg-surface-muted p-3 text-xs text-text-muted">
          Demo: user@localbms.com / manager@localbms.com / admin@localbms.com — password: password123
        </p>
      </Card>
    </div>
  );
}
