import express from "express";
import { sendMoney } from "./transaction.controller";
import { authenticate, authorize } from "../../middlewares/auth.middleware";

const router = express.Router();

router.post("/send", authenticate, authorize("user"), sendMoney);

export default router;
