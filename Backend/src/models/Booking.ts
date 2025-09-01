import { Schema, model, Types, InferSchemaType } from "mongoose";

const bookingSchema = new Schema({
  room_id: { type: Types.ObjectId, ref: "Room", required: true, index: true },
  user_id: { type: Types.ObjectId, ref: "User", required: true, index: true },
  start_date: { type: Date, required: true, index: true },
  end_date: { type: Date, required: true, index: true },
  status: {
    type: String,
    enum: ["pending", "confirmed", "checked_in", "completed", "cancelled"],
    default: "pending",
    index: true
  },
  payment_id: { type: Types.ObjectId, ref: "Payment" }, // optional link
}, { timestamps: true });

bookingSchema.index({ room_id: 1, start_date: 1, end_date: 1 });
bookingSchema.index({ user_id: 1, createdAt: -1 });

export type Booking = InferSchemaType<typeof bookingSchema>;
export default model<Booking>("Booking", bookingSchema);
