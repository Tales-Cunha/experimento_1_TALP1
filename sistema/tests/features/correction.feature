Feature: Correction report generation from CSV uploads

  As a professor
  I want to upload an answer key CSV and student responses CSV
  So that I receive consistent grading reports in strict or lenient mode

  Scenario: Upload valid answer key and student responses in strict mode
    Given the answer key CSV is:
      """
      exam_number,q1,q2
      1001,AC,B
      1002,B,D
      """
    And the student responses CSV using the default format is:
      """
      exam_number,student_name,cpf,q1,q2
      1001,Ana Souza,11111111111,AC,B
      1002,Bruno Lima,22222222222,B,D
      """
    When I submit both CSV files for correction in "strict" mode
    Then the response status should be 200
    And the response should be a JSON report with 2 entries
    And the report should contain one entry per student

  Scenario: Student with all correct answers scores 10
    Given the answer key CSV is:
      """
      exam_number,q1,q2
      2001,A,C
      """
    And the student responses CSV using the default format is:
      """
      exam_number,student_name,cpf,q1,q2
      2001,Clara Nunes,33333333333,A,C
      """
    When I submit both CSV files for correction in "strict" mode
    Then the report entry for cpf "33333333333" should have finalScore 10

  Scenario: Strict mode gives zero for a question answered with the wrong alternative
    Given the answer key CSV is:
      """
      exam_number,q1,q2
      3001,A,D
      """
    And the student responses CSV using the default format is:
      """
      exam_number,student_name,cpf,q1,q2
      3001,Diego Alves,44444444444,A,C
      """
    When I submit both CSV files for correction in "strict" mode
    Then the report entry for cpf "44444444444" should have finalScore less than 10
    And question "q2" in that entry should have score 0

  Scenario: Lenient mode gives partial credit when one of two correct alternatives is missing
    Given the answer key CSV is:
      """
      exam_number,q1,q2
      4001,AC,B
      """
    And the student responses CSV using the default format is:
      """
      exam_number,student_name,cpf,q1,q2
      4001,Elisa Ramos,55555555555,A,B
      """
    When I submit both CSV files for correction in "lenient" mode
    Then question "q1" in the entry for cpf "55555555555" should have a non-zero score
    And question "q1" in the entry for cpf "55555555555" should have score less than its maximum

  Scenario: Report includes all required identification and scoring fields
    Given the answer key CSV is:
      """
      exam_number,q1,q2
      5001,A,B
      """
    And the student responses CSV using the default format is:
      """
      exam_number,student_name,cpf,q1,q2
      5001,Fernanda Costa,66666666666,A,B
      """
    When I submit both CSV files for correction in "strict" mode
    Then each report entry should include examNumber, studentName and cpf
    And each report entry should include a per-question breakdown
    And each question breakdown should include studentAnswer, correctAnswer and score
    And each report entry should include finalScore

  Scenario: Student CSV with extra columns is accepted and extra data is ignored
    Given the answer key CSV is:
      """
      exam_number,q1,q2
      6001,A,B
      """
    And the student responses CSV with extra columns is:
      """
      Timestamp,Email Address,exam_number,student_name,cpf,q1,q2
      2026-03-24 10:00:00,joao@example.com,6001,João Silva,77777777777,A,B
      """
    When I submit both CSV files for correction in "strict" mode
    Then the response status should be 200
    And the report entry for cpf "77777777777" should have finalScore 10

  Scenario: Google Forms style student CSV is parsed with custom columnMap
    Given the answer key CSV is:
      """
      exam_number,q1,q2
      7001,A,C
      """
    And the student responses CSV in Google Forms format is:
      """
      Timestamp,Email Address,Número da Prova,Nome Completo,CPF,Resposta Q1,Resposta Q2
      2026-03-24 11:00:00,maria@example.com,7001,Maria Lima,88888888888,A,C
      """
    And the correction request includes this columnMap:
      """
      {
        "examNumber": "Número da Prova",
        "studentName": "Nome Completo",
        "cpf": "CPF",
        "q1": "Resposta Q1",
        "q2": "Resposta Q2"
      }
      """
    When I submit both CSV files for correction in "strict" mode
    Then the response status should be 200
    And the report entry for cpf "88888888888" should have finalScore 10

  Scenario: Student row with blank exam number is skipped without validation error
    Given the answer key CSV is:
      """
      exam_number,q1,q2
      8001,A,B
      """
    And the student responses CSV using the default format is:
      """
      exam_number,student_name,cpf,q1,q2
      ,Nina Prado,99999999999,A,B
      8001,Otávio Reis,12121212121,A,B
      """
    When I submit both CSV files for correction in "strict" mode
    Then the response status should be 200
    And the report should not include cpf "99999999999"
    And the report should include cpf "12121212121"

  Scenario: Student row with unknown exam number returns warning and zero score
    Given the answer key CSV is:
      """
      exam_number,q1,q2
      9001,A,B
      """
    And the student responses CSV using the default format is:
      """
      exam_number,student_name,cpf,q1,q2
      9999,Paulo Melo,23232323232,A,B
      """
    When I submit both CSV files for correction in "strict" mode
    Then the response status should be 200
    And the report entry for cpf "23232323232" should have finalScore 0
    And the report entry for cpf "23232323232" should include a non-empty warning

  Scenario: Non-CSV uploads return validation error
    Given the uploaded answer key file is not a CSV
    And the uploaded student responses file is not a CSV
    When I submit both files for correction in "strict" mode
    Then I should receive a 422 Unprocessable Entity error
