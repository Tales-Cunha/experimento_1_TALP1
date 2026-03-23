Feature: Exams Management

  As a professor
  I want to assemble exams from my question bank
  So that I can evaluate my students

  Background:
    Given a clean database state
    And the following questions exist:
      | statement  |
      | Question 1 |
      | Question 2 |
      | Question 3 |
    And a clean exams state

  Scenario: Create an exam with letter identification and selected questions
    When I create an exam with the following details:
      | title               | Midterm Algebra |
      | subject             | Mathematics     |
      | professor           | Dr. Smith       |
      | date                | 2026-05-15      |
      | identification_mode | letters         |
      | questions           | Question 1, Question 2 |
    Then the exam should be successfully created
    And I should be able to retrieve the exam with its 2 questions

  Scenario: Create an exam with power-of-2 identification
    When I create an exam with the following details:
      | title               | Final Calculus  |
      | subject             | Mathematics     |
      | professor           | Dr. Jones       |
      | date                | 2026-06-20      |
      | identification_mode | powers-of-2     |
      | questions           | Question 1      |
    Then the exam should be successfully created
    And the exam identification mode should be "powers-of-2"

  Scenario: Edit an exam's subject and swap a question
    Given an exam exists with the title "Weekly Quiz" and questions "Question 1, Question 2"
    When I update that exam to have:
      | subject             | Advanced Algebra |
      | questions           | Question 1, Question 3 |
    Then the exam subject should be "Advanced Algebra"
    And the exam should contain "Question 3" instead of "Question 2"

  Scenario: Remove an existing exam
    Given an exam exists with the title "Temporary Exam"
    When I delete that exam
    Then the exam should no longer exist in the system

  Scenario: List all exams
    Given the following exams exist:
      | title  | subject |
      | Exam A | Biology |
      | Exam B | Physics |
    When I list all exams
    Then I should receive a list containing "Exam A" and "Exam B"

  Scenario: Create an exam with no questions
    When I attempt to create an exam with no questions selected
    Then I should receive a 422 Unprocessable Entity error

  Scenario: Create an exam with a non-existent question reference
    When I attempt to create an exam referencing a non-existent question ID
    Then I should receive a 422 Unprocessable Entity error
