# API Reference

Base URL (development): `http://localhost:3000`

## Error response format

All API errors return JSON in this format:

```json
{ "error": "<message>" }
```

---

## 1) GET /api/questions

- **Method:** `GET`
- **Path:** `/api/questions`
- **Description:** Lists all questions with their alternatives.

### Request
- **Params:** none
- **Body:** none

### Response (200)
```ts
type QuestionListItem = {
  id: string;
  statement: string;
  createdAt: string | null;
  alternatives: {
    id: string;
    questionId: string;
    description: string;
    isCorrect: number; // 0 | 1
  }[];
};

type ResponseBody = QuestionListItem[];
```

### Status codes
- `200` OK
- `500` Internal Server Error

### curl example
```bash
curl -X GET http://localhost:3000/api/questions
```

---

## 2) POST /api/questions

- **Method:** `POST`
- **Path:** `/api/questions`
- **Description:** Creates a new question.

### Request
- **Params:** none
- **Body:**
```ts
type RequestBody = {
  statement: string;
  alternatives: {
    description: string;
    isCorrect: boolean | 0 | 1;
  }[];
};
```

### Response (201)
```ts
type ResponseBody = {
  id: string;
  statement: string;
  createdAt: string | null;
  alternatives: {
    id: string;
    questionId: string;
    description: string;
    isCorrect: number; // 0 | 1
  }[];
};
```

### Status codes
- `201` Created
- `422` Validation Error
- `500` Internal Server Error

### curl example
```bash
curl -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -d '{
    "statement": "What is 2 + 2?",
    "alternatives": [
      { "description": "4", "isCorrect": true },
      { "description": "5", "isCorrect": false }
    ]
  }'
```

---

## 3) PUT /api/questions/:id

- **Method:** `PUT`
- **Path:** `/api/questions/:id`
- **Description:** Updates an existing question and replaces its alternatives.

### Request
- **Params:**
```ts
type Params = { id: string }; // question id
```
- **Body:**
```ts
type RequestBody = {
  statement: string;
  alternatives: {
    description: string;
    isCorrect: boolean | 0 | 1;
  }[];
};
```

### Response (200)
```ts
type ResponseBody = {
  id: string;
  statement: string;
  createdAt: string | null;
  alternatives: {
    id: string;
    questionId: string;
    description: string;
    isCorrect: number;
  }[];
};
```

### Status codes
- `200` OK
- `404` Not Found
- `422` Validation Error
- `500` Internal Server Error

### curl example
```bash
curl -X PUT http://localhost:3000/api/questions/<question_id> \
  -H "Content-Type: application/json" \
  -d '{
    "statement": "Updated statement",
    "alternatives": [
      { "description": "Option A", "isCorrect": true },
      { "description": "Option B", "isCorrect": false }
    ]
  }'
```

---

## 4) DELETE /api/questions/:id

- **Method:** `DELETE`
- **Path:** `/api/questions/:id`
- **Description:** Deletes a question.

### Request
- **Params:**
```ts
type Params = { id: string }; // question id
```
- **Body:** none

### Response (204)
- No response body.

### Status codes
- `204` No Content
- `404` Not Found
- `500` Internal Server Error

### curl example
```bash
curl -X DELETE http://localhost:3000/api/questions/<question_id>
```

---

## 5) GET /api/exams

- **Method:** `GET`
- **Path:** `/api/exams`
- **Description:** Lists all exams with linked questions and alternatives.

### Request
- **Params:** none
- **Body:** none

### Response (200)
```ts
type ExamListItem = {
  id: string;
  title: string;
  subject: string;
  professor: string;
  date: string;
  identificationMode: string; // "letters" | "powers-of-2"
  questions: {
    id: string;
    statement: string;
    alternatives: {
      id: string;
      questionId: string;
      description: string;
      isCorrect: number;
    }[];
  }[];
};

type ResponseBody = ExamListItem[];
```

### Status codes
- `200` OK
- `500` Internal Server Error

### curl example
```bash
curl -X GET http://localhost:3000/api/exams
```

---

## 6) POST /api/exams

- **Method:** `POST`
- **Path:** `/api/exams`
- **Description:** Creates an exam from selected question IDs.

### Request
- **Params:** none
- **Body:**
```ts
type RequestBody = {
  title: string;
  subject: string;
  professor: string;
  date: string; // ISO-like date string
  identificationMode: "letters" | "powers-of-2";
  questionIds: string[];
};
```

### Response (201)
```ts
type ResponseBody = {
  id: string;
};
```

### Status codes
- `201` Created
- `422` Validation Error
- `500` Internal Server Error

### curl example
```bash
curl -X POST http://localhost:3000/api/exams \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Midterm",
    "subject": "Math",
    "professor": "Dr. Smith",
    "date": "2026-05-15",
    "identificationMode": "letters",
    "questionIds": ["<q1>", "<q2>"]
  }'
```

---

## 7) PUT /api/exams/:id

- **Method:** `PUT`
- **Path:** `/api/exams/:id`
- **Description:** Updates exam metadata and selected questions.

### Request
- **Params:**
```ts
type Params = { id: string }; // exam id
```
- **Body:**
```ts
type RequestBody = {
  title: string;
  subject: string;
  professor: string;
  date: string;
  identificationMode: "letters" | "powers-of-2";
  questionIds: string[];
};
```

### Response (200)
```ts
type ResponseBody = {
  message: "Exam updated successfully";
};
```

### Status codes
- `200` OK
- `404` Not Found
- `422` Validation Error
- `500` Internal Server Error

### curl example
```bash
curl -X PUT http://localhost:3000/api/exams/<exam_id> \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Midterm Updated",
    "subject": "Math",
    "professor": "Dr. Smith",
    "date": "2026-05-20",
    "identificationMode": "letters",
    "questionIds": ["<q1>", "<q3>"]
  }'
```

---

## 8) DELETE /api/exams/:id

- **Method:** `DELETE`
- **Path:** `/api/exams/:id`
- **Description:** Deletes an exam.

### Request
- **Params:**
```ts
type Params = { id: string }; // exam id
```
- **Body:** none

### Response (204)
- No response body.

### Status codes
- `204` No Content
- `404` Not Found
- `500` Internal Server Error

### curl example
```bash
curl -X DELETE http://localhost:3000/api/exams/<exam_id>
```

---

## 9) POST /api/exams/:id/generate

- **Method:** `POST`
- **Path:** `/api/exams/:id/generate`
- **Description:** Generates a ZIP bundle with exam PDFs and answer-key CSV.

### Request
- **Params:**
```ts
type Params = { id: string }; // exam id
```
- **Body:**
```ts
type RequestBody = {
  count: number; // integer in [1, 200]
};
```

### Response (200)
```ts
type ResponseBody = {
  zipBase64: string; // base64-encoded ZIP
  csv: string;       // answer_key.csv content
};
```

### Status codes
- `200` OK
- `404` Not Found
- `422` Validation Error
- `500` Internal Server Error

### curl example
```bash
curl -X POST http://localhost:3000/api/exams/<exam_id>/generate \
  -H "Content-Type: application/json" \
  -d '{ "count": 2 }'
```

---

## 10) POST /api/correct

- **Method:** `POST`
- **Path:** `/api/correct`
- **Description:** Uploads answer key + student responses CSV files and returns correction report.

### Request
- **Params:** none
- **Body:** `multipart/form-data`
  - `answerKeyCsv`: file (CSV)
  - `studentResponsesCsv`: file (CSV)
  - `mode`: `"strict" | "lenient"`
  - `columnMap` (optional): JSON string

`columnMap` JSON shape:
```ts
type ColumnMap = {
  examNumber: string;
  cpf: string;
  name?: string;
  studentName?: string;
  questions?: string[];
  [key: string]: unknown;
};
```

### Response (200)
```ts
type QuestionCorrectionResult = {
  questionIndex: number;
  studentAnswer: string;
  correctAnswer: string;
  score: number;
};

type StudentCorrectionResult = {
  examNumber: string;
  studentName: string;
  cpf: string;
  questions: QuestionCorrectionResult[];
  finalScore: number;
  warning?: string;
};

type ResponseBody = StudentCorrectionResult[];
```

### Status codes
- `200` OK
- `422` Validation Error
- `500` Internal Server Error

### curl example
```bash
curl -X POST http://localhost:3000/api/correct \
  -F "mode=strict" \
  -F "answerKeyCsv=@./answer_key.csv;type=text/csv" \
  -F "studentResponsesCsv=@./student_responses.csv;type=text/csv"
```
