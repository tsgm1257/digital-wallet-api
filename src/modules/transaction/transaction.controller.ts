import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../user/user.model";
import Wallet from "../wallet/wallet.model";
import Transaction from "./transaction.model";
import {
  transactionSchema,
  sendMoneySchema,
  cashInSchema,
  cashOutSchema,
} from "./transaction.validation";

/** Resolve the authenticated caller to a User doc (supports userId | id | _id | username | email). */
async function resolveCallerUser(req: Request) {
  const u: any = (req as any).user || {};
  const id = u.userId || u.id || u._id;

  if (id && mongoose.isValidObjectId(id)) {
    const found = await User.findById(id);
    if (found) return found;
  }
  if (u.username) {
    const found = await User.findOne({ username: u.username });
    if (found) return found;
  }
  if (u.email) {
    const found = await User.findOne({ "credentials.email": u.email });
    if (found) return found;
  }
  return null;
}

/** Ensure a wallet exists for a user and return it. */
async function ensureWallet(userId: mongoose.Types.ObjectId | string) {
  const uid =
    typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
  return (
    (await Wallet.findOne({ user: uid })) ||
    (await Wallet.create({ user: uid, balance: 0 }))
  );
}

/** Utility: find a recipient by flexible identifier (username, @username, email, phone, or raw ObjectId). */
async function findRecipient(identifier: string) {
  const clean = identifier.startsWith("@") ? identifier.slice(1) : identifier;

  if (mongoose.isValidObjectId(clean)) {
    const byId = await User.findById(clean);
    if (byId) return byId;
  }
  const byUsername = await User.findOne({ username: clean });
  if (byUsername) return byUsername;

  const byEmail = await User.findOne({ "credentials.email": clean });
  if (byEmail) return byEmail;

  const byPhone = await User.findOne({ "profile.phone": clean });
  if (byPhone) return byPhone;

  return null;
}

/**
 * GET /transactions/me
 * Return caller's transactions (as sender or receiver), newest first
 */
export const getMyTransactions = async (req: Request, res: Response) => {
  try {
    const caller = await resolveCallerUser(req);
    if (!caller) return res.status(401).json({ message: "Unauthorized" });

    const txs = await Transaction.find({
      $or: [{ sender: caller._id }, { receiver: caller._id }],
    })
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json({ count: txs.length, transactions: txs });
  } catch (err) {
    console.error("getMyTransactions error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * POST /transactions/send  (user → user)
 * Body: { recipient: string | username, amount: number }
 */
export const sendMoney = async (req: Request, res: Response) => {
  const parsed = (
    "recipient" in req.body ? sendMoneySchema : transactionSchema
  ).safeParse(req.body);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: "Invalid input", errors: parsed.error.flatten() });
  }

  const amount: number = (parsed.data as any).amount;
  const recipientIdentifier: string =
    (parsed.data as any).recipient ?? (parsed.data as any).username;

  try {
    const sender = await resolveCallerUser(req);
    if (!sender) return res.status(401).json({ message: "Unauthorized" });

    const receiver = await findRecipient(recipientIdentifier);
    if (!receiver)
      return res.status(404).json({ message: "Recipient not found" });
    if (String(receiver._id) === String(sender._id)) {
      return res.status(400).json({ message: "Cannot send to yourself" });
    }

    const [senderWallet, receiverWallet] = await Promise.all([
      ensureWallet(sender._id),
      ensureWallet(receiver._id),
    ]);

    if (senderWallet.isBlocked)
      return res.status(403).json({ message: "Sender wallet is blocked" });
    if (receiverWallet.isBlocked)
      return res.status(403).json({ message: "Receiver wallet is blocked" });

    if ((senderWallet.balance ?? 0) < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const updatedSender = await Wallet.findOneAndUpdate(
      { _id: senderWallet._id },
      { $inc: { balance: -amount } },
      { new: true }
    );
    const updatedReceiver = await Wallet.findOneAndUpdate(
      { _id: receiverWallet._id },
      { $inc: { balance: amount } },
      { new: true }
    );

    const tx = await Transaction.create({
      amount,
      sender: sender._id,
      receiver: receiver._id,
      type: "send", // 👈 matches your frontend enum
      status: "completed", // 👈 matches your frontend enum
    });

    return res.status(201).json({
      message: "Transfer successful",
      transaction: tx,
      senderWallet: { id: updatedSender?._id, balance: updatedSender?.balance },
      receiverWallet: {
        id: updatedReceiver?._id,
        balance: updatedReceiver?.balance,
      },
    });
  } catch (err: any) {
    console.error(
      "sendMoney error:",
      err?.name,
      err?.message,
      err?.errors ?? ""
    );
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * POST /transactions/cash-in  (agent/admin → user)
 * Body: { username, amount } OR { userId, amount }
 * Effect: agent balance -= amount, user balance += amount
 */
export const cashIn = async (req: Request, res: Response) => {
  const parsed = cashInSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: "Invalid input", errors: parsed.error.flatten() });
  }
  const { amount } = parsed.data as any;

  try {
    const caller = await resolveCallerUser(req);
    if (!caller) return res.status(401).json({ message: "Unauthorized" });

    const target =
      "userId" in parsed.data
        ? await User.findById((parsed.data as any).userId)
        : await User.findOne({ username: (parsed.data as any).username });

    if (!target)
      return res.status(404).json({ message: "Target user not found" });

    const [agentWallet, userWallet] = await Promise.all([
      ensureWallet(caller._id),
      ensureWallet(target._id),
    ]);

    if (agentWallet.isBlocked)
      return res.status(403).json({ message: "Agent wallet is blocked" });
    if (userWallet.isBlocked)
      return res.status(403).json({ message: "User wallet is blocked" });

    if ((agentWallet.balance ?? 0) < amount) {
      return res
        .status(400)
        .json({ message: "Agent has insufficient balance" });
    }

    const updatedAgent = await Wallet.findOneAndUpdate(
      { _id: agentWallet._id },
      { $inc: { balance: -amount } },
      { new: true }
    );
    const updatedUser = await Wallet.findOneAndUpdate(
      { _id: userWallet._id },
      { $inc: { balance: amount } },
      { new: true }
    );

    const tx = await Transaction.create({
      amount,
      sender: caller._id, // agent/admin
      receiver: target._id, // user
      type: "deposit",
      status: "completed",
    });

    return res.status(201).json({
      message: "Cash-in successful",
      transaction: tx,
      agentWallet: { id: updatedAgent?._id, balance: updatedAgent?.balance },
      userWallet: { id: updatedUser?._id, balance: updatedUser?.balance },
    });
  } catch (err: any) {
    console.error("cashIn error:", err?.name, err?.message, err?.errors ?? "");
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * POST /transactions/cash-out  (user → agent/admin)
 * Body: { username, amount } OR { userId, amount }
 * Effect: user balance -= amount, agent balance += amount
 */
export const cashOut = async (req: Request, res: Response) => {
  const parsed = cashOutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: "Invalid input", errors: parsed.error.flatten() });
  }
  const { amount } = parsed.data as any;

  try {
    const caller = await resolveCallerUser(req);
    if (!caller) return res.status(401).json({ message: "Unauthorized" });

    const target =
      "userId" in parsed.data
        ? await User.findById((parsed.data as any).userId)
        : await User.findOne({ username: (parsed.data as any).username });

    if (!target)
      return res.status(404).json({ message: "Target user not found" });

    const [userWallet, agentWallet] = await Promise.all([
      ensureWallet(target._id),
      ensureWallet(caller._id),
    ]);

    if (userWallet.isBlocked)
      return res.status(403).json({ message: "User wallet is blocked" });
    if (agentWallet.isBlocked)
      return res.status(403).json({ message: "Agent wallet is blocked" });

    if ((userWallet.balance ?? 0) < amount) {
      return res.status(400).json({ message: "Insufficient user balance" });
    }

    const updatedUser = await Wallet.findOneAndUpdate(
      { _id: userWallet._id },
      { $inc: { balance: -amount } },
      { new: true }
    );
    const updatedAgent = await Wallet.findOneAndUpdate(
      { _id: agentWallet._id },
      { $inc: { balance: amount } },
      { new: true }
    );

    const tx = await Transaction.create({
      amount,
      sender: target._id,
      receiver: caller._id,
      type: "withdraw",
      status: "completed",
    });

    return res.status(201).json({
      message: "Cash-out successful",
      transaction: tx,
      agentWallet: { id: updatedAgent?._id, balance: updatedAgent?.balance },
      userWallet: { id: updatedUser?._id, balance: updatedUser?.balance },
    });
  } catch (err: any) {
    console.error("cashOut error:", err?.name, err?.message, err?.errors ?? "");
    return res.status(500).json({ message: "Internal server error" });
  }
};
