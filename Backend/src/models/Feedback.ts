import { Schema, model, Types, InferSchemaType } from "mongoose";

const feedbackSchema = new Schema({
  user_id: { type: Types.ObjectId, ref: "User", required: true, index: true },
  hostel_id: { type: Types.ObjectId, ref: "Hostel", index: true },
  room_id: { type: Types.ObjectId, ref: "Room", index: true },
  comments: { type: String, required: true, trim: true },
  rating: { type: Number, min: 1, max: 5 },
  date: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

feedbackSchema.index({ hostel_id: 1, date: -1 });

export type Feedback = InferSchemaType<typeof feedbackSchema>;
export default model<Feedback>("Feedback", feedbackSchema);
