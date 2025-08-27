import { Request, Response } from "express";
import User from "./user.model";
import Wallet from "../wallet/wallet.model";
import Transaction from "../transaction/transaction.model";
import { blockWalletSchema, approveAgentSchema } from "./user.validation";

/**
 * GET /api/admin/stats
 * Summary for Admin KPI cards
 */
export const getAdminStats = async (req: Request, res: Response) => {
  try {
    // ----- Users -----
    const [totalAll, totalAgents, totalAdmins, approvedAgents, pendingAgents] =
      await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ role: "agent" }),
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ role: "agent", isApproved: true }),
        User.countDocuments({ role: "agent", isApproved: false }),
      ]);

    // Treat "users" as everyone who is NOT admin or agent
    const totalUsers = Math.max(0, totalAll - totalAgents - totalAdmins);

    // ----- Wallets -----
    const [totalWallets, blockedWallets] = await Promise.all([
      Wallet.countDocuments({}),
      Wallet.countDocuments({ isBlocked: true }),
    ]);

    // ----- Transactions -----
    const [txnAgg, typeAgg, statusAgg] = await Promise.all([
      Transaction.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalVolume: { $sum: "$amount" },
          },
        },
      ]),
      Transaction.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
      Transaction.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const transactions = {
      total: txnAgg[0]?.total ?? 0,
      totalVolume: txnAgg[0]?.totalVolume ?? 0,
      byType: typeAgg.reduce((acc: Record<string, number>, it: any) => {
        acc[it._id ?? "unknown"] = it.count;
        return acc;
      }, {}),
      byStatus: statusAgg.reduce((acc: Record<string, number>, it: any) => {
        acc[it._id ?? "unknown"] = it.count;
        return acc;
      }, {}),
    };

    return res.status(200).json({
      users: {
        totalUsers,
        totalAgents,
        totalAdmins,
        approvedAgents,
        pendingAgents,
      },
      wallets: { totalWallets, blockedWallets },
      transactions,
    });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET /api/admin/all
 * Paginated users with optional filters
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "20",
      role,
      approved,
      search,
    } = req.query as {
      page?: string;
      limit?: string;
      role?: "user" | "agent" | "admin";
      approved?: "true" | "false";
      search?: string;
    };

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

    const q: any = {};
    if (role) q.role = role;

    // Only gate agents by approval
    if (role === "agent" && typeof approved !== "undefined") {
      q.isApproved = approved === "true";
    }

    if (search && search.trim()) {
      const s = search.trim();
      const phoneDigits = s.replace(/\D+/g, "");
      q.$or = [
        { username: s },
        { username: { $regex: s, $options: "i" } },
        // harmless if your schema doesn’t have these:
        { email: s.toLowerCase?.() || s },
        { email: { $regex: s, $options: "i" } },
        ...(phoneDigits ? [{ phone: phoneDigits }] : []),
      ];
    }

    const [total, data] = await Promise.all([
      User.countDocuments(q),
      User.find(q)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
    ]);

    return res.status(200).json({
      data,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET /api/admin/wallets
 * Paginated wallets with optional blocked filter
 */
export const getAllWallets = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "20",
      blocked,
    } = req.query as {
      page?: string;
      limit?: string;
      blocked?: "true" | "false";
    };

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

    const q: any = {};
    if (typeof blocked !== "undefined") q.isBlocked = blocked === "true";

    const [total, data] = await Promise.all([
      Wallet.countDocuments(q),
      Wallet.find(q)
        .populate("user", "username role")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
    ]);

    return res.status(200).json({
      data,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET /api/admin/transactions
 * Paginated transactions (newest first)
 */
export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "20" } = req.query as {
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

    const [total, data] = await Promise.all([
      Transaction.countDocuments({}),
      Transaction.find({})
        .sort({ createdAt: -1 })
        .populate("sender", "username")
        .populate("receiver", "username")
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
    ]);

    return res.status(200).json({
      data,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * PATCH /api/admin/wallets/:walletId/block
 * Body: { block: boolean }
 */
export const setWalletBlocked = async (req: Request, res: Response) => {
  try {
    const parsed = blockWalletSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid input", errors: parsed.error.flatten() });
    }

    const { block } = parsed.data;
    const { walletId } = req.params;

    const wallet = await Wallet.findById(walletId);
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    wallet.isBlocked = block;
    await wallet.save();

    return res
      .status(200)
      .json({
        message: `Wallet ${block ? "blocked" : "unblocked"} successfully`,
      });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * PATCH /api/admin/agents/:userId/approval
 * Body: { approve: boolean }
 */
export const updateAgentApproval = async (req: Request, res: Response) => {
  try {
    const parsed = approveAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid input", errors: parsed.error.flatten() });
    }

    const { approve } = parsed.data;
    const { userId } = req.params;

    const agent = await User.findById(userId);
    if (!agent || agent.role !== "agent") {
      return res.status(404).json({ message: "Agent not found" });
    }

    agent.isApproved = approve;
    await agent.save();

    return res
      .status(200)
      .json({
        message: `Agent has been ${approve ? "approved" : "suspended"}`,
      });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};
