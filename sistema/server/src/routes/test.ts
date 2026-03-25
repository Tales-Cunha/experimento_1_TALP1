import { Router, Request, Response, NextFunction } from 'express';
import { TestResetService } from '../services/testResetService';

const router = Router();
const testResetService = new TestResetService();

router.delete('/reset', (req: Request, res: Response, next: NextFunction) => {
  try {
    testResetService.resetDatabase();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
