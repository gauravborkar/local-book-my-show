import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/error-handler.js";

const router = Router();

const listSchema = z.object({
  city: z.string().optional(),
  category: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

router.get("/", async (req, res, next) => {
  try {
    const query = listSchema.parse(req.query);
    const where = {
      status: "PUBLISHED" as const,
      ...(query.city ? { city: { equals: query.city, mode: "insensitive" as const } } : {}),
      ...(query.category ? { category: query.category as never } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" as const } },
              { description: { contains: query.q, mode: "insensitive" as const } },
              { tags: { has: query.q.toLowerCase() } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          category: true,
          city: true,
          posterUrl: true,
          durationMin: true,
          ageLimit: true,
          tags: true,
          shows: {
            where: { isActive: true, startsAt: { gte: new Date() } },
            orderBy: { startsAt: "asc" },
            take: 1,
            select: { startsAt: true, id: true },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items,
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get("/cities", async (_req, res, next) => {
  try {
    const cities = await prisma.event.findMany({
      where: { status: "PUBLISHED" },
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
    });
    res.json({ success: true, data: cities.map((c) => c.city) });
  } catch (e) {
    next(e);
  }
});

router.get("/:slug", async (req, res, next) => {
  try {
    const event = await prisma.event.findFirst({
      where: { slug: req.params.slug, status: "PUBLISHED" },
      include: {
        manager: { select: { name: true } },
        shows: {
          where: { isActive: true },
          orderBy: { startsAt: "asc" },
          include: {
            facility: { select: { id: true, name: true, slug: true, address: true, city: true } },
            ticketTypes: {
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                name: true,
                description: true,
                priceCents: true,
                totalQty: true,
                soldQty: true,
                heldQty: true,
                maxPerOrder: true,
              },
            },
            seats: {
              select: {
                id: true,
                ticketTypeId: true,
                rowLabel: true,
                seatNumber: true,
                seatCode: true,
                status: true,
                x: true,
                y: true,
              },
            },
          },
        },
      },
    });
    if (!event) throw new AppError(404, "Event not found");

    const shows = event.shows.map((show) => ({
      ...show,
      ticketTypes: show.ticketTypes.map((tt) => ({
        ...tt,
        availableQty: Math.max(0, tt.totalQty - tt.soldQty - tt.heldQty),
      })),
    }));

    res.json({ success: true, data: { ...event, shows } });
  } catch (e) {
    next(e);
  }
});

export default router;
