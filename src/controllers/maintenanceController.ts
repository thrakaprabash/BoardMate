import { Request, Response } from 'express';
import { MaintenanceRequest } from '../models/MaintenanceRequest';

export const submitRequest = async (req: Request, res: Response) => {
  const { roomId, issue } = req.body;
  const request = new MaintenanceRequest({
    student: req.user!.id,
    room: roomId,
    issue,
  });
  await request.save();
  res.status(201).json(request);
};

export const assignTask = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { assignedTo, status } = req.body;
  const request = await MaintenanceRequest.findById(id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (assignedTo) request.assignedTo = assignedTo;
  if (status) request.status = status;
  await request.save();
  res.json(request);
};

// Implement analytics
export const getAnalytics = async (req: Request, res: Response) => {
  const analytics = await MaintenanceRequest.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  res.json(analytics);
};