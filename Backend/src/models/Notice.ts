import { Schema, model, Types, InferSchemaType } from "mongoose";

const noticeSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  date_posted: { type: Date, default: Date.now, index: true },
  postedBy: { type: Types.ObjectId, ref: "User" },
}, { timestamps: true });

noticeSchema.index({ title: "text", description: "text" });

export type Notice = InferSchemaType<typeof noticeSchema>;
export default model<Notice>("Notice", noticeSchema);
