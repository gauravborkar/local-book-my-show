import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EVENT_CATEGORIES } from "@localbms/shared";
import { api, ApiError } from "@/lib/api";
import { formatCategory } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { Facility, ManagerEvent } from "@/types";

export function ManagerEvents() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "MUSIC",
    city: "",
  });

  const { data: events = [] } = useQuery({
    queryKey: ["manager-events"],
    queryFn: () => api<ManagerEvent[]>("/api/manager/events"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api<ManagerEvent>("/api/manager/events", {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manager-events"] });
      setShowForm(false);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-3xl font-bold">Events</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Create event"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <label className="block space-y-1.5">
            <span className="text-sm text-text-muted">Description</span>
            <textarea
              className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 min-h-[100px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-sm text-text-muted">Category</span>
              <select
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
            Create draft
          </Button>
        </Card>
      )}

      <div className="space-y-3">
        {events.map((event) => (
          <Card key={event.id} className="p-5 flex flex-wrap justify-between gap-4 items-center">
            <div>
              <h3 className="font-semibold">{event.title}</h3>
              <p className="text-sm text-text-muted">
                {formatCategory(event.category)} · {event.city} · {event._count.shows} shows
              </p>
              <span className="inline-block mt-2 text-xs font-semibold uppercase px-2 py-0.5 rounded bg-surface-muted">
                {event.status.replace("_", " ")}
              </span>
            </div>
            <Link to={`/manager/events/${event.id}`}>
              <Button variant="secondary" size="sm">
                Manage shows
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ManagerEventDetail() {
  const qc = useQueryClient();
  const { eventId = "" } = useParams<{ eventId: string }>();
  const [error, setError] = useState("");

  const { data: facilities = [] } = useQuery({
    queryKey: ["facilities"],
    queryFn: () => api<Facility[]>("/api/manager/facilities"),
  });

  const { data: shows = [], refetch } = useQuery({
    queryKey: ["shows", eventId],
    queryFn: () => api<ShowWithTickets[]>(`/api/manager/shows/${eventId}`),
  });

  const [showForm, setShowForm] = useState({
    facilityId: "",
    startsAt: "",
  });

  const [ticketForm, setTicketForm] = useState({
    showId: "",
    name: "General Admission",
    priceCents: "999",
    totalQty: "50",
  });
  const addShow = useMutation({
    mutationFn: () =>
      api("/api/manager/shows", {
        method: "POST",
        body: JSON.stringify({
          eventId,
          facilityId: showForm.facilityId,
          startsAt: new Date(showForm.startsAt).toISOString(),
        }),
      }),
    onSuccess: () => {
      refetch();
      setShowForm({ facilityId: "", startsAt: "" });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Failed"),
  });

  const addTicket = useMutation({
    mutationFn: () =>
      api("/api/manager/ticket-types", {
        method: "POST",
        body: JSON.stringify({
          showId: ticketForm.showId,
          name: ticketForm.name,
          priceCents: Math.round(parseFloat(ticketForm.priceCents) * 100),
          totalQty: parseInt(ticketForm.totalQty, 10),
        }),
      }),
    onSuccess: () => refetch(),
  });

  const submitReview = useMutation({
    mutationFn: () => api(`/api/manager/events/${eventId}/publish`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manager-events"] }),
  });

  const selectedFacility = facilities.find((f) => f.id === showForm.facilityId);
  const hasNonSeatShows = shows.some((s) => !s.hasSeatMap);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold">Manage shows & tickets</h1>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Add show</h2>
        <p className="text-sm text-text-muted">
          Choose a facility with a seat map — tickets and seats are created automatically for each
          show.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-sm text-text-muted">Facility</span>
            <select
              className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5"
              value={showForm.facilityId}
              onChange={(e) => setShowForm({ ...showForm, facilityId: e.target.value })}
            >
              <option value="">Select facility</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.city})
                  {f.hasSeatTemplate ? ` · ${f._count?.seatTemplates ?? 0} seats` : " · no seat map"}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Starts at"
            type="datetime-local"
            value={showForm.startsAt}
            onChange={(e) => setShowForm({ ...showForm, startsAt: e.target.value })}
          />
        </div>
        {selectedFacility && !selectedFacility.hasSeatTemplate && (
          <p className="text-sm text-amber-300">
            This facility has no seat map. Add ticket types manually below after creating the show.
          </p>
        )}
        <Button onClick={() => addShow.mutate()} loading={addShow.isPending}>
          Add show
        </Button>
      </Card>

      {shows.map((show) => (
        <Card key={show.id} className="p-6">
          <p className="font-medium">{show.facility.name}</p>
          <p className="text-sm text-text-muted">{new Date(show.startsAt).toLocaleString()}</p>
          {show.hasSeatMap && (
            <p className="mt-1 text-xs text-emerald-300">
              Seat map enabled ({show._count.seats} seats)
            </p>
          )}
          <ul className="mt-3 space-y-1 text-sm">
            {show.ticketTypes.map((tt) => (
              <li key={tt.id}>
                {tt.name}: ₹{(tt.priceCents / 100).toFixed(0)} · {tt.totalQty - tt.soldQty - tt.heldQty} available
              </li>
            ))}
          </ul>
        </Card>
      ))}

      {hasNonSeatShows && (
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Add ticket type (non-seated shows only)</h2>
        <label className="block space-y-1.5">
          <span className="text-sm text-text-muted">Show</span>
          <select
            className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5"
            value={ticketForm.showId}
            onChange={(e) => setTicketForm({ ...ticketForm, showId: e.target.value })}
          >
            <option value="">Select show</option>
            {shows
              .filter((s) => !s.hasSeatMap)
              .map((s) => (
              <option key={s.id} value={s.id}>
                {s.facility.name} — {new Date(s.startsAt).toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            label="Name"
            value={ticketForm.name}
            onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
          />
          <Input
            label="Price (₹)"
            value={ticketForm.priceCents}
            onChange={(e) => setTicketForm({ ...ticketForm, priceCents: e.target.value })}
          />
          <Input
            label="Quantity"
            value={ticketForm.totalQty}
            onChange={(e) => setTicketForm({ ...ticketForm, totalQty: e.target.value })}
          />
        </div>
        <Button onClick={() => addTicket.mutate()} loading={addTicket.isPending}>
          Add tickets
        </Button>
      </Card>
      )}

      {error && <p className="text-red-400">{error}</p>}

      <Button onClick={() => submitReview.mutate()} loading={submitReview.isPending}>
        Submit for admin review
      </Button>
    </div>
  );
}

interface ShowWithTickets {
  id: string;
  startsAt: string;
  hasSeatMap: boolean;
  facility: { name: string };
  _count: { seats: number };
  ticketTypes: {
    id: string;
    name: string;
    priceCents: number;
    totalQty: number;
    soldQty: number;
    heldQty: number;
  }[];
}
