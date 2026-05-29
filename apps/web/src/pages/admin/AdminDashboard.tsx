import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface AdminStats {
  users: number;
  publishedEvents: number;
  confirmedBookings: number;
  pendingEvents: number;
}

interface PendingEvent {
  id: string;
  title: string;
  city: string;
  category: string;
  manager: { name: string; email: string };
  shows: { facility: { name: string }; ticketTypes: { name: string; priceCents: number }[] }[];
}

export function AdminDashboard() {
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api<AdminStats>("/api/admin/stats"),
  });

  const { data: pending = [] } = useQuery({
    queryKey: ["admin-pending"],
    queryFn: () => api<PendingEvent[]>("/api/admin/events/pending"),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api(`/api/admin/events/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pending"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const reject = useMutation({
    mutationFn: (id: string) => api(`/api/admin/events/${id}/reject`, { method: "POST", body: "{}" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pending"] }),
  });

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold">Admin</h1>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Users", stats?.users],
          ["Published events", stats?.publishedEvents],
          ["Bookings", stats?.confirmedBookings],
          ["Pending review", stats?.pendingEvents],
        ].map(([label, value]) => (
          <Card key={label as string} className="p-5">
            <p className="text-sm text-text-muted">{label}</p>
            <p className="text-2xl font-bold">{value ?? "—"}</p>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="font-display text-xl font-semibold mb-4">Pending event approvals</h2>
        {pending.length === 0 ? (
          <p className="text-text-muted">No events awaiting review.</p>
        ) : (
          <div className="space-y-4">
            {pending.map((event) => (
              <Card key={event.id} className="p-5">
                <h3 className="font-semibold">{event.title}</h3>
                <p className="text-sm text-text-muted">
                  {event.city} · by {event.manager.name} ({event.manager.email})
                </p>
                <p className="text-xs text-text-muted mt-2">
                  {event.shows.length} show(s)
                </p>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" loading={approve.isPending} onClick={() => approve.mutate(event.id)}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={reject.isPending}
                    onClick={() => reject.mutate(event.id)}
                  >
                    Reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
