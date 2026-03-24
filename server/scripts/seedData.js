const Database = require('better-sqlite3');
const path = require('node:path');

const dbPath = path.resolve(__dirname, '../data/app.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

const questionCount = db.prepare('SELECT COUNT(*) AS count FROM questions').get().count;

if (questionCount === 0) {
  const seedQuestions = [
    ['What is the capital of France?', ['Paris', 'Lyon', 'Marseille', 'Nice'], 0],
    ['2 + 2 equals?', ['3', '4', '5', '22'], 1],
    ['Browser interactivity language?', ['Python', 'JavaScript', 'C', 'Rust'], 1],
    ['Water boiling point at sea level?', ['50 C', '80 C', '100 C', '120 C'], 2],
    ['SQLite is a?', ['File format', 'Relational database', 'Framework', 'OS'], 1],
    ['Version control tool?', ['Git', 'Nginx', 'Docker', 'Redis'], 0],
    ['HTTP method to create resource?', ['GET', 'POST', 'DELETE', 'PATCH'], 1],
    ['TypeScript strict mode improves?', ['Type safety', 'DB size', 'Latency', 'CPU clock'], 0],
  ];

  const insertQuestion = db.prepare('INSERT INTO questions (id, statement) VALUES (?, ?)');
  const insertAlternative = db.prepare(
    'INSERT INTO alternatives (id, question_id, description, is_correct) VALUES (?, ?, ?, ?)'
  );

  db.transaction(() => {
    for (const [statement, options, correctIndex] of seedQuestions) {
      const questionId = crypto.randomUUID();
      insertQuestion.run(questionId, statement);

      options.forEach((description, index) => {
        insertAlternative.run(
          crypto.randomUUID(),
          questionId,
          description,
          index === correctIndex ? 1 : 0
        );
      });
    }
  })();
}

const questionIds = db
  .prepare('SELECT id FROM questions ORDER BY created_at, id')
  .all()
  .map((row) => row.id);

const examCount = db.prepare('SELECT COUNT(*) AS count FROM exams').get().count;

if (examCount < 3 && questionIds.length >= 4) {
  const templates = [
    ['Diagnostic Exam', 'General Knowledge', 'Prof. Ana', '2026-04-01', 'letters', questionIds.slice(0, 4)],
    ['Programming Assessment', 'Web Development', 'Prof. Bruno', '2026-04-08', 'powers-of-2', questionIds.slice(2, 6)],
    ['Final Mock Exam', 'Technology', 'Prof. Carla', '2026-04-15', 'letters', questionIds.slice(4, 8)],
  ];

  const insertExam = db.prepare(
    'INSERT INTO exams (id, title, subject, professor, date, identification_mode) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertExamQuestion = db.prepare(
    'INSERT INTO exam_questions (exam_id, question_id, position) VALUES (?, ?, ?)'
  );

  db.transaction(() => {
    const missing = 3 - examCount;
    for (let i = 0; i < missing; i += 1) {
      const template = templates[examCount + i];
      if (!template) break;

      const [title, subject, professor, date, identificationMode, selectedQuestions] = template;
      const examId = crypto.randomUUID();
      insertExam.run(examId, title, subject, professor, date, identificationMode);

      selectedQuestions.forEach((questionId, position) => {
        insertExamQuestion.run(examId, questionId, position);
      });
    }
  })();
}

const totals = {
  questions: db.prepare('SELECT COUNT(*) AS count FROM questions').get().count,
  alternatives: db.prepare('SELECT COUNT(*) AS count FROM alternatives').get().count,
  exams: db.prepare('SELECT COUNT(*) AS count FROM exams').get().count,
  examQuestions: db.prepare('SELECT COUNT(*) AS count FROM exam_questions').get().count,
};

console.log(JSON.stringify(totals, null, 2));

db.close();