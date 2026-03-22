import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(path.join(dataDir, 'app.db'));
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite);

// Apply manual schema (CREATE TABLE IF NOT EXISTS) on startup
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    statement TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alternatives (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    description TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES questions(id)
  );

  CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    professor TEXT NOT NULL,
    date TEXT NOT NULL,
    identification_mode TEXT NOT NULL CHECK (identification_mode IN ('letters', 'powers-of-2'))
  );

  CREATE TABLE IF NOT EXISTS exam_questions (
    exam_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY (exam_id, question_id),
    FOREIGN KEY (exam_id) REFERENCES exams(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
  );
`);

const gracefullyShutdown = () => {
  console.log('Closing database connection...');
  sqlite.close();
  process.exit(0);
};

process.on('SIGINT', gracefullyShutdown);
process.on('SIGTERM', gracefullyShutdown);

export default sqlite;
