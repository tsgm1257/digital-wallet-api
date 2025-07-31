import express from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { sendMoney } from "./transaction.controller";
import { getMyTransactions } from './transaction.controller';

const router = express.Router();

router.post("/send", authenticate, authorize("user"), sendMoney);
router.get('/me', authenticate, authorize('user', 'agent'), getMyTransactions);

export default router;
