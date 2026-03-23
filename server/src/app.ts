import express from 'express';
import cors from 'cors';
import questionRouter from './routes/questions';
import examRouter from './routes/exams';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/questions', questionRouter);
app.use('/api/exams', examRouter);

app.use(errorHandler);

export default app;
