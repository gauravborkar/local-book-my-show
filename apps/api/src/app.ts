import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { handleStripeWebhook } from "./services/payment.service.js";
import authRoutes from "./routes/auth.routes.js";
import eventsRoutes from "./routes/events.routes.js";
import bookingsRoutes from "./routes/bookings.routes.js";
import managerRoutes from "./routes/manager.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import healthRoutes from "./routes/health.routes.js";

export function createApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    })
  );

  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    async (req, res, next) => {
      try {
        const sig = req.headers["stripe-signature"] as string;
        await handleStripeWebhook(req.body as Buffer, sig);
        res.json({ received: true });
      } catch (e) {
        next(e);
      }
    }
  );

  app.use(express.json({ limit: "1mb" }));

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/events", eventsRoutes);
  app.use("/api/bookings", bookingsRoutes);
  app.use("/api/manager", managerRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(errorHandler);

  return app;
}
