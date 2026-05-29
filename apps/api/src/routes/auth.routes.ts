import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/error-handler.js";
import { authenticate, signToken } from "../middleware/auth.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(["ATTENDEE", "EVENT_MANAGER"]).default("ATTENDEE"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new AppError(409, "Email already registered");

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
        phone: body.phone,
        role: body.role,
      },
      select: { id: true, email: true, name: true, role: true, phone: true },
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.status(201).json({ success: true, data: { user, token } });
  } catch (e) {
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.isActive) throw new AppError(401, "Invalid credentials");

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) throw new AppError(401, "Invalid credentials");

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone },
        token,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true },
    });
    res.json({ success: true, data: user });
  } catch (e) {
    next(e);
  }
});

export default router;
