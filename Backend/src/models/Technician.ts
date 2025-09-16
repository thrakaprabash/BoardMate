import { Schema, model, Document } from "mongoose";

export interface ITechnician extends Document {
  name: string;
  email?: string;
  phone?: string;
  skills: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TechnicianSchema = new Schema<ITechnician>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: { type: String, trim: true },
    skills: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// optional: unique email if you want
TechnicianSchema.index({ email: 1 }, { unique: false, sparse: true });

export default model<ITechnician>("Technician", TechnicianSchema);
