import { Schema, model, Types } from 'mongoose';

export interface IWallet {
  user: Types.ObjectId;
  balance: number;
  isBlocked: boolean;
}

const walletSchema = new Schema<IWallet>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    balance: { type: Number, default: 50 },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Wallet = model<IWallet>('Wallet', walletSchema);

export default Wallet;
