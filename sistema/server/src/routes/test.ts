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

router.get('/panic', (req: Request, res: Response, next: NextFunction) => {
  try {
    throw new Error('Forced panic for error-handler tests');
  } catch (error) {
    next(error);
  }
});

export default router;
