import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItem extends Document {
  userId: string;
  packageType: 'tour' | 'transfer';
  packageId: mongoose.Types.ObjectId;
  packageTitle: string;
  packageImage?: string;
  date: Date;
  time: string;
  adults: number;
  children: number;
  adultPrice: number;
  childPrice: number;
  totalPrice: number;
  pickupLocation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  packageType: {
    type: String,
    enum: ['tour', 'transfer'],
    required: true
  },
  packageId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'packageType'
  },
  packageTitle: {
    type: String,
    required: true
  },
  packageImage: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  adults: {
    type: Number,
    required: true,
    min: 1
  },
  children: {
    type: Number,
    default: 0,
    min: 0
  },
  adultPrice: {
    type: Number,
    required: true,
    min: 0
  },
  childPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  pickupLocation: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for efficient queries
CartItemSchema.index({ userId: 1, createdAt: -1 });
CartItemSchema.index({ userId: 1, packageId: 1, date: 1, time: 1 }, { unique: true });

export default mongoose.model<ICartItem>('CartItem', CartItemSchema);
