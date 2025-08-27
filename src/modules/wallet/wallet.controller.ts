import { Request, Response } from "express";
import Wallet from "./wallet.model";
import Transaction from "../transaction/transaction.model";
import { moneySchema } from "./wallet.validation";

type Authed = Request & {
  user?: { userId: string; role: "user" | "agent" | "admin" };
};

const ensureWallet = async (userId: string) => {
  const found = await Wallet.findOne({ user: userId });
  if (found) return found;
  return Wallet.create({ user: userId, balance: 0 });
};

export const getMyWallet = async (req: Authed, res: Response) => {
  try {
    if (!req.user?.userId)
      return res.status(401).json({ message: "Unauthorized" });
    const wallet = await ensureWallet(req.user.userId);
    const populated = await wallet.populate("user", "username role");
    return res.status(200).json(populated);
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const addMoney = async (req: Authed, res: Response) => {
  try {
    if (!req.user?.userId)
      return res.status(401).json({ message: "Unauthorized" });

    const parsed = moneySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid amount", errors: parsed.error.flatten() });
    }
    const { amount } = parsed.data;

    const wallet = await ensureWallet(req.user.userId);
    if (wallet.isBlocked)
      return res.status(403).json({ message: "Wallet is blocked" });

    const updated = await Wallet.findOneAndUpdate(
      { _id: wallet._id },
      { $inc: { balance: amount } },
      { new: true }
    );

    // Log deposit transaction
    await Transaction.create({
      receiver: req.user.userId,
      amount,
      type: "deposit",
      status: "completed",
    });

    return res.status(200).json({
      message: "Deposit successful",
      balance: updated?.balance ?? wallet.balance + amount,
    });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const withdrawMoney = async (req: Authed, res: Response) => {
  try {
    if (!req.user?.userId)
      return res.status(401).json({ message: "Unauthorized" });

    const parsed = moneySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid amount", errors: parsed.error.flatten() });
    }
    const { amount } = parsed.data;

    const wallet = await ensureWallet(req.user.userId);
    if (wallet.isBlocked)
      return res.status(403).json({ message: "Wallet is blocked" });
    if (wallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const updated = await Wallet.findOneAndUpdate(
      { _id: wallet._id },
      { $inc: { balance: -amount } },
      { new: true }
    );

    // Log withdraw transaction
    await Transaction.create({
      sender: req.user.userId,
      amount,
      type: "withdraw",
      status: "completed",
    });

    return res.status(200).json({
      message: "Withdrawal successful",
      balance: updated?.balance ?? wallet.balance - amount,
    });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};
