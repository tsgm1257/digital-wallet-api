import { Request, Response } from 'express';
import Wallet from '../wallet/wallet.model';
import User from '../user/user.model';
import Transaction from './transaction.model';

export const sendMoney = async (
  req: Request & { user?: { userId: string } },
  res: Response
) => {
  try {
    const { recipientUsername, amount } = req.body;

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    const senderWallet = await Wallet.findOne({ user: req.user?.userId });
    if (!senderWallet || senderWallet.isBlocked) {
      return res.status(403).json({ message: 'Sender wallet is blocked or not found' });
    }

    if (senderWallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const receiverUser = await User.findOne({ username: recipientUsername });
    if (!receiverUser) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const receiverWallet = await Wallet.findOne({ user: receiverUser._id });
    if (!receiverWallet || receiverWallet.isBlocked) {
      return res.status(403).json({ message: 'Recipient wallet is blocked or not found' });
    }

    // Perform atomic transaction
    senderWallet.balance -= amount;
    receiverWallet.balance += amount;
    await senderWallet.save();
    await receiverWallet.save();

    await Transaction.create({
      sender: req.user?.userId,
      receiver: receiverUser._id,
      amount,
      type: 'send',
      status: 'completed',
    });

    res.status(200).json({ message: 'Money sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
