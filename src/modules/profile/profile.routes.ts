import express from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  updateMyPassword,
  updateMyProfile,
  lookupUser,
} from "./profile.controller";

const router = express.Router();

// Update my profile (username, email, phone)
router.patch("/me", authenticate, updateMyProfile);

// Change my password
router.patch("/me/password", authenticate, updateMyPassword);

// Lookup user by username/email/phone or generic q
router.get("/lookup", authenticate, lookupUser);

export default router;
