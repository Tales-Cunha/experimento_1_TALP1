Feature: Questions Management

  As a professor
  I want to manage my question bank
  So that I can use them in my exams

  Background:
    Given a clean database state

  Scenario: Create a valid question with multiple correct alternatives
    When I create a question with the following details:
      | statement    | What is the capital of Brazil? |
      | alternatives | Brasília (correct), Rio de Janeiro (incorrect), São Paulo (correct) |
    Then the question should be successfully created
    And I should be able to retrieve the question with its 3 alternatives

  Scenario: Edit an existing question and its alternatives
    Given a question exists with the statement "Old Statement"
    When I update that question to have:
      | statement    | New Statement |
      | alternatives | Alt 1 (correct), Alt 2 (incorrect) |
    Then the question should reflect the new statement
    And the old alternatives should be replaced by the new ones

  Scenario: Remove an existing question
    Given a question exists with the statement "To be deleted"
    When I delete that question
    Then the question should no longer exist in the system

  Scenario: List all questions
    Given the following questions exist:
      | statement |
      | Question A |
      | Question B |
    When I list all questions
    Then I should receive a list containing "Question A" and "Question B"

  Scenario: Create a question with insufficient alternatives
    When I attempt to create a question with fewer than 2 alternatives
    Then I should receive a 422 Unprocessable Entity error

  Scenario: Create a question without any correct alternative
    When I attempt to create a question where no alternative is marked as correct
    Then I should receive a 422 Unprocessable Entity error

  Scenario: Retrieve a non-existent question
    When I attempt to retrieve a question with a non-existent ID
    Then I should receive a 404 Not Found error
