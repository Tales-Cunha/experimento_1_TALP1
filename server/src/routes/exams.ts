import { Router, Request, Response, NextFunction } from 'express';
import { ExamRepository } from '../repositories/examRepository';

const router = Router();
const examRepository = new ExamRepository();

// Get all exams
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const exams = await examRepository.getAll();
    res.json(exams);
  } catch (error) {
    next(error);
  }
});

// Get exam by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const exam = await examRepository.getById(id as string);
    res.json(exam);
  } catch (error) {
    next(error);
  }
});

// Create exam
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = await examRepository.create(req.body);
    res.status(201).json({ id });
  } catch (error) {
    next(error);
  }
});

// Update exam
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await examRepository.update(id as string, req.body);
    res.json({ message: 'Exam updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete exam
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await examRepository.delete(id as string);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Clear exams (for testing)
router.delete('/test/clear', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await examRepository.clearAll();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
