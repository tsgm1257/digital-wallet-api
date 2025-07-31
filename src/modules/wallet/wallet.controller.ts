import { Request, Response } from 'express';
import Wallet from './wallet.model';

export const getMyWallet = async (req: Request & { user?: { userId: string } }, res: Response) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user?.userId }).populate('user', 'username role');

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    res.status(200).json(wallet);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
