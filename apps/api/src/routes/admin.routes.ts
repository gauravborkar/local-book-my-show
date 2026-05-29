import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { AppError } from "../middleware/error-handler.js";

const router = Router();
router.use(authenticate, requireRoles("ADMIN"));

router.get("/stats", async (_req, res, next) => {
  try {
    const [users, events, bookings, pendingEvents] = await Promise.all([
      prisma.user.count(),
      prisma.event.count({ where: { status: "PUBLISHED" } }),
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
      prisma.event.count({ where: { status: "PENDING_REVIEW" } }),
    ]);
    res.json({
      success: true,
      data: { users, publishedEvents: events, confirmedBookings: bookings, pendingEvents },
    });
  } catch (e) {
    next(e);
  }
});

router.get("/events/pending", async (_req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: { status: "PENDING_REVIEW" },
      include: {
        manager: { select: { name: true, email: true } },
        shows: { include: { facility: true, ticketTypes: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ success: true, data: events });
  } catch (e) {
    next(e);
  }
});

router.post("/events/:id/approve", async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) throw new AppError(404, "Event not found");
    if (event.status !== "PENDING_REVIEW") {
      throw new AppError(400, "Event is not pending review");
    }
    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { status: "PUBLISHED" },
    });
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

router.post("/events/:id/reject", async (req, res, next) => {
  try {
    const body = z.object({ reason: z.string().optional() }).parse(req.body);
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) throw new AppError(404, "Event not found");
    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { status: "DRAFT" },
    });
    res.json({ success: true, data: updated, message: body.reason ?? "Returned to draft" });
  } catch (e) {
    next(e);
  }
});

router.get("/users", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { events: true, bookings: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: users });
  } catch (e) {
    next(e);
  }
});

router.patch("/users/:id/role", async (req, res, next) => {
  try {
    const body = z
      .object({ role: z.enum(["ATTENDEE", "EVENT_MANAGER", "ADMIN"]) })
      .parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: body.role },
      select: { id: true, email: true, name: true, role: true },
    });
    res.json({ success: true, data: user });
  } catch (e) {
    next(e);
  }
});

export default router;
