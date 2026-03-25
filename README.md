# Exam Creation and Correction Platform

## 1) Project overview
This repository contains a web-based platform for creating question banks and exams, generating randomized PDF exam copies with answer keys, and correcting student submissions from CSV files. The main application lives in the `sistema/` workspace and is split into a React + TypeScript client and a Node + Express + TypeScript server backed by SQLite.

## 2) Prerequisites
- Node.js: **20.x** (recommended)
- npm: **10.x** (recommended)

## 3) Installation
From the project root, install dependencies:

`npm install`

> Note: the runnable app workspace is `sistema/`.

## 4) Running in development
Start development mode with:

`npm run dev`

This runs:
- Client on `:5173`
- Server on `:3000`

## 5) Running the test suite
Run:

`npm test`

## 6) Feature summary
- **Question management**: create, list, edit, and delete questions and alternatives.
- **Exam management**: create, list, edit, and delete exams linked to selected questions.
- **PDF generation**: generate multiple individualized exam PDFs plus an answer-key CSV.
- **Correction**: upload answer-key and student-response CSV files and receive grading reports.

## 7) CSV formats
- **Answer key CSV**: `exam_number, q1, q2, ...`
  - One row per individual generated exam copy.
- **Student responses CSV**: `exam_number, student_name, cpf, q1, q2, ...`
  - One row per student.
  - Answers are either letter combinations (for letter mode) or numeric sums (for powers-of-2 mode).

## 8) Repository structure
- `.github/`: repository automation and project skills/config used in development workflows.
- `exame/`: assessment artifacts and CSV datasets used for experiments and reference material.
- `node_modules/`: installed dependencies at the repository level.
- `sistema/`: main application workspace (client, server, tests, E2E setup, and data).
