import express from 'express';
import cors from 'cors';
import questionRouter from './routes/questions';
import examRouter from './routes/exams';
import correctionRouter from './routes/correction';
import testRouter from './routes/test';
import { errorHandler } from './middleware/errorHandler';

interface CreateAppOptions {
	nodeEnv?: string;
}

const DEV_ALLOWED_ORIGIN = 'http://localhost:5173';

export function createApp(options: CreateAppOptions = {}): express.Express {
	const app = express();
	const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;

	if (nodeEnv === 'development') {
		app.use(cors({ origin: DEV_ALLOWED_ORIGIN }));
	} else {
		app.use(cors());
	}

	app.use(express.json({ limit: '1mb' }));

	app.use('/api/questions', questionRouter);
	app.use('/api/exams', examRouter);
	app.use('/api/correct', correctionRouter);
	if (nodeEnv === 'test') {
		app.use('/api/test', testRouter);
	}

	app.use(errorHandler);

	return app;
}

const app = createApp();

export default app;
