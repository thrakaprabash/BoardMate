import { Router } from 'express';
import { submitRequest, assignTask, getAnalytics } from '../controllers/maintenanceController';
import { auth, roleCheck } from '../middleware/auth';

const router = Router();

router.post('/', auth, roleCheck(['student']), submitRequest);
router.put('/:id', auth, roleCheck(['owner']), assignTask);
router.get('/analytics', auth, roleCheck(['admin']), getAnalytics);

export default router;