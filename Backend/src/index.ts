import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import logger from "./utils/logger";
import { connectDB, onMongoEvents } from "./utils/db";
import { notFound, errorHandler } from "./utils/errorHandler";

// Route imports (leave them even if empty for now)

import userRoutes from "./routes/userRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import hostelRoutes from "./routes/hostelRoutes";
import roomRoutes from "./routes/roomRoutes";
import inventoryRoutes from "./routes/inventoryRoutes";
import maintenanceRoutes from "./routes/maintenanceRoutes";
import financeRoutes from "./routes/financeRoutes";
import feedbackRoutes from "./routes/feedbackRoutes";
import complaintRoutes from "./routes/complaintRoutes";
import noticeRoutes from "./routes/noticeRoutes";
import reportRoutes from "./routes/reportRoutes";
import authRoutes from "./routes/authRoutes";
import technicianRoutes from "./routes/technicianRoutes";


const app = express();

// Base middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health probes
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/ready", (_req, res) => {
  // Optionally check mongoose connection state here
  res.json({ ready: true });
});

// API routes (prefix all)
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/hostels", hostelRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/technicians", technicianRoutes);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

// Bootstrap
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI as string;

if (!MONGO_URI) {
  logger.error("MONGO_URI is not set in environment");
  process.exit(1);
}

(async () => {
  try {
    onMongoEvents();
    await connectDB(MONGO_URI);
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
})();
