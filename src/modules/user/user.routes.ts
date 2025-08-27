import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import {
  getAdminStats,
  getAllUsers,
  getAllWallets,
  getAllTransactions,
  setWalletBlocked,
  updateAgentApproval,
} from "./user.controller";

const router = Router();

// KPI stats
router.get("/stats", authenticate, authorize("admin"), getAdminStats);

// Lists
router.get("/all", authenticate, authorize("admin"), getAllUsers);
router.get("/wallets", authenticate, authorize("admin"), getAllWallets);
router.get(
  "/transactions",
  authenticate,
  authorize("admin"),
  getAllTransactions
);

// Actions
router.patch(
  "/wallets/:walletId/block",
  authenticate,
  authorize("admin"),
  setWalletBlocked
);

router.patch(
  "/agents/:userId/approval",
  authenticate,
  authorize("admin"),
  updateAgentApproval
);
router.patch(
  "/agents/:userId/approve",
  authenticate,
  authorize("admin"),
  updateAgentApproval
);

export default router;
