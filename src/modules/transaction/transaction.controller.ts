import { Request, Response } from "express";
import Wallet from "../wallet/wallet.model";
import User from "../user/user.model";
import Transaction from "./transaction.model";
import { transactionSchema, sendMoneySchema } from "./transaction.validation";

type Role = "user" | "agent" | "admin";
type Authed = Request & { user?: { userId: string; role?: Role } };

const normalizePhone = (p?: string) => {
  if (!p) return undefined;
  const digits = p.replace(/\D+/g, "");
  return digits || undefined;
};
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findUserByAny = async (raw: string) => {
  const trimmed = raw.trim();
  const withoutAt = trimmed.replace(/^@+/, "");
  const phone = normalizePhone(trimmed);
  const email = trimmed.toLowerCase();
  const usernameCI = new RegExp("^" + escapeRegex(withoutAt) + "$", "i");

  return User.findOne({
    $or: [{ username: usernameCI }, { email }, ...(phone ? [{ phone }] : [])],
  });
};

// ---------- GET /api/transactions/me ----------
export const getMyTransactions = async (req: Authed, res: Response) => {
  try {
    if (!req.user?.userId)
      return res.status(401).json({ message: "Unauthorized" });
    const {
      page = "1",
      limit = "10",
      type,
      dateFrom,
      dateTo,
    } = req.query as any;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));

    const q: any = {
      $or: [{ sender: req.user.userId }, { receiver: req.user.userId }],
    };
    if (type) q.type = type;
    if (dateFrom || dateTo) {
      q.createdAt = {};
      if (dateFrom) q.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        q.createdAt.$lte = end;
      }
    }

    const base = Transaction.find(q)
      .sort({ createdAt: -1 })
      .populate("sender", "username")
      .populate("receiver", "username");

    const [data, total] = await Promise.all([
      base.skip((pageNum - 1) * limitNum).limit(limitNum),
      Transaction.countDocuments(q),
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

// ---------- POST /api/transactions/send (user → user) ----------
export const sendMoney = async (req: Authed, res: Response) => {
  try {
    if (!req.user?.userId)
      return res.status(401).json({ message: "Unauthorized" });

    const parsed = sendMoneySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid input", errors: parsed.error.flatten() });
    }

    const receiverUser = await findUserByAny(parsed.data.recipient);
    if (!receiverUser) {
      return res
        .status(404)
        .json({
          message:
            "Recipient not found. Use @username, email, or digits-only phone.",
        });
    }
    if (receiverUser._id.equals(req.user.userId)) {
      return res
        .status(400)
        .json({ message: "You cannot send money to yourself." });
    }

    const amount = parsed.data.amount;

    const senderWallet = await Wallet.findOne({ user: req.user.userId });
    if (!senderWallet)
      return res.status(403).json({ message: "Your wallet is unavailable" });
    if (senderWallet.isBlocked)
      return res.status(403).json({ message: "Your wallet is blocked" });
    if (senderWallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const receiverWallet =
      (await Wallet.findOne({ user: receiverUser._id })) ||
      (await Wallet.create({ user: receiverUser._id, balance: 0 }));
    if (receiverWallet.isBlocked) {
      return res.status(403).json({ message: "Recipient wallet is blocked" });
    }

    await Wallet.updateOne(
      { _id: senderWallet._id },
      { $inc: { balance: -amount } }
    );
    await Wallet.updateOne(
      { _id: receiverWallet._id },
      { $inc: { balance: amount } }
    );

    await Transaction.create({
      sender: req.user.userId,
      receiver: receiverUser._id,
      amount,
      type: "send",
      status: "completed",
    });

    return res.status(200).json({ message: "Transfer successful" });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ---------- POST /api/transactions/cash-in (agent/admin → user) ----------
export const cashIn = async (req: Authed, res: Response) => {
  try {
    if (!req.user?.userId)
      return res.status(401).json({ message: "Unauthorized" });

    // Accept both { username, amount } or { recipient, amount }
    const rawUser = (req.body?.username ?? req.body?.recipient) as
      | string
      | undefined;
    const amtRaw = req.body?.amount;
    const parsed = transactionSchema.safeParse({
      username: rawUser,
      amount: amtRaw,
    });
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid input", errors: parsed.error.flatten() });
    }

    const target = await findUserByAny(parsed.data.username);
    if (!target) return res.status(404).json({ message: "User not found" });

    const wallet =
      (await Wallet.findOne({ user: target._id })) ||
      (await Wallet.create({ user: target._id, balance: 0 }));
    if (wallet.isBlocked)
      return res.status(403).json({ message: "Wallet is blocked" });

    await Wallet.updateOne(
      { _id: wallet._id },
      { $inc: { balance: parsed.data.amount } }
    );

    // ✅ Include agent/admin as sender so it appears in their own feed
    await Transaction.create({
      sender: req.user.userId, // <— agent/admin
      receiver: target._id, // <— user
      amount: parsed.data.amount,
      type: "deposit",
      status: "completed",
    });

    return res.status(200).json({ message: "Cash-in successful" });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ---------- POST /api/transactions/cash-out (agent/admin → user) ----------
export const cashOut = async (req: Authed, res: Response) => {
  try {
    if (!req.user?.userId)
      return res.status(401).json({ message: "Unauthorized" });

    const rawUser = (req.body?.username ?? req.body?.recipient) as
      | string
      | undefined;
    const amtRaw = req.body?.amount;
    const parsed = transactionSchema.safeParse({
      username: rawUser,
      amount: amtRaw,
    });
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid input", errors: parsed.error.flatten() });
    }

    const target = await findUserByAny(parsed.data.username);
    if (!target) return res.status(404).json({ message: "User not found" });

    const wallet = await Wallet.findOne({ user: target._id });
    if (!wallet || wallet.isBlocked) {
      return res.status(403).json({ message: "Wallet is unavailable" });
    }
    if (wallet.balance < parsed.data.amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    await Wallet.updateOne(
      { _id: wallet._id },
      { $inc: { balance: -parsed.data.amount } }
    );

    // ✅ Include agent/admin as receiver so it appears in their own feed
    await Transaction.create({
      sender: target._id, // <— user
      receiver: req.user.userId, // <— agent/admin
      amount: parsed.data.amount,
      type: "withdraw",
      status: "completed",
    });

    return res.status(200).json({ message: "Cash-out successful" });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};
