import express from 'express';
import {
  getAllUsers,
  getAllWallets,
  getAllTransactions,
  setWalletBlocked
} from './user.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = express.Router();

router.get('/all', authenticate, authorize('admin'), getAllUsers);
router.get('/wallets', authenticate, authorize('admin'), getAllWallets);
router.get('/transactions', authenticate, authorize('admin'), getAllTransactions);
router.patch('/wallets/:walletId/block', authenticate, authorize('admin'), setWalletBlocked);

export default router;
