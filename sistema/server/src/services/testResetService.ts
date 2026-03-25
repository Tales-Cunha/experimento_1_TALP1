import sqlite from '../db/db';

const resetAllTablesTransaction = sqlite.transaction(() => {
  sqlite.prepare('DELETE FROM exam_questions').run();
  sqlite.prepare('DELETE FROM alternatives').run();
  sqlite.prepare('DELETE FROM exams').run();
  sqlite.prepare('DELETE FROM questions').run();
});

export class TestResetService {
  resetDatabase(): void {
    resetAllTablesTransaction();
  }
}
