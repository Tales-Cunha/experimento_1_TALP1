import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { CorrectionService } from '../services/correctionService';

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

router.post(
  '/',
  upload.fields([
    { name: 'answerKeyCsv', maxCount: 1 },
    { name: 'studentResponsesCsv', maxCount: 1 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = getUploadedFiles(req);
      const results = correctionService.correctFromUpload({
        answerKeyFile: files.answerKeyCsv?.[0],
        studentResponsesFile: files.studentResponsesCsv?.[0],
        mode: req.body.mode,
        columnMap: req.body.columnMap,
      });

      res.status(200).json(results);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
