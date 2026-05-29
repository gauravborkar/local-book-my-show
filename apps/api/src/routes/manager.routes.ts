import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { uniqueSlug } from "../lib/slug.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { AppError } from "../middleware/error-handler.js";

const router = Router();
router.use(authenticate, requireRoles("EVENT_MANAGER", "ADMIN"));

// --- Facilities ---
const facilitySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().optional(),
  pincode: z.string().optional(),
  capacity: z.number().int().positive().default(100),
  amenities: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  seatTemplate: z
    .array(
      z.object({
        ticketTypeKey: z.string().min(1),
        rowLabel: z.string().min(1),
        seatNumber: z.string().min(1),
        x: z.number().int().optional(),
        y: z.number().int().optional(),
        priceCents: z.number().int().nonnegative().optional(),
        maxPerOrder: z.number().int().positive().optional(),
      })
    )
    .optional(),
  seatLayoutConfig: z
    .object({
      version: z.literal(1),
      categories: z.array(z.object({}).passthrough()),
      rows: z.array(z.object({}).passthrough()),
    })
    .optional(),
});

router.get("/facilities", async (req, res, next) => {
  try {
    const where =
      req.user!.role === "ADMIN" ? {} : { managerId: req.user!.userId };
    const facilities = await prisma.facility.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { shows: true, seatTemplates: true } } },
    });
    res.json({ success: true, data: facilities });
  } catch (e) {
    next(e);
  }
});

router.get("/facilities/:id", async (req, res, next) => {
  try {
    const facility = await prisma.facility.findUnique({
      where: { id: req.params.id },
      include: {
        seatTemplates: {
          orderBy: [{ rowLabel: "asc" }, { seatNumber: "asc" }],
        },
        _count: { select: { shows: true, seatTemplates: true } },
      },
    });
    if (!facility) throw new AppError(404, "Facility not found");
    if (req.user!.role !== "ADMIN" && facility.managerId !== req.user!.userId) {
      throw new AppError(403, "Not your facility");
    }
    res.json({ success: true, data: facility });
  } catch (e) {
    next(e);
  }
});

router.post("/facilities", async (req, res, next) => {
  try {
    const body = facilitySchema.parse(req.body);
    const slug = await uniqueSlug(body.name, (s) =>
      prisma.facility.findUnique({ where: { slug: s } }).then(Boolean)
    );
    const facility = await prisma.$transaction(async (tx) => {
      const { seatTemplate, seatLayoutConfig, ...facilityBody } = body;
      const created = await tx.facility.create({
        data: {
          ...facilityBody,
          slug,
          imageUrl: body.imageUrl || null,
          managerId: req.user!.userId,
        },
      });

      if (seatTemplate && seatTemplate.length > 0) {
        const normalized = seatTemplate.map((s) => {
          const row = s.rowLabel.trim().toUpperCase();
          const seatNum = s.seatNumber.trim();
          return {
            facilityId: created.id,
            ticketTypeKey: s.ticketTypeKey.trim(),
            rowLabel: row,
            seatNumber: seatNum,
            seatCode: `${row}-${seatNum}`,
            x: s.x ?? null,
            y: s.y ?? null,
            priceCents: s.priceCents ?? null,
            maxPerOrder: s.maxPerOrder ?? null,
          };
        });

        const dedupe = new Set<string>();
        for (const seat of normalized) {
          if (dedupe.has(seat.seatCode)) {
            throw new AppError(400, `Duplicate seatCode in seatTemplate: ${seat.seatCode}`);
          }
          dedupe.add(seat.seatCode);
        }

        await tx.facilitySeatTemplate.createMany({ data: normalized });

        await tx.facility.update({
          where: { id: created.id },
          data: {
            hasSeatTemplate: true,
            seatTemplateJson: seatTemplate as unknown as any,
            seatLayoutConfig: seatLayoutConfig
              ? (seatLayoutConfig as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            capacity: normalized.length,
          },
        });
      }

      return tx.facility.findUniqueOrThrow({ where: { id: created.id } });
    });

    res.status(201).json({ success: true, data: facility });
  } catch (e) {
    next(e);
  }
});

router.patch("/facilities/:id", async (req, res, next) => {
  try {
    const body = facilitySchema.partial().parse(req.body);
    const { seatTemplate, seatLayoutConfig, ...facilityBody } = body;
    const facility = await prisma.facility.findUnique({ where: { id: req.params.id } });
    if (!facility) throw new AppError(404, "Facility not found");
    if (req.user!.role !== "ADMIN" && facility.managerId !== req.user!.userId) {
      throw new AppError(403, "Not your facility");
    }
    const updated = await prisma.$transaction(async (tx) => {
      if (seatTemplate) {
        const normalized = seatTemplate.map((s) => {
          const row = s.rowLabel.trim().toUpperCase();
          const seatNum = s.seatNumber.trim();
          return {
            facilityId: facility.id,
            ticketTypeKey: s.ticketTypeKey.trim(),
            rowLabel: row,
            seatNumber: seatNum,
            seatCode: `${row}-${seatNum}`,
            x: s.x ?? null,
            y: s.y ?? null,
            priceCents: s.priceCents ?? null,
            maxPerOrder: s.maxPerOrder ?? null,
          };
        });

        const dedupe = new Set<string>();
        for (const seat of normalized) {
          if (dedupe.has(seat.seatCode)) {
            throw new AppError(400, `Duplicate seatCode in seatTemplate: ${seat.seatCode}`);
          }
          dedupe.add(seat.seatCode);
        }

        await tx.facilitySeatTemplate.deleteMany({ where: { facilityId: facility.id } });
        if (normalized.length > 0) {
          await tx.facilitySeatTemplate.createMany({ data: normalized });
        }
      }

      await tx.facility.update({
        where: { id: req.params.id },
        data: {
          ...facilityBody,
          imageUrl: facilityBody.imageUrl === "" ? null : facilityBody.imageUrl,
          ...(seatTemplate
            ? {
                hasSeatTemplate: seatTemplate.length > 0,
                seatTemplateJson: seatTemplate as unknown as any,
                seatLayoutConfig: seatLayoutConfig
                  ? (seatLayoutConfig as unknown as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
                capacity: seatTemplate.length,
              }
            : {}),
        },
      });

      return tx.facility.findUniqueOrThrow({
        where: { id: req.params.id },
        include: {
          seatTemplates: {
            orderBy: [{ rowLabel: "asc" }, { seatNumber: "asc" }],
          },
          _count: { select: { shows: true, seatTemplates: true } },
        },
      });
    });
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

// --- Events ---
const eventSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(20),
  category: z.enum(["MUSIC", "COMEDY", "THEATRE", "SPORTS", "WORKSHOP", "FESTIVAL", "OTHER"]),
  city: z.string().min(2),
  posterUrl: z.string().url().optional().or(z.literal("")),
  durationMin: z.number().int().positive().optional(),
  ageLimit: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

router.get("/events", async (req, res, next) => {
  try {
    const where =
      req.user!.role === "ADMIN" ? {} : { managerId: req.user!.userId };
    const events = await prisma.event.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { shows: true } } },
    });
    res.json({ success: true, data: events });
  } catch (e) {
    next(e);
  }
});

router.post("/events", async (req, res, next) => {
  try {
    const body = eventSchema.parse(req.body);
    const slug = await uniqueSlug(body.title, (s) =>
      prisma.event.findUnique({ where: { slug: s } }).then(Boolean)
    );
    const event = await prisma.event.create({
      data: {
        ...body,
        slug,
        posterUrl: body.posterUrl || null,
        managerId: req.user!.userId,
        status: "DRAFT",
      },
    });
    res.status(201).json({ success: true, data: event });
  } catch (e) {
    next(e);
  }
});

router.patch("/events/:id", async (req, res, next) => {
  try {
    const body = eventSchema.partial().parse(req.body);
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) throw new AppError(404, "Event not found");
    if (req.user!.role !== "ADMIN" && event.managerId !== req.user!.userId) {
      throw new AppError(403, "Not your event");
    }
    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: { ...body, posterUrl: body.posterUrl === "" ? null : body.posterUrl },
    });
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

router.post("/events/:id/submit", async (req, res, next) => {
  try {
    const event = await assertEventOwner(req.params.id, req.user!);
    if (event.status !== "DRAFT") throw new AppError(400, "Only drafts can be submitted");
    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { status: "PENDING_REVIEW" },
    });
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

router.post("/events/:id/publish", async (req, res, next) => {
  try {
    const event = await assertEventOwner(req.params.id, req.user!);
    const showCount = await prisma.show.count({ where: { eventId: event.id, isActive: true } });
    if (showCount === 0) throw new AppError(400, "Add at least one show before publishing");

    const status = req.user!.role === "ADMIN" ? "PUBLISHED" : event.status;
    const updated = await prisma.event.update({
      where: { id: event.id },
      data: {
        status:
          req.user!.role === "ADMIN"
            ? "PUBLISHED"
            : event.status === "PENDING_REVIEW"
              ? "PENDING_REVIEW"
              : "PENDING_REVIEW",
      },
    });
    res.json({ success: true, data: updated, message: "Event submitted for review" });
  } catch (e) {
    next(e);
  }
});

// --- Shows ---
const showSchema = z.object({
  eventId: z.string(),
  facilityId: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  doorsOpenAt: z.string().datetime().optional(),
  salesEndAt: z.string().datetime().optional(),
});

router.post("/shows", async (req, res, next) => {
  try {
    const body = showSchema.parse(req.body);
    await assertEventOwner(body.eventId, req.user!);
    const facility = await prisma.facility.findUnique({
      where: { id: body.facilityId },
      include: { seatTemplates: true },
    });
    if (!facility) throw new AppError(404, "Facility not found");
    if (req.user!.role !== "ADMIN" && facility.managerId !== req.user!.userId) {
      throw new AppError(403, "Not your facility");
    }

    const show = await prisma.$transaction(async (tx) => {
      const createdShow = await tx.show.create({
        data: {
          eventId: body.eventId,
          facilityId: body.facilityId,
          startsAt: new Date(body.startsAt),
          endsAt: body.endsAt ? new Date(body.endsAt) : null,
          doorsOpenAt: body.doorsOpenAt ? new Date(body.doorsOpenAt) : null,
          salesEndAt: body.salesEndAt ? new Date(body.salesEndAt) : null,
        },
        include: { facility: true, event: true },
      });

      const templates = facility.seatTemplates;
      if (templates && templates.length > 0) {
        // Auto-create TicketTypes + Seats for the show, based on the facility seat template.
        const ticketTypeKeyOrder = Array.from(
          new Set(templates.map((t) => t.ticketTypeKey))
        );

        const countByKey = new Map<string, number>();
        for (const t of templates) {
          countByKey.set(t.ticketTypeKey, (countByKey.get(t.ticketTypeKey) ?? 0) + 1);
        }

        const ticketTypeByKey = new Map<string, { id: string }>();
        for (const [idx, key] of ticketTypeKeyOrder.entries()) {
          const anySeat = templates.find((t) => t.ticketTypeKey === key);
          const priceCents = anySeat?.priceCents ?? 0;
          const maxPerOrder = anySeat?.maxPerOrder ?? 10;
          const totalQty = countByKey.get(key) ?? 0;

          const createdTT = await tx.ticketType.create({
            data: {
              showId: createdShow.id,
              name: key,
              description: null,
              priceCents,
              totalQty,
              soldQty: 0,
              heldQty: 0,
              maxPerOrder,
              sortOrder: idx,
              isActive: true,
            },
          });
          ticketTypeByKey.set(key, { id: createdTT.id });
        }

        await tx.seat.createMany({
          data: templates.map((t) => {
            const tt = ticketTypeByKey.get(t.ticketTypeKey);
            if (!tt) throw new AppError(400, "TicketType mapping missing for seat template");
            return {
              showId: createdShow.id,
              ticketTypeId: tt.id,
              rowLabel: t.rowLabel,
              seatNumber: t.seatNumber,
              seatCode: t.seatCode,
              x: t.x ?? null,
              y: t.y ?? null,
              status: "AVAILABLE",
              heldUntil: null,
              bookingId: null,
            };
          }),
        });

        await tx.show.update({
          where: { id: createdShow.id },
          data: {
            hasSeatMap: true,
            seatMapJson: templates.map((t) => ({
              ticketTypeKey: t.ticketTypeKey,
              rowLabel: t.rowLabel,
              seatNumber: t.seatNumber,
              x: t.x ?? undefined,
              y: t.y ?? undefined,
              priceCents: t.priceCents ?? undefined,
              maxPerOrder: t.maxPerOrder ?? undefined,
            })),
          },
        });
      }

      return tx.show.findUniqueOrThrow({
        where: { id: createdShow.id },
        include: { facility: true, event: true },
      });
    });

    res.status(201).json({ success: true, data: show });
  } catch (e) {
    next(e);
  }
});

router.get("/shows/:eventId", async (req, res, next) => {
  try {
    await assertEventOwner(req.params.eventId, req.user!);
    const shows = await prisma.show.findMany({
      where: { eventId: req.params.eventId },
      include: {
        facility: true,
        ticketTypes: { orderBy: { sortOrder: "asc" } },
        seats: {
          where: { status: { in: ["AVAILABLE", "HELD", "BOOKED"] } },
          select: {
            id: true,
            rowLabel: true,
            seatNumber: true,
            seatCode: true,
            ticketTypeId: true,
            status: true,
            x: true,
            y: true,
          },
        },
        _count: { select: { bookings: true, seats: true } },
      },
      orderBy: { startsAt: "asc" },
    });
    res.json({ success: true, data: shows });
  } catch (e) {
    next(e);
  }
});

const seatMapSchema = z.object({
  seats: z
    .array(
      z.object({
        ticketTypeId: z.string(),
        rowLabel: z.string().min(1),
        seatNumber: z.string().min(1),
        x: z.number().int().min(0).optional(),
        y: z.number().int().min(0).optional(),
      })
    )
    .min(1),
});

router.post("/shows/:showId/seat-map", async (req, res, next) => {
  try {
    const body = seatMapSchema.parse(req.body);
    const show = await prisma.show.findUnique({
      where: { id: req.params.showId },
      include: { event: true, ticketTypes: { where: { isActive: true } } },
    });
    if (!show) throw new AppError(404, "Show not found");
    if (req.user!.role !== "ADMIN" && show.event.managerId !== req.user!.userId) {
      throw new AppError(403, "Forbidden");
    }

    const allowedTicketTypeIds = new Set(show.ticketTypes.map((tt) => tt.id));
    for (const seat of body.seats) {
      if (!allowedTicketTypeIds.has(seat.ticketTypeId)) {
        throw new AppError(400, "Seat ticketTypeId does not belong to this show");
      }
    }

    const seatData = body.seats.map((seat) => ({
      showId: show.id,
      ticketTypeId: seat.ticketTypeId,
      rowLabel: seat.rowLabel.trim().toUpperCase(),
      seatNumber: seat.seatNumber.trim(),
      seatCode: `${seat.rowLabel.trim().toUpperCase()}-${seat.seatNumber.trim()}`,
      x: seat.x ?? null,
      y: seat.y ?? null,
      status: "AVAILABLE" as const,
      heldUntil: null,
      bookingId: null,
    }));

    const dedupe = new Set<string>();
    for (const seat of seatData) {
      if (dedupe.has(seat.seatCode)) {
        throw new AppError(400, `Duplicate seat code in payload: ${seat.seatCode}`);
      }
      dedupe.add(seat.seatCode);
    }

    await prisma.$transaction(async (tx) => {
      await tx.seat.deleteMany({
        where: {
          showId: show.id,
          status: { in: ["AVAILABLE", "BLOCKED"] },
        },
      });

      await tx.seat.createMany({
        data: seatData,
      });

      await tx.show.update({
        where: { id: show.id },
        data: {
          hasSeatMap: true,
          seatMapJson: body.seats,
        },
      });

      const grouped = new Map<string, number>();
      for (const seat of seatData) {
        grouped.set(seat.ticketTypeId, (grouped.get(seat.ticketTypeId) ?? 0) + 1);
      }
      for (const ticketType of show.ticketTypes) {
        await tx.ticketType.update({
          where: { id: ticketType.id },
          data: {
            totalQty: grouped.get(ticketType.id) ?? 0,
          },
        });
      }
    });

    const updatedShow = await prisma.show.findUniqueOrThrow({
      where: { id: show.id },
      include: {
        seats: {
          orderBy: [{ rowLabel: "asc" }, { seatNumber: "asc" }],
        },
        ticketTypes: { orderBy: { sortOrder: "asc" } },
      },
    });

    res.json({
      success: true,
      data: updatedShow,
      message: "Seat map uploaded",
    });
  } catch (e) {
    next(e);
  }
});

// --- Ticket types ---
const ticketTypeSchema = z.object({
  showId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  priceCents: z.number().int().min(0),
  totalQty: z.number().int().positive(),
  maxPerOrder: z.number().int().positive().default(10),
  sortOrder: z.number().int().default(0),
});

router.post("/ticket-types", async (req, res, next) => {
  try {
    const body = ticketTypeSchema.parse(req.body);
    const show = await prisma.show.findUnique({
      where: { id: body.showId },
      include: { event: true },
    });
    if (!show) throw new AppError(404, "Show not found");
    if (req.user!.role !== "ADMIN" && show.event.managerId !== req.user!.userId) {
      throw new AppError(403, "Forbidden");
    }

    const ticketType = await prisma.ticketType.create({ data: body });
    res.status(201).json({ success: true, data: ticketType });
  } catch (e) {
    next(e);
  }
});

router.patch("/ticket-types/:id", async (req, res, next) => {
  try {
    const body = ticketTypeSchema.partial().omit({ showId: true }).parse(req.body);
    const tt = await prisma.ticketType.findUnique({
      where: { id: req.params.id },
      include: { show: { include: { event: true } } },
    });
    if (!tt) throw new AppError(404, "Ticket type not found");
    if (req.user!.role !== "ADMIN" && tt.show.event.managerId !== req.user!.userId) {
      throw new AppError(403, "Forbidden");
    }
    if (body.totalQty !== undefined && body.totalQty < tt.soldQty + tt.heldQty) {
      throw new AppError(400, "Total quantity cannot be less than sold + held");
    }
    const updated = await prisma.ticketType.update({
      where: { id: req.params.id },
      data: body,
    });
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

// --- Dashboard ---
router.get("/dashboard", async (req, res, next) => {
  try {
    const managerId = req.user!.role === "ADMIN" ? undefined : req.user!.userId;
    const [events, facilities, bookings, revenue] = await Promise.all([
      prisma.event.count({ where: managerId ? { managerId } : {} }),
      prisma.facility.count({ where: managerId ? { managerId } : {} }),
      prisma.booking.count({
        where: {
          status: "CONFIRMED",
          show: managerId ? { event: { managerId } } : {},
        },
      }),
      prisma.booking.aggregate({
        where: {
          status: "CONFIRMED",
          show: managerId ? { event: { managerId } } : {},
        },
        _sum: { totalCents: true },
      }),
    ]);

    const recentBookings = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        show: managerId ? { event: { managerId } } : {},
      },
      orderBy: { confirmedAt: "desc" },
      take: 10,
      include: {
        show: { include: { event: true, facility: true } },
        items: { include: { ticketType: true } },
      },
    });

    res.json({
      success: true,
      data: {
        stats: {
          events,
          facilities,
          confirmedBookings: bookings,
          revenueCents: revenue._sum.totalCents ?? 0,
        },
        recentBookings,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get("/bookings/show/:showId", async (req, res, next) => {
  try {
    const show = await prisma.show.findUnique({
      where: { id: req.params.showId },
      include: { event: true },
    });
    if (!show) throw new AppError(404, "Show not found");
    if (req.user!.role !== "ADMIN" && show.event.managerId !== req.user!.userId) {
      throw new AppError(403, "Forbidden");
    }

    const bookings = await prisma.booking.findMany({
      where: { showId: show.id, status: "CONFIRMED" },
      include: { items: { include: { ticketType: true } } },
      orderBy: { confirmedAt: "desc" },
    });
    res.json({ success: true, data: bookings });
  } catch (e) {
    next(e);
  }
});

router.post("/check-in/:bookingCode", async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { bookingCode: req.params.bookingCode },
      include: { show: { include: { event: true } } },
    });
    if (!booking) throw new AppError(404, "Booking not found");
    if (req.user!.role !== "ADMIN" && booking.show.event.managerId !== req.user!.userId) {
      throw new AppError(403, "Forbidden");
    }
    if (booking.status !== "CONFIRMED") throw new AppError(400, "Booking is not confirmed");
    if (booking.checkedInAt) throw new AppError(400, "Already checked in");

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { checkedInAt: new Date() },
    });
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

async function assertEventOwner(
  eventId: string,
  user: { userId: string; role: string }
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError(404, "Event not found");
  if (user.role !== "ADMIN" && event.managerId !== user.userId) {
    throw new AppError(403, "Not your event");
  }
  return event;
}

export default router;
