import express from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { getMyWallet } from './wallet.controller';
import { addMoney } from './wallet.controller';
import { withdrawMoney } from './wallet.controller';


const router = express.Router();

router.get('/me', authenticate, authorize('user', 'agent'), getMyWallet);
router.post('/add-money', authenticate, authorize('user'), addMoney);
router.post('/withdraw', authenticate, authorize('user'), withdrawMoney);

export default router;
