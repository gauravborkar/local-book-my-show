import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { generateBookingCode } from "../lib/booking-code.js";
import { AppError } from "../middleware/error-handler.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import {
  holdExpiresAt,
  reserveSeats,
  releaseHold,
  reserveInventory,
} from "../services/inventory.service.js";
import {
  confirmMockPayment,
  createCheckoutSession,
} from "../services/payment.service.js";
import { expireStaleHolds } from "../services/inventory.service.js";

const router = Router();

const createBookingSchema = z.object({
  showId: z.string(),
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  guestPhone: z.string().optional(),
  items: z
    .array(
      z.object({
        ticketTypeId: z.string(),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .default([]),
  seatIds: z.array(z.string()).default([]),
});

router.post("/", optionalAuth, async (req, res, next) => {
  try {
    await expireStaleHolds();
    const body = createBookingSchema.parse(req.body);

    const show = await prisma.show.findFirst({
      where: {
        id: body.showId,
        isActive: true,
        event: { status: "PUBLISHED" },
      },
      include: {
        event: true,
        ticketTypes: { where: { isActive: true } },
        seats: {
          where: { status: { in: ["AVAILABLE", "HELD", "BOOKED"] } },
        },
      },
    });
    if (!show) throw new AppError(404, "Show not found");
    if (show.startsAt < new Date()) throw new AppError(400, "Show has already started");
    if (show.salesEndAt && show.salesEndAt < new Date()) {
      throw new AppError(400, "Ticket sales have ended");
    }

    const ticketMap = new Map(show.ticketTypes.map((t) => [t.id, t]));
    let totalCents = 0;
    let lineItems: { ticketTypeId: string; quantity: number; unitPriceCents: number }[] = [];

    if (show.hasSeatMap) {
      if (body.seatIds.length === 0) {
        throw new AppError(400, "Please select at least one seat");
      }
      const selectedSeats = show.seats.filter((seat) => body.seatIds.includes(seat.id));
      if (selectedSeats.length !== body.seatIds.length) {
        throw new AppError(400, "One or more selected seats are invalid");
      }

      const grouped = new Map<string, number>();
      for (const seat of selectedSeats) {
        grouped.set(seat.ticketTypeId, (grouped.get(seat.ticketTypeId) ?? 0) + 1);
      }
      lineItems = Array.from(grouped.entries()).map(([ticketTypeId, quantity]) => {
        const tt = ticketMap.get(ticketTypeId);
        if (!tt) throw new AppError(400, "Invalid ticket type for selected seat");
        if (quantity > tt.maxPerOrder) {
          throw new AppError(400, `Maximum ${tt.maxPerOrder} seats for ${tt.name}`);
        }
        totalCents += tt.priceCents * quantity;
        return {
          ticketTypeId,
          quantity,
          unitPriceCents: tt.priceCents,
        };
      });
    } else {
      if (body.items.length === 0) {
        throw new AppError(400, "Select at least one ticket");
      }
      for (const item of body.items) {
        const tt = ticketMap.get(item.ticketTypeId);
        if (!tt) throw new AppError(400, "Invalid ticket type");
        if (item.quantity > tt.maxPerOrder) {
          throw new AppError(400, `Maximum ${tt.maxPerOrder} tickets per order for ${tt.name}`);
        }
        totalCents += tt.priceCents * item.quantity;
        lineItems.push({
          ticketTypeId: tt.id,
          quantity: item.quantity,
          unitPriceCents: tt.priceCents,
        });
      }
    }

    const booking = await prisma.$transaction(async (tx) => {
      await reserveInventory(
        lineItems.map((l) => ({ ticketTypeId: l.ticketTypeId, quantity: l.quantity })),
        tx
      );

      const holdUntil = holdExpiresAt();
      const created = await tx.booking.create({
        data: {
          bookingCode: generateBookingCode(),
          userId: req.user?.userId,
          showId: show.id,
          guestName: body.guestName,
          guestEmail: body.guestEmail,
          guestPhone: body.guestPhone,
          totalCents,
          holdExpiresAt: holdUntil,
          items: {
            create: lineItems,
          },
        },
      });

      if (show.hasSeatMap) {
        await reserveSeats(show.id, body.seatIds, created.id, holdUntil, tx);
      }

      return tx.booking.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          items: { include: { ticketType: true } },
          seats: true,
          show: { include: { event: true, facility: true, seats: true } },
        },
      });
    });

    const checkoutUrl = await createCheckoutSession(booking.id);
    res.status(201).json({
      success: true,
      data: { booking, checkoutUrl },
    });
  } catch (e) {
    next(e);
  }
});

router.post("/:bookingId/mock-pay", async (req, res, next) => {
  try {
    await confirmMockPayment(req.params.bookingId);
    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: req.params.bookingId },
      include: {
        items: { include: { ticketType: true } },
        seats: true,
        show: { include: { event: true, facility: true, seats: true } },
      },
    });
    res.json({ success: true, data: booking });
  } catch (e) {
    next(e);
  }
});

router.get("/code/:code", async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { bookingCode: req.params.code },
      include: {
        items: { include: { ticketType: true } },
        seats: true,
        show: { include: { event: true, facility: true, seats: true } },
      },
    });
    if (!booking) throw new AppError(404, "Booking not found");
    res.json({ success: true, data: booking });
  } catch (e) {
    next(e);
  }
});

router.get("/my", authenticate, async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { ticketType: true } },
        seats: true,
        show: { include: { event: true, facility: true } },
      },
    });
    res.json({ success: true, data: bookings });
  } catch (e) {
    next(e);
  }
});

router.post("/:bookingId/cancel", async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId } });
    if (!booking) throw new AppError(404, "Booking not found");
    if (booking.status !== "PENDING_PAYMENT") {
      throw new AppError(400, "Only pending bookings can be cancelled");
    }

    await prisma.$transaction(async (tx) => {
      await releaseHold(booking.id, tx);
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED", paymentStatus: "FAILED" },
      });
    });

    res.json({ success: true, message: "Booking cancelled" });
  } catch (e) {
    next(e);
  }
});

export default router;
