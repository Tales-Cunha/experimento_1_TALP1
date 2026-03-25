import { Router, Request, Response, NextFunction } from 'express';
import { ExamRepository } from '../repositories/examRepository';
import { QuestionRepository } from '../repositories/questionRepository';
import { GenerationService } from '../services/generationService';
import { ExamService } from '../services/examService';

const router = Router();
const examService = new ExamService(new ExamRepository());
const generationService = new GenerationService(new ExamRepository(), new QuestionRepository());

// GET / -> findAll()
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const exams = await examService.findAll();
    res.json(exams);
  } catch (error) {
    next(error);
  }
});

// GET /:id -> findById(id)
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const exam = await examService.findById(req.params.id as string);
    res.json(exam);
  } catch (error) {
    next(error);
  }
});

// POST / -> create()
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const created = await examService.create(req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

// POST /:id/generate -> create exam copies bundle
router.post('/:id/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { zipBuffer, csv } = await generationService.generate(req.params.id as string, req.body);
    res.json({ zipBase64: zipBuffer.toString('base64'), csv });
  } catch (error) {
    next(error);
  }
});

// PUT /:id -> update()
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await examService.update(req.params.id as string, req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /:id -> delete()
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await examService.delete(req.params.id as string);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Clear exams (for testing)
router.delete('/test/clear', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await examService.clearAll();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
