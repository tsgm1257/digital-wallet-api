import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db";

// Routes
import authRoutes from "./modules/auth/auth.routes";
import walletRoutes from "./modules/wallet/wallet.routes";
import transactionRoutes from "./modules/transaction/transaction.routes";
import adminRoutes from "./modules/user/user.routes";
import profileRoutes from "./modules/profile/profile.routes";

const app = express();

/**
 * CORS
 * In dev with Vite, set VITE origin (e.g., http://localhost:5173).
 * In prod, put your deployed client URL(s).
 */
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, cb) => {
      // allow no-origin (e.g., curl, Postman)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // Block unexpected origins in prod; allow in dev if you prefer
      return cb(null, true);
      // To strictly block, use: cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Core middleware
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/wallets", walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", profileRoutes);

// Root test route
app.get("/", (_req: Request, res: Response) => {
  res.send("Digital Wallet API is running!");
});

// 404 handler (for unmatched API routes)
app.use((req: Request, res: Response) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "Route not found" });
  }
  res.status(404).send("Not found");
});

// Global error handler (keeps errors from crashing the process)
app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res
      .status(err?.status || 500)
      .json({ message: "Internal server error", error: err?.message });
  }
);

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  try {
    // Connect DB first; if it throws, we won't start the server
    await connectDB();
    console.log("MongoDB connected");

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log("HTTP server closed");
        // If connectDB exposes a disconnect, call it here
        process.exit(0);
      });
      // Force exit if not closed in 8s
      setTimeout(() => process.exit(1), 8000).unref();
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err: any) {
    console.error("❌ Failed to start server:", err?.message || err);
    process.exit(1);
  }
}

start();

export default app;
