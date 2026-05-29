import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    success: true,
    service: "local-book-my-show-api",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

router.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, database: "connected" });
  } catch {
    res.status(503).json({ success: false, database: "disconnected" });
  }
});

export default router;
