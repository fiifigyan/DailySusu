import { Router } from 'express';
import { ContributionController } from '../controllers/contribution.controller';
import { authenticateToken } from '../middleware/auth';
import { contributionRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const contributionController = new ContributionController();

router.use(authenticateToken);

router.post('/record', contributionRateLimiter, contributionController.recordManualPayment.bind(contributionController));
router.post('/verify', contributionController.verifyAndRecordPayment.bind(contributionController));
router.get('/:groupId/today', contributionController.getTodayStatus.bind(contributionController));
router.post('/:groupId/complete-payout', contributionController.completePayout.bind(contributionController));
router.get('/:groupId/history', contributionController.getContributionHistory.bind(contributionController));
router.post('/app-fee', contributionController.recordAppFee.bind(contributionController));

export default router;