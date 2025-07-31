import express from 'express';
import { getMyWallet } from './wallet.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = express.Router();

router.get('/me', authenticate, authorize('user', 'agent'), getMyWallet);

export default router;
