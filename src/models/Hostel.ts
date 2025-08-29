import { Schema, model, Types, InferSchemaType } from "mongoose";

const hostelSchema = new Schema({
  owner_id: { type: Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  facilities: { type: [String], default: [] },
  contact: { type: String, trim: true }, // phone/email string (simple)
  description: { type: String, trim: true },
}, { timestamps: true });

hostelSchema.index({ owner_id: 1, name: 1 });

export type Hostel = InferSchemaType<typeof hostelSchema>;
export default model<Hostel>("Hostel", hostelSchema);
