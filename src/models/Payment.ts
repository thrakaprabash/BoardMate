import { Schema, model, Types, InferSchemaType } from "mongoose";

const paymentSchema = new Schema({
  user_id: { type: Types.ObjectId, ref: "User", required: true, index: true },
  booking_id: { type: Types.ObjectId, ref: "Booking" },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "LKR" },
  date: { type: Date, default: Date.now, index: true },
  method: { type: String, required: true, trim: true }, // e.g., card/cash/online
  status: {
    type: String,
    enum: ["pending", "paid", "completed", "failed", "refunded", "refund_entry", "success"],
  },
  refundOf: { type: Types.ObjectId, ref: "Payment" }, // for mirror entries
}, { timestamps: true });

paymentSchema.index({ status: 1, date: -1 });

export type Payment = InferSchemaType<typeof paymentSchema>;
export default model<Payment>("Payment", paymentSchema);
