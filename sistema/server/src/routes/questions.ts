import { Router, Request, Response, NextFunction } from 'express';
import { QuestionRepository } from '../repositories/questionRepository';
import { QuestionService } from '../services/questionService';

const router = Router();
const questionService = new QuestionService(new QuestionRepository());

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const all = await questionService.findAll();
    res.json(all);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = await questionService.findById(req.params.id as string);
    res.json(q);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const created = await questionService.create(req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await questionService.update(req.params.id as string, req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await questionService.delete(req.params.id as string);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
