import { Schema, model, Types, InferSchemaType } from "mongoose";

const commentSchema = new Schema(
  {
    by: { type: Types.ObjectId, ref: "User", required: true },
    note: { type: String, required: true, trim: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    label: { type: String, trim: true },
  },
  { _id: false }
);

const maintenanceRequestSchema = new Schema(
  {
    requester: { type: Types.ObjectId, ref: "User", required: true, index: true },
    hostel: { type: Types.ObjectId, ref: "Hostel", required: true, index: true },
    room: { type: Types.ObjectId, ref: "Room", required: true, index: true },
    issueDetails: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed", "cancelled"],
      default: "open",
      index: true,
    },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium", index: true },
    assignedTo: { type: Types.ObjectId, ref: "Technician" },  // CHANGED: ref from "User" to "Technician"
    attachments: [attachmentSchema],
    comments: [commentSchema],
    requestedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

maintenanceRequestSchema.index({ hostel: 1, status: 1, createdAt: -1 });
maintenanceRequestSchema.index({ room: 1, createdAt: -1 });

export type MaintenanceRequest = InferSchemaType<typeof maintenanceRequestSchema>;
export default model<MaintenanceRequest>("MaintenanceRequest", maintenanceRequestSchema);