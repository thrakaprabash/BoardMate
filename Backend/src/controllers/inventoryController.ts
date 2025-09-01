import { Request, Response, NextFunction } from "express";
import InventoryItem from "../models/InventoryItem";

export const createItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await InventoryItem.create(req.body);
    res.status(201).json(item);
  } catch (e) { next(e); }
};

export const listItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query as any;
    const filter: any = {};
    if (status) filter.status = status;
    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$or = [{ name: regex }];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      InventoryItem.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      InventoryItem.countDocuments(filter),
    ]);
    res.json({ page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)), items });
  } catch (e) { next(e); }
};

export const getItemById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await InventoryItem.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Item not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const updateItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Item not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const deleteItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Item deleted" });
  } catch (e) { next(e); }
};

export const adjustQuantity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { delta } = req.body as { delta: number };
    const doc = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      { $inc: { quantity: delta } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Item not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const listLowStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await InventoryItem.find({ $expr: { $lte: ["$quantity", "$min_level"] } }).lean();
    res.json(items);
  } catch (e) { next(e); }
};
