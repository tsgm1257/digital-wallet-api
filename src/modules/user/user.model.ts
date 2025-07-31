import { Schema, model } from 'mongoose';

export type UserRole = 'user' | 'agent' | 'admin';

export interface IUser {
  username: string;
  password: string;
  role: UserRole;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'agent', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

const User = model<IUser>('User', userSchema);

export default User;
