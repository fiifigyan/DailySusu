import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticateToken } from '../middleware/auth';
import { contributionRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const paymentController = new PaymentController();

router.use(authenticateToken);

router.post('/initialize', contributionRateLimiter, paymentController.initializePayment.bind(paymentController));
router.get('/verify/:reference', paymentController.verifyPayment.bind(paymentController));

export default router;