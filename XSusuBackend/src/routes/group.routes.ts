import { Router } from 'express';
import { GroupController } from '../controllers/group.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const groupController = new GroupController();

router.use(authenticateToken);

router.post('/', groupController.createGroup.bind(groupController));
router.get('/', groupController.getMyGroups.bind(groupController));
router.get('/:groupId', groupController.getGroupDetails.bind(groupController));
router.post('/:groupId/members', groupController.addMember.bind(groupController));
router.post('/:groupId/start', groupController.startGroup.bind(groupController));
router.get('/:groupId/schedule', groupController.getPayoutSchedule.bind(groupController));

export default router;