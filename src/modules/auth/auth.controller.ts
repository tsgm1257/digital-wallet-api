import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { SignOptions, Secret } from "jsonwebtoken";
import User from "../user/user.model";
import Wallet from "../wallet/wallet.model";
import { loginSchema, registerSchema } from "./auth.validation";
import { env } from "../../config/env";

/** Ensure required envs exist (fail fast in dev) */
function requireEnv<T extends string | undefined>(
  value: T,
  name: string
): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

/** Parse JWT_EXPIRES_IN and return the exact type expected by jsonwebtoken */
function parseExpires(raw?: string): NonNullable<SignOptions["expiresIn"]> {
  const v = raw ?? "1d";
  // numbers like "3600" -> 3600, otherwise keep as string like "1d", "15m"
  const parsed = /^\d+$/.test(v) ? Number(v) : v;
  // Cast to the library's exact union (number | StringValue)
  return parsed as NonNullable<SignOptions["expiresIn"]>;
}

const JWT_SECRET: Secret = requireEnv(env.JWT_SECRET, "JWT_SECRET");
const JWT_EXPIRES_IN: NonNullable<SignOptions["expiresIn"]> = parseExpires(
  env.JWT_EXPIRES_IN
);

// POST /api/auth/register
export const register = async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const { username, password, role = "user" } = parsed.data;

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const isApproved = role === "agent" ? false : true;

    const user = await User.create({
      username,
      password: hashed,
      role,
      isApproved,
    });

    await Wallet.create({ user: user._id, balance: 0 });

    return res.status(201).json({
      message: "Registration successful",
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (err: any) {
    console.error("Register error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err?.message });
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const { username, password } = parsed.data;

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    if (user.role === "agent" && !user.isApproved) {
      return res
        .status(403)
        .json({ message: "Agent account pending approval" });
    }

    const payload = {
      userId: user._id.toString(),
      role: user.role as "user" | "agent" | "admin",
    };

    const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };

    const token = jwt.sign(payload, JWT_SECRET, options);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user._id, username: user.username, role: user.role },
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err?.message });
  }
};
