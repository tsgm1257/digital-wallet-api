import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db";

// Routers
import authRoutes from "./modules/auth/auth.routes";
import walletRoutes from "./modules/wallet/wallet.routes";
import transactionRoutes from "./modules/transaction/transaction.routes";
import adminRoutes from "./modules/user/user.routes";
import profileRoutes from "./modules/profile/profile.routes";

const app = express();

// --- Core middleware ---
app.use(
  cors({
    origin: true, // allow localhost frontends
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// --- Welcome route (Option A) ---
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "Digital Wallet API",
    status: "OK",
    message: "Welcome! Explore the API using the endpoints below.",
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      wallet: "/api/wallet",
      transactions: "/api/transactions",
      admin: "/api/admin",
      profile: "/api/profile",
      usersLookupAlias: "/api/users/lookup",
    },
  });
});

// --- Health ---
app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, env: process.env.NODE_ENV ?? "dev" });
});

// --- API mounts ---
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/profile", profileRoutes);

// Alias for Agent dashboard lookups (GET /api/users/lookup)
app.use("/api/users", profileRoutes);

// --- 404 (echo method + path for easy debugging) ---
app.use((req: Request, res: Response) => {
  res.status(404).json({
    message: "Route not found",
    method: req.method,
    path: req.originalUrl,
  });
});

// --- Error handler ---
app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res
      .status(err?.status || 500)
      .json({ message: err?.message || "Internal server error" });
  }
);

// --- Boot ---
const PORT = Number(process.env.PORT || 5000);

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err: any) {
    console.error("Failed to start server:", err?.message || err);
    setTimeout(() => process.exit(1), 8000).unref();
  }
}

if (process.env.NODE_ENV !== "test") {
  start();
}

export default app;
