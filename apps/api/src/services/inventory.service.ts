import { HOLD_DURATION_MINUTES } from "@localbms/shared";
import type { Prisma } from "@prisma/client";
import { AppError } from "../middleware/error-handler.js";
import { prisma } from "../lib/prisma.js";

type Tx = Prisma.TransactionClient;

export async function getAvailableQty(
  ticketTypeId: string,
  tx: Tx = prisma
): Promise<number> {
  const tt = await tx.ticketType.findUniqueOrThrow({
    where: { id: ticketTypeId },
  });
  return Math.max(0, tt.totalQty - tt.soldQty - tt.heldQty);
}

export async function reserveInventory(
  items: { ticketTypeId: string; quantity: number }[],
  tx: Tx = prisma
): Promise<void> {
  for (const item of items) {
    const tt = await tx.ticketType.findUnique({
      where: { id: item.ticketTypeId },
    });
    if (!tt?.isActive) {
      throw new AppError(400, "Ticket type unavailable");
    }
    const available = tt.totalQty - tt.soldQty - tt.heldQty;
    if (available < item.quantity) {
      throw new AppError(409, "Not enough tickets available");
    }
    await tx.ticketType.update({
      where: { id: item.ticketTypeId },
      data: { heldQty: { increment: item.quantity } },
    });
  }
}

export async function releaseHold(
  bookingId: string,
  tx: Tx = prisma
): Promise<void> {
  const items = await tx.bookingItem.findMany({
    where: { bookingId },
    include: { ticketType: true },
  });
  for (const item of items) {
    await tx.ticketType.update({
      where: { id: item.ticketTypeId },
      data: { heldQty: { decrement: item.quantity } },
    });
  }

  await tx.seat.updateMany({
    where: {
      bookingId,
      status: "HELD",
    },
    data: {
      status: "AVAILABLE",
      bookingId: null,
      heldUntil: null,
    },
  });
}

export async function confirmInventory(
  bookingId: string,
  tx: Tx = prisma
): Promise<void> {
  const items = await tx.bookingItem.findMany({ where: { bookingId } });
  for (const item of items) {
    await tx.ticketType.update({
      where: { id: item.ticketTypeId },
      data: {
        heldQty: { decrement: item.quantity },
        soldQty: { increment: item.quantity },
      },
    });
  }

  await tx.seat.updateMany({
    where: {
      bookingId,
      status: "HELD",
    },
    data: {
      status: "BOOKED",
      heldUntil: null,
    },
  });
}

export function holdExpiresAt(): Date {
  return new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000);
}

export async function expireStaleHolds(): Promise<number> {
  const stale = await prisma.booking.findMany({
    where: {
      status: "PENDING_PAYMENT",
      holdExpiresAt: { lt: new Date() },
    },
    select: { id: true },
  });

  let count = 0;
  for (const booking of stale) {
    await prisma.$transaction(async (tx) => {
      const b = await tx.booking.findUnique({ where: { id: booking.id } });
      if (!b || b.status !== "PENDING_PAYMENT") return;
      await releaseHold(booking.id, tx);
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "EXPIRED", paymentStatus: "FAILED" },
      });
      count += 1;
    });
  }
  return count;
}

export async function reserveSeats(
  showId: string,
  seatIds: string[],
  bookingId: string,
  holdUntil: Date,
  tx: Tx = prisma
): Promise<void> {
  if (seatIds.length === 0) return;
  const seats = await tx.seat.findMany({
    where: { id: { in: seatIds }, showId },
  });
  if (seats.length !== seatIds.length) {
    throw new AppError(400, "One or more selected seats are invalid");
  }
  const unavailable = seats.find((seat) => seat.status !== "AVAILABLE");
  if (unavailable) {
    throw new AppError(409, `Seat ${unavailable.seatCode} is no longer available`);
  }

  for (const seatId of seatIds) {
    const updated = await tx.seat.updateMany({
      where: {
        id: seatId,
        showId,
        status: "AVAILABLE",
      },
      data: {
        status: "HELD",
        bookingId,
        heldUntil: holdUntil,
      },
    });
    if (updated.count === 0) {
      throw new AppError(409, "One or more seats are no longer available");
    }
  }
}
