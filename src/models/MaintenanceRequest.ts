import { Schema, model } from 'mongoose';

const maintenanceRequestSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'User' },
  room: { type: Schema.Types.ObjectId, ref: 'Room' },
  issue: { type: String, required: true },
  status: { type: String, enum: ['pending', 'in_progress', 'resolved'], default: 'pending' },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
});

export const MaintenanceRequest = model('MaintenanceRequest', maintenanceRequestSchema);