import { Request, Response } from "express";
import User from "./user.model";
import Wallet from "../wallet/wallet.model";
import Transaction from "../transaction/transaction.model";
import { blockWalletSchema, approveAgentSchema } from "./user.validation";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllWallets = async (req: Request, res: Response) => {
  try {
    const wallets = await Wallet.find().populate("user", "username role");
    res.status(200).json(wallets);
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const txns = await Transaction.find()
      .sort({ createdAt: -1 })
      .populate("sender", "username")
      .populate("receiver", "username");
    res.status(200).json(txns);
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const setWalletBlocked = async (req: Request, res: Response) => {
  try {
    const parsed = blockWalletSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const { block } = parsed.data;
    const { walletId } = req.params;

    const wallet = await Wallet.findById(walletId);
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    wallet.isBlocked = block;
    await wallet.save();

    res
      .status(200)
      .json({
        message: `Wallet ${block ? "blocked" : "unblocked"} successfully`,
      });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateAgentApproval = async (req: Request, res: Response) => {
  try {
    const parsed = approveAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const { approve } = parsed.data;
    const { userId } = req.params;

    const agent = await User.findById(userId);
    if (!agent || agent.role !== "agent") {
      return res.status(404).json({ message: "Agent not found" });
    }

    agent.isApproved = approve;
    await agent.save();

    res
      .status(200)
      .json({
        message: `Agent has been ${approve ? "approved" : "suspended"}`,
      });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};
