// server/src/modules/user/user.model.ts
import { Schema, model, HydratedDocument } from "mongoose";

export type UserRole = "user" | "agent" | "admin";

export interface IUser {
  username: string;
  password: string; // hashed
  role: UserRole;
  isApproved: boolean;

  // ⬇️ add these optional fields
  email?: string | null;
  phone?: string | null;
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
      index: true,
      default: null,
    },
    phone: { type: String, trim: true, index: true, default: null },
  },
  { timestamps: true }
);

// (optional) unique constraints if you want uniqueness
// userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });
// userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: "string" } } });

export type UserDoc = HydratedDocument<IUser>;
const User = model<IUser>("User", userSchema);
export default User;
