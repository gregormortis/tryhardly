import { Router } from 'express';
import { getRankCatalog, getUserProgression } from '../controllers/progressionController';

const router = Router();

// Public — static rank ladder & skill-badge rules for the help/progression page.
router.get('/ranks', getRankCatalog);

// Public — a specific worker's progression summary.
router.get('/:userId', getUserProgression);

export default router;
