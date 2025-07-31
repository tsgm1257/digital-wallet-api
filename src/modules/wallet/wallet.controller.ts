import { Request, Response } from "express";
import Wallet from "./wallet.model";
import { moneySchema } from "./wallet.validation";

export const getMyWallet = async (
  req: Request & { user?: { userId: string } },
  res: Response
) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user?.userId }).populate(
      "user",
      "username role"
    );

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    res.status(200).json(wallet);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addMoney = async (
  req: Request & { user?: { userId: string } },
  res: Response
) => {
  try {
    const parsed = moneySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const { amount } = parsed.data;

    const wallet = await Wallet.findOne({ user: req.user?.userId });
    if (!wallet || wallet.isBlocked) {
      return res
        .status(403)
        .json({ message: "Wallet is blocked or not found" });
    }

    wallet.balance += amount;
    await wallet.save();

    res
      .status(200)
      .json({ message: "Top-up successful", balance: wallet.balance });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const withdrawMoney = async (
  req: Request & { user?: { userId: string } },
  res: Response
) => {
  try {
    const parsed = moneySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const { amount } = parsed.data;

    const wallet = await Wallet.findOne({ user: req.user?.userId });
    if (!wallet || wallet.isBlocked) {
      return res
        .status(403)
        .json({ message: "Wallet is blocked or not found" });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    wallet.balance -= amount;
    await wallet.save();

    res
      .status(200)
      .json({ message: "Withdrawal successful", balance: wallet.balance });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};
