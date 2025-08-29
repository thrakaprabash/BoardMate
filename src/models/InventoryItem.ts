import { Schema, model, Types, InferSchemaType } from "mongoose";

const inventoryItemSchema = new Schema({
  hostel_id: { type: Types.ObjectId, ref: "Hostel", index: true }, // optional scope
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  min_level: { type: Number, required: true, min: 0, default: 0 },
  status: { type: String, enum: ["active", "inactive", "low", "out"], default: "active", index: true },
}, { timestamps: true });

inventoryItemSchema.index({ hostel_id: 1, name: 1 }, { unique: true });

export type InventoryItem = InferSchemaType<typeof inventoryItemSchema>;
export default model<InventoryItem>("InventoryItem", inventoryItemSchema);
