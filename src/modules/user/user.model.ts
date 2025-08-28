// server/src/modules/user/user.model.ts
import { Schema, model, HydratedDocument } from "mongoose";

export type UserRole = "user" | "agent" | "admin";

export interface IUser {
  username: string;
  password: string; // hashed
  role: UserRole;
  isApproved: boolean;

  // ⬇️ add these optional fields
  email?: string;
  phone?: string;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "agent", "admin"], default: "user" },
    isApproved: { type: Boolean, default: true },

    // ⬇️ add schema fields matching the interface
    email: {
      type: String,
      trim: true,
      lowercase: true,
      // Note: do not set a default to avoid storing null
    },
    phone: { type: String, trim: true },
  },
  { timestamps: true }
);

// Ensure email is unique only when present (avoid duplicate null/undefined conflicts)
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } }
);

export type UserDoc = HydratedDocument<IUser>;
const User = model<IUser>("User", userSchema);
export default User;
