import { Link } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCategory, formatDateTime } from "@/lib/format";
import type { EventListItem } from "@/types";

export function EventCard({ event }: { event: EventListItem }) {
  const nextShow = event.shows[0];

  return (
    <Link to={`/events/${event.slug}`}>
      <Card className="group h-full hover:border-brand-500/50 transition">
        <div className="aspect-[16/10] overflow-hidden bg-surface-muted">
          {event.posterUrl ? (
            <img
              src={event.posterUrl}
              alt={event.title}
              className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-text-muted">
              No image
            </div>
          )}
        </div>
        <div className="p-4 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-400">
            {formatCategory(event.category)}
          </span>
          <h3 className="font-display text-lg font-semibold line-clamp-2 group-hover:text-brand-400 transition">
            {event.title}
          </h3>
          <p className="text-sm text-text-muted line-clamp-2">{event.description}</p>
          <div className="flex flex-wrap gap-3 pt-2 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.city}
            </span>
            {nextShow && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateTime(nextShow.startsAt)}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
