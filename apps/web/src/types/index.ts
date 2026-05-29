import type { BookingStatus, EventCategory, EventStatus } from "@localbms/shared";

export interface EventListItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: EventCategory;
  city: string;
  posterUrl: string | null;
  durationMin: number | null;
  ageLimit: string | null;
  tags: string[];
  shows: { id: string; startsAt: string }[];
}

export interface TicketTypePublic {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  totalQty: number;
  soldQty: number;
  heldQty: number;
  maxPerOrder: number;
  availableQty: number;
}

export interface ShowPublic {
  id: string;
  startsAt: string;
  endsAt: string | null;
  doorsOpenAt: string | null;
  hasSeatMap?: boolean;
  facility: {
    id: string;
    name: string;
    slug: string;
    address: string;
    city: string;
  };
  ticketTypes: TicketTypePublic[];
  seats?: {
    id: string;
    ticketTypeId: string;
    rowLabel: string;
    seatNumber: string;
    seatCode: string;
    status: "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED";
    x: number | null;
    y: number | null;
  }[];
}

export interface EventDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: EventCategory;
  city: string;
  posterUrl: string | null;
  durationMin: number | null;
  ageLimit: string | null;
  tags: string[];
  manager: { name: string };
  shows: ShowPublic[];
}

export interface Booking {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  totalCents: number;
  holdExpiresAt: string | null;
  confirmedAt: string | null;
  checkedInAt: string | null;
  items: {
    id: string;
    quantity: number;
    unitPriceCents: number;
    ticketType: { name: string };
  }[];
  seats?: {
    id: string;
    seatCode: string;
    rowLabel: string;
    seatNumber: string;
  }[];
  show: {
    startsAt: string;
    event: { title: string; slug: string; posterUrl: string | null };
    facility: { name: string; address: string; city: string };
  };
}

export interface ManagerEvent {
  id: string;
  title: string;
  slug: string;
  status: EventStatus;
  category: EventCategory;
  city: string;
  _count: { shows: number };
}

export interface Facility {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  description?: string | null;
  capacity: number;
  hasSeatTemplate?: boolean;
  _count?: { shows: number; seatTemplates?: number };
}

export interface FacilitySeatTemplate {
  id: string;
  facilityId: string;
  ticketTypeKey: string;
  rowLabel: string;
  seatNumber: string;
  seatCode: string;
  x: number | null;
  y: number | null;
  priceCents: number | null;
  maxPerOrder: number | null;
}

export interface FacilityDetail extends Facility {
  seatLayoutConfig?: unknown;
  seatTemplates: FacilitySeatTemplate[];
}
