import express from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import {
  sendMoney,
  getMyTransactions,
  cashIn,
  cashOut,
} from "./transaction.controller";

const router = express.Router();

// User endpoints
router.get(
  "/me",
  authenticate,
  authorize("user", "agent", "admin"),
  getMyTransactions
);
router.post("/send", authenticate, authorize("user"), sendMoney);

// Agent/Admin endpoints — support multiple path variants
router.post("/cash-in", authenticate, authorize("agent", "admin"), cashIn);
router.post("/cashin", authenticate, authorize("agent", "admin"), cashIn); // alias
router.post("/cashIn", authenticate, authorize("agent", "admin"), cashIn); // alias

router.post("/cash-out", authenticate, authorize("agent", "admin"), cashOut);
router.post("/cashout", authenticate, authorize("agent", "admin"), cashOut); // alias
router.post("/cashOut", authenticate, authorize("agent", "admin"), cashOut); // alias

export default router;
