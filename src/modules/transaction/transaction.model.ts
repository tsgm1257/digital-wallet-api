import { Schema, model, Types } from 'mongoose';

export type TransactionType = 'send' | 'withdraw' | 'deposit';

export interface ITransaction {
  sender?: Types.ObjectId;
  receiver?: Types.ObjectId;
  amount: number;
  type: TransactionType;
  status: 'completed' | 'failed';
}

const transactionSchema = new Schema<ITransaction>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    receiver: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['send', 'withdraw', 'deposit'], required: true },
    status: { type: String, enum: ['completed', 'failed'], default: 'completed' },
  },
  { timestamps: true }
);

const Transaction = model<ITransaction>('Transaction', transactionSchema);

export default Transaction;
