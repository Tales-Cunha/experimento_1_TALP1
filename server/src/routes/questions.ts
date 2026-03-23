import express, { Router, Request, Response, NextFunction } from 'express';
import { QuestionRepository } from '../repositories/questionRepository';
import { ValidationError } from '../errors';

const router = Router();
const questionRepo = new QuestionRepository();

const validateQuestion = (req: Request, res: Response, next: NextFunction) => {
  const { statement, alternatives } = req.body;

  if (!statement || typeof statement !== 'string' || statement.trim() === '') {
    throw new ValidationError('Statement is required.');
  }

  if (!alternatives || !Array.isArray(alternatives) || alternatives.length < 2) {
    throw new ValidationError('At least two alternatives are required.');
  }

  const hasCorrect = alternatives.some((alt: any) => alt.isCorrect === true || alt.isCorrect === 1);
  if (!hasCorrect) {
    throw new ValidationError('At least one alternative must be marked as correct.');
  }

  next();
};

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const all = await questionRepo.findAll();
    res.json(all);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = await questionRepo.findById(req.params.id as string);
    res.json(q);
  } catch (error) {
    next(error);
  }
});

router.post('/', validateQuestion, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const created = await questionRepo.create(req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', validateQuestion, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await questionRepo.update(req.params.id as string, req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await questionRepo.delete(req.params.id as string);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
