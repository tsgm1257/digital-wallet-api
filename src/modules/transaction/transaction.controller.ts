import { Request, Response } from "express";
import Wallet from "../wallet/wallet.model";
import User from "../user/user.model";
import Transaction from "./transaction.model";
import { transactionSchema, sendMoneySchema } from "./transaction.validation";

export const sendMoney = async (
  req: Request & { user?: { userId: string } },
  res: Response
) => {
  try {
    const parsed = sendMoneySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const { recipientUsername, amount } = parsed.data;

    const senderWallet = await Wallet.findOne({ user: req.user?.userId });
    if (!senderWallet || senderWallet.isBlocked) {
      return res
        .status(403)
        .json({ message: "Sender wallet is blocked or not found" });
    }

    if (senderWallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const receiverUser = await User.findOne({ username: recipientUsername });
    if (!receiverUser) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    const receiverWallet = await Wallet.findOne({ user: receiverUser._id });
    if (!receiverWallet || receiverWallet.isBlocked) {
      return res
        .status(403)
        .json({ message: "Recipient wallet is blocked or not found" });
    }

    senderWallet.balance -= amount;
    receiverWallet.balance += amount;
    await senderWallet.save();
    await receiverWallet.save();

    await Transaction.create({
      sender: req.user?.userId,
      receiver: receiverUser._id,
      amount,
      type: "send",
      status: "completed",
    });

    res.status(200).json({ message: "Money sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyTransactions = async (
  req: Request & { user?: { userId: string } },
  res: Response
) => {
  try {
    const transactions = await Transaction.find({
      $or: [{ sender: req.user?.userId }, { receiver: req.user?.userId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "username")
      .populate("receiver", "username");

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const cashIn = async (
  req: Request & { user?: { userId: string; role: string } },
  res: Response
) => {
  try {
    const parsed = transactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const { username, amount } = parsed.data;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const wallet = await Wallet.findOne({ user: user._id });
    if (!wallet || wallet.isBlocked) {
      return res
        .status(403)
        .json({ message: "Wallet is blocked or not found" });
    }

    wallet.balance += amount;
    await wallet.save();

    await Transaction.create({
      sender: req.user?.userId,
      receiver: user._id,
      amount,
      type: "deposit",
      status: "completed",
    });

    res.status(200).json({ message: "Cash-in successful" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const cashOut = async (
  req: Request & { user?: { userId: string; role: string } },
  res: Response
) => {
  try {
    const parsed = transactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const { username, amount } = parsed.data;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const wallet = await Wallet.findOne({ user: user._id });
    if (!wallet || wallet.isBlocked) {
      return res
        .status(403)
        .json({ message: "Wallet is blocked or not found" });
    }

    if (wallet.balance < amount) {
      return res
        .status(400)
        .json({ message: "Insufficient balance in user wallet" });
    }

    wallet.balance -= amount;
    await wallet.save();

    await Transaction.create({
      sender: user._id,
      receiver: req.user?.userId,
      amount,
      type: "withdraw",
      status: "completed",
    });

    res.status(200).json({ message: "Cash-out successful" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
