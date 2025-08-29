import { Schema, model, Types, InferSchemaType } from "mongoose";

const roomSchema = new Schema({
  hostel_id: { type: Types.ObjectId, ref: "Hostel", required: true, index: true },
  type: { type: String, required: true, trim: true }, // e.g., single/double/suite
  capacity: { type: Number, required: true, min: 1 },
  rent: { type: Number, required: true, min: 0 },
  amenities: { type: [String], default: [] },
  availability_status: { type: Boolean, default: true, index: true },
}, { timestamps: true });

roomSchema.index({ hostel_id: 1, type: 1 });

export type Room = InferSchemaType<typeof roomSchema>;
export default model<Room>("Room", roomSchema);
