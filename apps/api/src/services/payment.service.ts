import Stripe from "stripe";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/error-handler.js";
import { confirmInventory } from "./inventory.service.js";

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new AppError(503, "Payment provider not configured");
    }
    stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

export async function createCheckoutSession(bookingId: string): Promise<string> {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: {
      items: { include: { ticketType: true } },
      show: { include: { event: true, facility: true } },
    },
  });

  if (booking.status !== "PENDING_PAYMENT") {
    throw new AppError(400, "Booking is not pending payment");
  }

  if (booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
    throw new AppError(410, "Booking hold has expired");
  }

  if (env.MOCK_PAYMENTS) {
    return `${env.FRONTEND_URL}/bookings/${booking.bookingCode}/mock-pay?bookingId=${booking.id}`;
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = booking.items.map(
    (item) => ({
      price_data: {
        currency: "inr",
        product_data: {
          name: `${booking.show.event.title} - ${item.ticketType.name}`,
          description: `${booking.show.facility.name} · ${new Date(booking.show.startsAt).toLocaleString("en-IN")}`,
        },
        unit_amount: item.unitPriceCents,
      },
      quantity: item.quantity,
    })
  );

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: `${env.FRONTEND_URL}/bookings/${booking.bookingCode}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.FRONTEND_URL}/bookings/${booking.bookingCode}/cancel`,
    customer_email: booking.guestEmail,
    metadata: { bookingId: booking.id },
  });

  await prisma.booking.update({
    where: { id: bookingId },
    data: { stripeSessionId: session.id },
  });

  if (!session.url) {
    throw new AppError(500, "Failed to create checkout session");
  }
  return session.url;
}

export async function confirmMockPayment(bookingId: string): Promise<void> {
  if (!env.MOCK_PAYMENTS) {
    throw new AppError(400, "Mock payments are disabled");
  }
  await confirmBookingPayment(bookingId);
}

export async function confirmBookingPayment(bookingId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new AppError(404, "Booking not found");
    if (booking.status === "CONFIRMED") return;
    if (booking.status !== "PENDING_PAYMENT") {
      throw new AppError(400, "Booking cannot be confirmed");
    }
    await confirmInventory(bookingId, tx);
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CONFIRMED",
        paymentStatus: "SUCCEEDED",
        confirmedAt: new Date(),
        holdExpiresAt: null,
      },
    });
  });
}

export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string
): Promise<void> {
  if (env.MOCK_PAYMENTS) return;

  const event = getStripe().webhooks.constructEvent(
    rawBody,
    signature,
    env.STRIPE_WEBHOOK_SECRET
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (bookingId) {
      await confirmBookingPayment(bookingId);
    }
  }
}
