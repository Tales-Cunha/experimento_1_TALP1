import express from 'express';
import cors from 'cors';
import questionRouter from './routes/questions';
import examRouter from './routes/exams';
import correctionRouter from './routes/correction';
import testRouter from './routes/test';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/questions', questionRouter);
app.use('/api/exams', examRouter);
app.use('/api/correct', correctionRouter);
if (process.env.NODE_ENV === 'test') {
	app.use('/api/test', testRouter);
}

app.use(errorHandler);

export default app;
