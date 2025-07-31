import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../modules/user/user.model"; // adjust path if different

interface JwtPayload {
  userId: string;
  role: "user" | "agent" | "admin";
}

export const authenticate = (
  req: Request & { user?: JwtPayload },
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const authorize =
  (...roles: JwtPayload["role"][]) =>
  async (
    req: Request & { user?: JwtPayload },
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient role" });
    }

    // If role is agent, check if approved
    if (req.user.role === "agent") {
      const agent = await User.findById(req.user.userId);
      if (!agent?.isApproved) {
        return res
          .status(403)
          .json({ message: "Forbidden: Agent not approved" });
      }
    }

    next();
  };
