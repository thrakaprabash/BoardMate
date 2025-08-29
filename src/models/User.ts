import { Schema, model, InferSchemaType } from "mongoose";

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  role: { type: String, enum: ["student", "owner", "admin", "staff"], default: "student" },
  status: { type: String, enum: ["active", "inactive", "pending"], default: "active", index: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });

export type User = InferSchemaType<typeof userSchema>;
export default model<User>("User", userSchema);
