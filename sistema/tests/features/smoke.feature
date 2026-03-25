Feature: End-to-end smoke workflow

  Scenario: Complete workflow from question creation to strict correction
    Given a clean database state
    And a clean exams state
    When I create 3 smoke questions with 2 alternatives and 1 correct answer each
    And I create a smoke exam using all smoke questions in letter mode
    And I generate 2 copies for the smoke exam
    Then the smoke generation zip should contain exactly 2 PDF files
    And the smoke answer key CSV should have exactly 2 data rows with unique exam numbers
    When I build smoke student responses where Ana answers row 1 correctly and Bruno answers row 2 incorrectly
    And I submit the smoke correction request in strict mode
    Then the smoke report should give Ana final_score 10
    And the smoke report should give Bruno final_score 0