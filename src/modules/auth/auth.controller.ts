import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User from '../user/user.model';
import Wallet from '../wallet/wallet.model';

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, role } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({ username, password: hashedPassword, role });

    await Wallet.create({ user: newUser._id, balance: 50 });

    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
