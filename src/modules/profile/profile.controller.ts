import { Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "../user/user.model";
import {
  updateProfileSchema,
  updatePasswordSchema,
  lookupSchema,
} from "./profile.validation";

const normalizePhone = (p?: string) => {
  if (!p) return undefined;
  const digits = p.replace(/\D+/g, "");
  return digits || undefined;
};

export const updateMyProfile = async (
  req: Request & {
    user?: { userId: string; role: "user" | "agent" | "admin" };
  },
  res: Response
) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const me = await User.findById(req.user?.userId);
    if (!me) return res.status(404).json({ message: "User not found" });

    const { username, email, phone } = parsed.data;

    if (username && username !== me.username) {
      const exists = await User.findOne({ username });
      if (exists)
        return res.status(409).json({ message: "Username already taken" });
      me.username = username;
    }

    if (email && email.toLowerCase() !== me.email?.toLowerCase()) {
      const emailNorm = email.trim().toLowerCase();
      const exists = await User.findOne({
        _id: { $ne: me._id },
        email: emailNorm,
      });
      if (exists)
        return res.status(409).json({ message: "Email already in use" });
      me.email = emailNorm;
    }

    if (phone) {
      const phoneNorm = normalizePhone(phone);
      const exists = await User.findOne({
        _id: { $ne: me._id },
        phone: phoneNorm,
      });
      if (exists)
        return res.status(409).json({ message: "Phone already in use" });
      me.phone = phoneNorm;
    }

    await me.save();
    const { password, ...safe } = me.toObject();
    return res.status(200).json({ message: "Profile updated", user: safe });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateMyPassword = async (
  req: Request & {
    user?: { userId: string; role: "user" | "agent" | "admin" };
  },
  res: Response
) => {
  try {
    const parsed = updatePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const me = await User.findById(req.user?.userId);
    if (!me) return res.status(404).json({ message: "User not found" });

    const ok = await bcrypt.compare(parsed.data.oldPassword, me.password);
    if (!ok)
      return res.status(400).json({ message: "Old password is incorrect" });

    me.password = await bcrypt.hash(parsed.data.newPassword, 10);
    await me.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const lookupUser = async (
  req: Request & {
    user?: { userId: string; role: "user" | "agent" | "admin" };
  },
  res: Response
) => {
  try {
    const parsed = lookupSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    let { username, email, phone, q } = parsed.data;
    const queries: any[] = [];

    if (username) queries.push({ username });
    if (email) queries.push({ email: email.toLowerCase() });
    if (phone) queries.push({ phone: normalizePhone(phone) });

    if (q) {
      const qLower = q.toLowerCase();
      const qPhone = normalizePhone(q);
      queries.push(
        { username: q },
        { email: qLower },
        ...(qPhone ? [{ phone: qPhone }] : [])
      );
    }

    const user = await User.findOne({ $or: queries }).select(
      "_id username email phone role isApproved"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json(user);
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};
