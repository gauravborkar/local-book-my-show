import { randomBytes } from "node:crypto";

export function generateBookingCode(): string {
  const part = randomBytes(4).toString("hex").toUpperCase();
  return `BMS-${part}`;
}
