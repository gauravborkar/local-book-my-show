import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { QrCode, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime, formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Booking } from "@/types";

export function BookingPage() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const isMockPay = window.location.pathname.includes("mock-pay");
  const bookingId = searchParams.get("bookingId");

  const { data: booking, refetch, isLoading } = useQuery({
    queryKey: ["booking", code],
    queryFn: () => api<Booking>(`/api/bookings/code/${code}`),
    enabled: !!code && !isMockPay,
  });

  const mockPayMutation = useMutation({
    mutationFn: () =>
      api<Booking>(`/api/bookings/${bookingId}/mock-pay`, { method: "POST" }),
    onSuccess: () => {
      window.location.href = `/bookings/${code}/success`;
    },
  });

  if (isMockPay && bookingId) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Card className="p-8 space-y-6">
          <h1 className="font-display text-2xl font-bold">Demo payment</h1>
          <p className="text-text-muted">
            Stripe is not configured. Complete your booking with mock payment.
          </p>
          <Button
            className="w-full"
            size="lg"
            loading={mockPayMutation.isPending}
            onClick={() => mockPayMutation.mutate()}
          >
            Pay now (demo)
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) return <p className="py-20 text-center text-text-muted">Loading…</p>;
  if (!booking) return <p className="py-20 text-center">Booking not found</p>;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <BookingDetails booking={booking} onRefresh={() => refetch()} />
    </div>
  );
}

export function BookingSuccessPage() {
  const { code } = useParams<{ code: string }>();
  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", code],
    queryFn: () => api<Booking>(`/api/bookings/code/${code}`),
    enabled: !!code,
    refetchInterval: (q) => (q.state.data?.status === "PENDING_PAYMENT" ? 2000 : false),
  });

  if (isLoading) return <p className="py-20 text-center text-text-muted">Confirming…</p>;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="text-center mb-8">
        <CheckCircle className="mx-auto h-16 w-16 text-green-400" />
        <h1 className="mt-4 font-display text-3xl font-bold">Booking confirmed!</h1>
      </div>
      {booking && <BookingDetails booking={booking} />}
      <Link to="/" className="mt-8 block text-center text-brand-400 hover:underline">
        Browse more events
      </Link>
    </div>
  );
}

function BookingDetails({
  booking,
  onRefresh,
}: {
  booking: Booking;
  onRefresh?: () => void;
}) {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted">Booking code</p>
          <p className="font-mono text-xl font-bold text-brand-400">{booking.bookingCode}</p>
        </div>
        {booking.status === "CONFIRMED" && (
          <QrCode className="h-12 w-12 text-text-muted" />
        )}
      </div>
      <hr className="border-border" />
      <p className="font-semibold text-lg">{booking.show.event.title}</p>
      <p className="text-sm text-text-muted">
        {booking.show.facility.name}, {booking.show.facility.city}
      </p>
      <p className="text-sm">{formatDateTime(booking.show.startsAt)}</p>
      <ul className="space-y-1 text-sm">
        {booking.items.map((item) => (
          <li key={item.id}>
            {item.quantity}× {item.ticketType.name} — {formatPrice(item.unitPriceCents * item.quantity)}
          </li>
        ))}
      </ul>
      {booking.seats && booking.seats.length > 0 && (
        <p className="text-sm text-text-muted">
          Seats: {booking.seats.map((seat) => seat.seatCode).join(", ")}
        </p>
      )}
      <p className="font-semibold">Total: {formatPrice(booking.totalCents)}</p>
      <p className="text-xs text-text-muted">
        Status: {booking.status.replace("_", " ")}
        {booking.checkedInAt && " · Checked in"}
      </p>
      {booking.status === "PENDING_PAYMENT" && onRefresh && (
        <Button variant="secondary" onClick={onRefresh}>
          Refresh status
        </Button>
      )}
    </Card>
  );
}
