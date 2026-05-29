export type UserRole = "ATTENDEE" | "EVENT_MANAGER" | "ADMIN";

export type EventCategory =
  | "MUSIC"
  | "COMEDY"
  | "THEATRE"
  | "SPORTS"
  | "WORKSHOP"
  | "FESTIVAL"
  | "OTHER";

export type EventStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "CANCELLED";

export type BookingStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED";

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const EVENT_CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: "MUSIC", label: "Music" },
  { value: "COMEDY", label: "Comedy" },
  { value: "THEATRE", label: "Theatre" },
  { value: "SPORTS", label: "Sports" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "FESTIVAL", label: "Festival" },
  { value: "OTHER", label: "Other" },
];

export const HOLD_DURATION_MINUTES = 10;
