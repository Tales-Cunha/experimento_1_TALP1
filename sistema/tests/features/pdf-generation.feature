Feature: Exam PDF and Answer Key Generation

  As a professor
  I want to generate multiple copies of an exam with an answer key
  So that I can distribute them to students and grade them efficiently

  Background:
    Given a clean database state
    And the following questions exist:
      | statement  |
      | Question 1 |
      | Question 2 |
    And a clean exams state

  Scenario: Generate multiple copies of an exam in letter mode
    Given an exam exists with the title "Math Quiz" and questions "Question 1, Question 2"
    And the exam identification mode is "letters"
    When I request to generate 2 copies of the "Math Quiz" exam
    Then the response should be a zip archive
    And the archive should contain exactly 2 PDF files
    And the archive should contain exactly 1 CSV file
    And the CSV file should have a header row and 2 data rows
    And each data row in the CSV should start with a unique exam number
    And each data row in the CSV should have 2 answer columns
    And the answers in the CSV should be non-empty strings of letters

  Scenario: Generate multiple copies of an exam in power-of-2 mode
    Given an exam exists with the title "Physics Test" and questions "Question 1"
    And the exam identification mode is "powers-of-2"
    When I request to generate 2 copies of the "Physics Test" exam
    Then the CSV answers should be non-empty numeric strings

  Scenario: Attempt to generate copies for a non-existent exam
    When I request to generate 5 copies of a non-existent exam ID
    Then I should receive a 404 Not Found error

  Scenario: Attempt to generate an invalid number of copies (zero)
    Given an exam exists with the title "Valid Exam"
    When I request to generate 0 copies of the "Valid Exam" exam
    Then I should receive a 422 Unprocessable Entity error

  Scenario: Attempt to generate an invalid number of copies (too many)
    Given an exam exists with the title "Valid Exam"
    When I request to generate 201 copies of the "Valid Exam" exam
    Then I should receive a 422 Unprocessable Entity error
