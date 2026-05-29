import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Building2, Calendar, IndianRupee, Ticket } from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Booking } from "@/types";

interface DashboardData {
  stats: {
    events: number;
    facilities: number;
    confirmedBookings: number;
    revenueCents: number;
  };
  recentBookings: Booking[];
}

export function ManagerDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["manager-dashboard"],
    queryFn: () => api<DashboardData>("/api/manager/dashboard"),
  });

  if (isLoading) return <p className="p-8 text-text-muted">Loading dashboard…</p>;

  const stats = [
    { label: "Events", value: data?.stats.events ?? 0, icon: Calendar },
    { label: "Facilities", value: data?.stats.facilities ?? 0, icon: Building2 },
    { label: "Bookings", value: data?.stats.confirmedBookings ?? 0, icon: Ticket },
    {
      label: "Revenue",
      value: formatPrice(data?.stats.revenueCents ?? 0),
      icon: IndianRupee,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold">Manager dashboard</h1>
        <div className="flex gap-2">
          <Link to="/manager/facilities">
            <Button variant="secondary">Facilities</Button>
          </Link>
          <Link to="/manager/events">
            <Button>Manage events</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-5">
            <Icon className="h-5 w-5 text-brand-400 mb-2" />
            <p className="text-sm text-text-muted">{label}</p>
            <p className="text-2xl font-bold font-display">{value}</p>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="font-display text-xl font-semibold mb-4">Recent bookings</h2>
        {data?.recentBookings.length === 0 ? (
          <p className="text-text-muted">No confirmed bookings yet.</p>
        ) : (
          <div className="space-y-3">
            {data?.recentBookings.map((b) => (
              <Card key={b.id} className="p-4 flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium">{b.show.event.title}</p>
                  <p className="text-sm text-text-muted">{b.guestName} · {b.bookingCode}</p>
                </div>
                <p className="font-semibold">{formatPrice(b.totalCents)}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Link to="/manager/check-in">
        <Button variant="secondary">Open check-in</Button>
      </Link>
    </div>
  );
}
