import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole =
  | "student"
  | "hostel_owner"
  | "room_manager"
  | "inventory_manager"
  | "maintenance_manager";

export type UserStatus = "active" | "inactive" | "pending";

export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  passwordHash: string; // stored hash (bcrypt/argon)
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, minlength: 2, maxlength: 100 },
    username: { type: String, required: true, minlength: 3, maxlength: 50, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    role: {
      type: String,
      enum: ["student", "hostel_owner", "room_manager", "inventory_manager", "maintenance_manager"],
      default: "student",
      index: true,
    },
    status: { type: String, enum: ["active", "inactive", "pending"], default: "active", index: true },
    passwordHash: { type: String, required: true, minlength: 10 }, // validator aligns with Zod
  },
  { timestamps: true }
);

// Helpful compound index for searches
UserSchema.index({ name: "text", username: "text", email: "text" });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
