import { Router } from 'express';
import { seedDemo, clearDemo, isDemoMode } from '../db/seed-demo.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({ enabled: isDemoMode() });
});

router.post('/enable', (_req, res) => {
  const counts = seedDemo();
  res.json({ enabled: true, seeded: counts });
});

router.post('/disable', (_req, res) => {
  clearDemo();
  res.json({ enabled: false });
});

export default router;
