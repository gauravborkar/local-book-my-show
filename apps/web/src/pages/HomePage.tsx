import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { EVENT_CATEGORIES } from "@localbms/shared";
import { api } from "@/lib/api";
import { EventCard } from "@/components/events/EventCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { EventListItem } from "@/types";

export function HomePage() {
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState({ city: "", category: "", q: "" });

  const { data: cities = [] } = useQuery({
    queryKey: ["cities"],
    queryFn: () => api<string[]>("/api/events/cities"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["events", search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.city) params.set("city", search.city);
      if (search.category) params.set("category", search.category);
      if (search.q) params.set("q", search.q);
      return api<{
        items: EventListItem[];
        total: number;
      }>(`/api/events?${params}`);
    },
  });

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/40 via-surface to-surface" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl max-w-2xl">
            Discover & book{" "}
            <span className="text-brand-400">local events</span> near you
          </h1>
          <p className="mt-4 max-w-xl text-lg text-text-muted">
            Concerts, comedy, theatre, workshops — find what&apos;s happening in your city and
            secure your tickets in minutes.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <form
          className="grid gap-4 rounded-2xl border border-border bg-surface-elevated p-4 sm:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch({ city, category, q });
          }}
        >
          <Input
            label="Search"
            placeholder="Event name, artist…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text-muted">City</span>
            <select
              className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-text focus:border-brand-500 focus:outline-none"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text-muted">Category</span>
            <select
              className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-text focus:border-brand-500 focus:outline-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button type="submit" className="w-full" size="lg">
              <Search className="h-4 w-4" />
              Search events
            </Button>
          </div>
        </form>

        {isLoading ? (
          <p className="py-16 text-center text-text-muted">Loading events…</p>
        ) : data?.items.length === 0 ? (
          <p className="py-16 text-center text-text-muted">No events found. Try different filters.</p>
        ) : (
          <>
            <p className="mt-8 mb-4 text-sm text-text-muted">{data?.total ?? 0} events</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data?.items.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
