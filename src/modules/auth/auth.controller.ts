import { Request, Response } from "express";
import bcrypt, { compare } from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../user/user.model";
import { loginSchema, registerSchema } from "./auth.validation";
import { env } from "../../config/env";

// POST /api/auth/register
export const register = async (req: Request, res: Response) => {
  try {
    // 1) Validate input
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }
    const { username, password, role = "user", email, phone } = parsed.data;

    // 2) Ensure unique username
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ message: "Username already exists" });
    }

    // 3) Hash password
    const hashed = await bcrypt.hash(password, 10);

    // 4) Agents require approval; others auto-approved
    const isApproved = role === "agent" ? false : true;

    // 5) Create user
    const user = await User.create({
      username,
      password: hashed,
      role,
      email,
      phone,
      isApproved,
    });

    // 6) Respond
    return res.status(201).json({
      message: "Registration successful",
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (err: any) {
    console.error("Register error:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: err?.message,
    });
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response) => {
  try {
    // 1) Validate shape
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const { username, password } = parsed.data;

    // 2) Find user + ensure password selected for compare
    const user = await User.findOne({ username }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3) Compare password
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 4) Agent approval gate
    if (user.role === "agent" && !user.isApproved) {
      return res.status(403).json({ message: "Agent not approved yet" });
    }

    // 5) Issue JWT
    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return res.status(200).json({ message: "Login successful", token });
  } catch (err: any) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err?.message });
  }
};
