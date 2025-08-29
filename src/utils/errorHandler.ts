import { NextFunction, Request, Response } from "express";
import logger from "./logger";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ message: "Route not found" });
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  logger.error({ err }, "Unhandled error");
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Internal Server Error"
  });
}
