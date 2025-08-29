import { Schema, model, Types, InferSchemaType } from "mongoose";

const complaintSchema = new Schema({
  user_id: { type: Types.ObjectId, ref: "User", required: true, index: true },
  hostel_id: { type: Types.ObjectId, ref: "Hostel", index: true },
  room_id: { type: Types.ObjectId, ref: "Room", index: true },
  description: { type: String, required: true, trim: true },
  status: { type: String, enum: ["open", "in_progress", "resolved", "closed"], default: "open", index: true },
}, { timestamps: true });

complaintSchema.index({ hostel_id: 1, status: 1, createdAt: -1 });

export type Complaint = InferSchemaType<typeof complaintSchema>;
export default model<Complaint>("Complaint", complaintSchema);
