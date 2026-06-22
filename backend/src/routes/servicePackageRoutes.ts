import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  listMyServicePackages,
  createServicePackage,
  updateServicePackage,
  deleteServicePackage,
  browseServicePackages,
  getPublicServicePackages,
  getServicePackage,
} from '../controllers/servicePackageController';

const router = Router();

// Authenticated — current worker's own packages (owner-scoped CRUD). These
// literal `/me` paths are declared before the `/:id` catch-all so they aren't
// shadowed by it.
router.get('/me', authenticate, listMyServicePackages);
router.post('/me', authenticate, createServicePackage);
router.put('/me/:id', authenticate, updateServicePackage);
router.delete('/me/:id', authenticate, deleteServicePackage);

// Public browse + per-worker listing. `/user/:username` is declared before the
// `/:id` catch-all so a username can't be mistaken for a package id.
router.get('/', browseServicePackages);
router.get('/user/:username', getPublicServicePackages);

// Public single-package detail (active packages only). Must be last so it
// doesn't shadow the literal routes above.
router.get('/:id', getServicePackage);

export default router;
