import { Schema, model, Document } from "mongoose";

export interface BlackoutDateType extends Document {
  date: Date;
  packageType: "tour" | "transfer";
  description?: string;
}

const BlackoutDateSchema = new Schema<BlackoutDateType>({
  date: { type: Date, required: true, unique: true },
  packageType: { type: String, enum: ["tour", "transfer"], required: true },
  description: { type: String, default: "" },
});

const BlackoutDate = model<BlackoutDateType>("BlackoutDate", BlackoutDateSchema);

export default BlackoutDate;
