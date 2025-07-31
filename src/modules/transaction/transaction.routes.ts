import express from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { sendMoney, getMyTransactions, cashIn, cashOut } from "./transaction.controller";


const router = express.Router();

router.post("/send", authenticate, authorize("user"), sendMoney);
router.get('/me', authenticate, authorize('user', 'agent'), getMyTransactions);
router.post('/cash-in', authenticate, authorize('agent'), cashIn);
router.post('/cash-out', authenticate, authorize('agent'), cashOut);

export default router;
