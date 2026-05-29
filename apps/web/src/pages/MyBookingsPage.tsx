import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { formatDateTime, formatPrice } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import type { Booking } from "@/types";

export function MyBookingsPage() {
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => api<Booking[]>("/api/bookings/my"),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">My bookings</h1>
      {isLoading ? (
        <p className="mt-8 text-text-muted">Loading…</p>
      ) : bookings.length === 0 ? (
        <p className="mt-8 text-text-muted">
          No bookings yet.{" "}
          <Link to="/" className="text-brand-400 hover:underline">
            Discover events
          </Link>
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {bookings.map((b) => (
            <Link key={b.id} to={`/bookings/${b.bookingCode}`}>
              <Card className="p-5 hover:border-brand-500/50 transition">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold">{b.show.event.title}</p>
                    <p className="text-sm text-text-muted">
                      {b.show.facility.name} · {formatDateTime(b.show.startsAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-semibold uppercase ${
                        b.status === "CONFIRMED" ? "text-green-400" : "text-amber-400"
                      }`}
                    >
                      {b.status.replace("_", " ")}
                    </span>
                    <p className="font-medium">{formatPrice(b.totalCents)}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-text-muted">Code: {b.bookingCode}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
