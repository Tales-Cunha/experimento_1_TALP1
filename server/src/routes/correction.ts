import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ValidationError } from '../errors';
import { CorrectionService, CorrectionColumnMap, CorrectionMode } from '../services/correctionService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const correctionService = new CorrectionService();

type UploadFields = {
  answerKeyCsv?: Express.Multer.File[];
  studentResponsesCsv?: Express.Multer.File[];
};

function getUploadedFiles(req: Request): UploadFields {
  return (req.files ?? {}) as UploadFields;
}

function isCsvFile(file: Express.Multer.File): boolean {
  const mimetype = file.mimetype.toLocaleLowerCase();
  const filename = file.originalname.toLocaleLowerCase();

  if (mimetype === 'text/csv') {
    return true;
  }

  if (mimetype === 'application/octet-stream' && filename.endsWith('.csv')) {
    return true;
  }

  return false;
}

function parseMode(rawMode: unknown): CorrectionMode {
  if (rawMode === 'strict' || rawMode === 'lenient') {
    return rawMode;
  }

  throw new ValidationError('mode must be either "strict" or "lenient"');
}

function parseColumnMap(rawColumnMap: unknown): CorrectionColumnMap | undefined {
  if (rawColumnMap === undefined || rawColumnMap === null || rawColumnMap === '') {
    return undefined;
  }

  if (typeof rawColumnMap !== 'string') {
    throw new ValidationError('columnMap must be a JSON string when provided');
  }

  try {
    return JSON.parse(rawColumnMap) as CorrectionColumnMap;
  } catch {
    throw new ValidationError('columnMap must be valid JSON');
  }
}

router.post(
  '/',
  upload.fields([
    { name: 'answerKeyCsv', maxCount: 1 },
    { name: 'studentResponsesCsv', maxCount: 1 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = getUploadedFiles(req);
      const answerKeyFile = files.answerKeyCsv?.[0];
      const studentResponsesFile = files.studentResponsesCsv?.[0];

      if (!answerKeyFile || !studentResponsesFile) {
        throw new ValidationError('Both answerKeyCsv and studentResponsesCsv files are required');
      }

      if (!isCsvFile(answerKeyFile) || !isCsvFile(studentResponsesFile)) {
        throw new ValidationError('Both uploaded files must be CSV');
      }

      const mode = parseMode(req.body.mode);
      const columnMap = parseColumnMap(req.body.columnMap);

      const results = correctionService.correct(
        answerKeyFile.buffer.toString('utf-8'),
        studentResponsesFile.buffer.toString('utf-8'),
        mode,
        columnMap,
      );

      res.status(200).json(results);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
