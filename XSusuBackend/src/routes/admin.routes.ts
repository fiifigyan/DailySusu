import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const adminController = new AdminController();

router.use(authenticateToken);

// Admin middleware would check role here
router.get('/dashboard', adminController.getDashboardStats.bind(adminController));
router.get('/security-logs', adminController.getSecurityLogs.bind(adminController));
router.get('/revenue', adminController.getRevenueReport.bind(adminController));

export default router;