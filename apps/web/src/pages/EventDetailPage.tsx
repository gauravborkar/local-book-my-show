import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Clock, Minus, Plus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatCategory, formatDateTime, formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useAuthStore } from "@/store/auth";
import { SeatMapView } from "@/components/seats/SeatMapView";
import type { EventDetail, ShowPublic } from "@/types";

export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const user = useAuthStore((s) => s.user);
  const [selectedShow, setSelectedShow] = useState<ShowPublic | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [guestName, setGuestName] = useState(user?.name ?? "");
  const [guestEmail, setGuestEmail] = useState(user?.email ?? "");
  const [guestPhone, setGuestPhone] = useState("");
  const [error, setError] = useState("");

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: () => api<EventDetail>(`/api/events/${slug}`),
    enabled: !!slug,
  });

  const bookMutation = useMutation({
    mutationFn: () => {
      if (!selectedShow) throw new Error("Select a show");
      const items = Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));
      if (!selectedShow.hasSeatMap && items.length === 0) {
        throw new Error("Select at least one ticket");
      }
      if (selectedShow.hasSeatMap && selectedSeatIds.length === 0) {
        throw new Error("Select at least one seat");
      }
      return api<{ booking: { id: string }; checkoutUrl: string }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          showId: selectedShow.id,
          guestName,
          guestEmail,
          guestPhone: guestPhone || undefined,
          items,
          seatIds: selectedSeatIds,
        }),
      });
    },
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl;
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Booking failed");
    },
  });

  if (isLoading) return <p className="py-20 text-center text-text-muted">Loading…</p>;
  if (!event) return <p className="py-20 text-center">Event not found</p>;

  const upcomingShows = event.shows.filter((s) => new Date(s.startsAt) > new Date());
  const activeShow = selectedShow ?? upcomingShows[0] ?? null;

  const selectedSeats = activeShow?.seats?.filter((seat) => selectedSeatIds.includes(seat.id)) ?? [];

  const totalCents = activeShow?.hasSeatMap
    ? selectedSeats.reduce((sum, seat) => {
        const tt = activeShow.ticketTypes.find((t) => t.id === seat.ticketTypeId);
        return sum + (tt?.priceCents ?? 0);
      }, 0)
    : activeShow?.ticketTypes.reduce((sum, tt) => {
        const qty = quantities[tt.id] ?? 0;
        return sum + qty * tt.priceCents;
      }, 0) ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="aspect-video overflow-hidden rounded-2xl bg-surface-muted">
            {event.posterUrl && (
              <img src={event.posterUrl} alt={event.title} className="h-full w-full object-cover" />
            )}
          </div>
        </div>
        <div className="space-y-4">
          <span className="text-sm font-semibold uppercase text-brand-400">
            {formatCategory(event.category)}
          </span>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{event.title}</h1>
          <p className="text-text-muted leading-relaxed">{event.description}</p>
          <div className="flex flex-wrap gap-4 text-sm text-text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {event.city}
            </span>
            {event.durationMin && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {event.durationMin} min
              </span>
            )}
            {event.ageLimit && <span>{event.ageLimit}</span>}
          </div>
        </div>
      </div>

      <section className="mt-12 space-y-6">
        <h2 className="font-display text-2xl font-semibold">Select show & tickets</h2>

        <div className="flex flex-wrap gap-2">
          {upcomingShows.map((show) => (
            <button
              key={show.id}
              type="button"
              onClick={() => {
                setSelectedShow(show);
                setQuantities({});
                setSelectedSeatIds([]);
              }}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                activeShow?.id === show.id
                  ? "border-brand-500 bg-brand-600/20 text-brand-300"
                  : "border-border hover:border-brand-500/50"
              }`}
            >
              {formatDateTime(show.startsAt)}
              <span className="block text-xs text-text-muted">{show.facility.name}</span>
            </button>
          ))}
        </div>

        {activeShow && (
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold">{activeShow.facility.name}</h3>
              <p className="text-sm text-text-muted">{activeShow.facility.address}</p>
            </div>

            {activeShow.hasSeatMap ? (
              <div className="space-y-4">
                <SeatMapView
                  seats={activeShow.seats}
                  selectedSeatIds={selectedSeatIds}
                  onToggleSeat={(id) =>
                    setSelectedSeatIds((prev) =>
                      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                    )
                  }
                />
                <div className="space-y-1 text-sm text-text-muted">
                  <p>
                    Selected seats:{" "}
                    {selectedSeats.length > 0
                      ? selectedSeats.map((seat) => seat.seatCode).join(", ")
                      : "None"}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <span>Green: Available</span>
                    <span>Pink: Selected</span>
                    <span>Grey: Booked/Held</span>
                  </div>
                </div>
              </div>
            ) : (
              activeShow.ticketTypes.map((tt) => (
                <div
                  key={tt.id}
                  className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium">{tt.name}</p>
                    <p className="text-sm text-text-muted">
                      {formatPrice(tt.priceCents)} · {tt.availableQty} left
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-border p-2 hover:bg-surface-muted"
                      onClick={() =>
                        setQuantities((q) => ({
                          ...q,
                          [tt.id]: Math.max(0, (q[tt.id] ?? 0) - 1),
                        }))
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center">{quantities[tt.id] ?? 0}</span>
                    <button
                      type="button"
                      className="rounded-lg border border-border p-2 hover:bg-surface-muted disabled:opacity-40"
                      disabled={(quantities[tt.id] ?? 0) >= Math.min(tt.maxPerOrder, tt.availableQty)}
                      onClick={() =>
                        setQuantities((q) => ({
                          ...q,
                          [tt.id]: (q[tt.id] ?? 0) + 1,
                        }))
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
              <Input
                label="Email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
              />
              <Input
                label="Phone (optional)"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <p className="text-lg font-semibold">Total: {formatPrice(totalCents)}</p>
              <Button
                size="lg"
                loading={bookMutation.isPending}
                disabled={totalCents === 0}
                onClick={() => bookMutation.mutate()}
              >
                Proceed to pay
              </Button>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
