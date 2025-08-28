// src/modules/transaction/transaction.controller.ts
import { Request, Response } from "express";
import User from "../user/user.model";
import Wallet from "../wallet/wallet.model";
import Transaction from "./transaction.model";
import { cashInSchema, cashOutSchema } from "./transaction.validation";

/**
 * CASH IN (agent -> user):
 * - Decrement agent wallet
 * - Increment user wallet
 * - Record transaction (sender = agent, receiver = user)
 */
export const cashIn = async (req: Request, res: Response) => {
  try {
    const parsed = cashInSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const { userId, amount } = parsed.data;

    // Target user (receiver)
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // Receiver wallet (create if missing)
    const userWallet =
      (await Wallet.findOne({ user: targetUser._id })) ||
      (await Wallet.create({ user: targetUser._id, balance: 0 }));

    if (userWallet.isBlocked) {
      return res.status(403).json({ message: "User wallet is blocked" });
    }

    // Agent wallet (sender = authenticated caller)
    const agentId = (req as any)?.user?.userId;
    if (!agentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const agentWallet =
      (await Wallet.findOne({ user: agentId })) ||
      (await Wallet.create({ user: agentId, balance: 0 }));

    if (agentWallet.isBlocked) {
      return res.status(403).json({ message: "Agent wallet is blocked" });
    }

    // Ensure the agent has enough float
    if (agentWallet.balance < amount) {
      return res
        .status(400)
        .json({ message: "Agent has insufficient balance" });
    }

    // 1) decrement agent, 2) increment user
    await Wallet.updateOne(
      { _id: agentWallet._id },
      { $inc: { balance: -amount } }
    );

    await Wallet.updateOne(
      { _id: userWallet._id },
      { $inc: { balance: amount } }
    );

    // Log transaction
    const tx = await Transaction.create({
      amount,
      sender: agentId,
      receiver: targetUser._id,
      type: "CASH_IN",
      status: "COMPLETED",
    });

    // Return minimal info
    const [freshAgentWallet, freshUserWallet] = await Promise.all([
      Wallet.findById(agentWallet._id),
      Wallet.findById(userWallet._id),
    ]);

    return res.status(201).json({
      message: "Cash-in successful",
      transaction: tx,
      agentWallet: {
        id: freshAgentWallet?._id,
        balance: freshAgentWallet?.balance,
      },
      userWallet: {
        id: freshUserWallet?._id,
        balance: freshUserWallet?.balance,
      },
    });
  } catch (err) {
    console.error("cashIn error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * CASH OUT (user -> agent):
 * - Decrement user wallet
 * - Increment agent wallet
 * - Record transaction (sender = user, receiver = agent)
 */
export const cashOut = async (req: Request, res: Response) => {
  try {
    const parsed = cashOutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const { userId, amount } = parsed.data;

    // Target user (sender)
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // Sender wallet (create if missing)
    const userWallet =
      (await Wallet.findOne({ user: targetUser._id })) ||
      (await Wallet.create({ user: targetUser._id, balance: 0 }));

    if (userWallet.isBlocked) {
      return res.status(403).json({ message: "User wallet is blocked" });
    }

    // Balance check for user
    if (userWallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient user balance" });
    }

    // Agent wallet (receiver = authenticated caller)
    const agentId = (req as any)?.user?.userId;
    if (!agentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const agentWallet =
      (await Wallet.findOne({ user: agentId })) ||
      (await Wallet.create({ user: agentId, balance: 0 }));

    if (agentWallet.isBlocked) {
      return res.status(403).json({ message: "Agent wallet is blocked" });
    }

    // 1) decrement user, 2) increment agent
    await Wallet.updateOne(
      { _id: userWallet._id },
      { $inc: { balance: -amount } }
    );

    await Wallet.updateOne(
      { _id: agentWallet._id },
      { $inc: { balance: amount } }
    );

    // Log transaction
    const tx = await Transaction.create({
      amount,
      sender: targetUser._id,
      receiver: agentId,
      type: "CASH_OUT",
      status: "COMPLETED",
    });

    // Return minimal info
    const [freshAgentWallet, freshUserWallet] = await Promise.all([
      Wallet.findById(agentWallet._id),
      Wallet.findById(userWallet._id),
    ]);

    return res.status(201).json({
      message: "Cash-out successful",
      transaction: tx,
      agentWallet: {
        id: freshAgentWallet?._id,
        balance: freshAgentWallet?.balance,
      },
      userWallet: {
        id: freshUserWallet?._id,
        balance: freshUserWallet?.balance,
      },
    });
  } catch (err) {
    console.error("cashOut error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
