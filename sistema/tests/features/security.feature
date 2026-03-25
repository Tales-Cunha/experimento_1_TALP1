Feature: Server security hardening

  As a platform maintainer
  I want server-side input and transport safeguards
  So that malformed or unsafe requests are rejected consistently

  Background:
    Given a clean database state

  Scenario: Question payload strings are trimmed before persistence
    When I create a question with the following details:
      | statement    |   What is 2 + 2?   |
      | alternatives |   Four (correct),  Five (incorrect)   |
    Then the question should be successfully created
    And the created question statement should be "What is 2 + 2?"
    And the created question alternative 1 should be "Four"
    And the created question alternative 2 should be "Five"

  Scenario: Exam payload strings are trimmed before persistence
    Given the following questions exist:
      | statement  |
      | Question 1 |
    And a clean exams state
    When I create an exam with the following details:
      | title               |   Midterm Algebra   |
      | subject             |   Mathematics   |
      | professor           |   Dr. Smith   |
      | date                |   2026-05-15   |
      | identification_mode |   letters   |
      | questions           | Question 1 |
    Then the exam should be successfully created
    And the created exam field "title" should be "Midterm Algebra"
    And the created exam field "subject" should be "Mathematics"
    And the created exam field "professor" should be "Dr. Smith"
    And the created exam field "date" should be "2026-05-15"
    And the created exam field "identificationMode" should be "letters"

  Scenario: Request body larger than 1MB is rejected
    When I submit a JSON payload larger than 1MB to "POST" "/api/questions"
    Then the response status should be 413

  Scenario: Development CORS allows only localhost frontend origin
    When I call "GET" "/api/questions" with Origin "http://localhost:5173" in development mode
    Then the CORS allow origin header should be "http://localhost:5173"
    When I call "GET" "/api/questions" with Origin "http://evil.local" in development mode
    Then the CORS allow origin header should not be "http://evil.local"

  Scenario: CSV validation returns clear message for invalid MIME and extension
    Given the uploaded answer key file is not a CSV
    And the uploaded student responses file is not a CSV
    When I submit both files for correction in "strict" mode
    Then I should receive a 422 Unprocessable Entity error
    And the error message should mention "CSV"
