import { Router, Request, Response, NextFunction } from 'express';
import { ExamRepository } from '../repositories/examRepository';
import { ValidationError } from '../errors';
import { GenerationService } from '../services/generationService';

const router = Router();
const examRepository = new ExamRepository();
const generationService = new GenerationService();

const validateExamData = (body: any) => {
  const { title, subject, professor, date, questionIds } = body;
  if (!title || !subject || !professor || !date) {
    throw new ValidationError('title, subject, professor, and date are required and cannot be empty');
  }
  if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
    throw new ValidationError('At least one questionId is required');
  }
};

const validateGenerateCount = (body: unknown): number => {
  const count = (body as { count?: unknown }).count;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > 200) {
    throw new ValidationError('count must be an integer between 1 and 200');
  }
  return count;
};

// GET / -> findAll()
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const exams = await examRepository.findAll();
    res.json(exams);
  } catch (error) {
    next(error);
  }
});

// GET /:id -> findById(id)
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const exam = await examRepository.findById(id as string);
    res.json(exam);
  } catch (error) {
    next(error);
  }
});

// POST / -> create()
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    validateExamData(req.body);
    const id = await examRepository.create(req.body);
    res.status(201).json({ id });
  } catch (error) {
    next(error);
  }
});

// POST /:id/generate -> create exam copies bundle
router.post('/:id/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = validateGenerateCount(req.body);
    const { zipBuffer, csv } = await generationService.generate(req.params.id as string, count);
    res.json({ zipBase64: zipBuffer.toString('base64'), csv });
  } catch (error) {
    next(error);
  }
});

// PUT /:id -> update()
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    validateExamData(req.body);
    const { id } = req.params;
    await examRepository.update(id as string, req.body);
    res.json({ message: 'Exam updated successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id -> delete()
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
