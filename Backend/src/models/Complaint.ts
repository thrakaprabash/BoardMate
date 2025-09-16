import { Schema, model, Document, Types } from "mongoose";

export type ComplaintStatus = "open" | "in_progress" | "resolved" | "closed" | "rejected";

export interface IComplaintComment {
  note: string;
  by?: Types.ObjectId | string; // can be user/technician id or a plain label
  at: Date;
}

export interface IComplaint extends Document {
  subject: string;
  description?: string;
  user?: Types.ObjectId;        // ref User
  assignedTo?: Types.ObjectId;  // ref Technician
  status: ComplaintStatus;
  resolvedAt?: Date;
  comments: IComplaintComment[];
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema = new Schema<IComplaint>(
  {
    subject: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "Technician", index: true },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed", "rejected"],
      default: "open",
      index: true,
    },
    resolvedAt: { type: Date },
    comments: [
      new Schema<IComplaintComment>(
        {
          note: { type: String, required: true, trim: true },
          by: { type: Schema.Types.Mixed }, // ObjectId or string
          at: { type: Date, default: Date.now },
        },
        { _id: false }
      ),
    ],
  },
  { timestamps: true }
);

ComplaintSchema.index({ subject: "text", description: "text" });

export default model<IComplaint>("Complaint", ComplaintSchema);
