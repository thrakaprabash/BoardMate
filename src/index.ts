import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import userRoutes from './routes/userRoutes';
import bookingRoutes from './routes/bookingRoutes';
import hostelRoutes from './routes/hostelRoutes';
import roomRoutes from './routes/roomRoutes';
import inventoryRoutes from './routes/inventoryRoutes.ts';
import maintenanceRoutes from './routes/maintenanceRoutes';
import financeRoutes from './routes/financeRoutes';
import feedbackRoutes from './routes/feedbackRoutes';
import complaintRoutes from './routes/complaintRoutes';
import noticeRoutes from './routes/noticeRoutes';
import reportRoutes from './routes/reportRoutes';
import { errorHandler } from './utils/errorHandler';

dotenv.config();
const app = express();
const logger = pino({ level: 'info' });

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/reports', reportRoutes);

// Error Handler
app.use(errorHandler);

// DB Connection
mongoose.connect(process.env.MONGO_URI!)
  .then(() => logger.info('Connected to MongoDB Atlas'))
  .catch(err => logger.error('MongoDB connection error:', err));

app.listen(process.env.PORT, () => logger.info(`Server running on port ${process.env.PORT}`));