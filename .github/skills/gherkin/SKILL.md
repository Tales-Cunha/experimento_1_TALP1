---
name: "gherkin-declarative-style"
description: Use when Writing Gherkin features and scenarios in a declarative style instead of an imperative style."
tags: ["gherkin", "bdd", "testing", "best-practices"]
---

# Purpose

You help write and refactor Gherkin features and scenarios so they are **declarative** (describing behaviour) instead of **imperative** (describing low-level UI steps).

Declarative features:
- describe **what** the system should do, not **how** it does it
- focus on business behaviour and user value, not clicks and CSS selectors
- act as readable, maintainable living documentation

# When to use this skill

- When creating new Gherkin features or scenarios.
- When refactoring existing features that are too detailed or UI‑driven.
- When step definitions are tightly coupled to UI flows and brittle.
- When scenarios are hard to read because they describe procedures instead of behaviour.

# Core principles

- Prefer declarative steps that express intent and business rules.
- Avoid imperative steps that list technical actions like clicking, typing, and navigating.
- Each step should communicate a single idea at the right abstraction level.
- Hide implementation details in step definitions, not in feature files.

# Imperative vs declarative examples

## Imperative (to be avoided)

These steps over-specify how the user interacts with the UI:

```gherkin
Scenario: View paid and free articles after login
  Given I am on the login page
  When I type "paidPatty@example.com" in the email field
  And I type "validPassword123" in the password field
  And I press the "Submit" button
  Then I see "FreeArticle1" and "PaidArticle1" on the home page
```

Problems:
- focuses on button clicks and specific field names
- exposes test data that is incidental to the behaviour
- becomes brittle if the UI flow or labels change

## Declarative (preferred)

Refactor to express intent instead of procedure:
```gherkin
Scenario: View paid and free articles after login
  Given I am a paying subscriber
  When I sign in with valid credentials
  Then I can see both free and paid articles on the home page
```

Benefits:
- describes business behaviour and expectations
- hides UI details in step definitions
- remains stable even if the UI implementation changes

# How to refactor to declarative style

When you see multiple imperative steps in a row, ask:

- “Is this information essential to the behaviour, or just how we do it?”
- “Would this step text need to change if we rewrote the UI or underlying implementation?”
- “Can I replace several low‑level steps with a single, higher‑level intent?”

Refactoring guidelines:
- Replace sequences of UI actions with a single **When** that captures user intent.
- Replace low‑level **Given** steps (“I open the browser”, “I navigate to…”) with domain preconditions (“there is a published exam”, “I am a registered teacher”).
- Keep **Then** focused on observable outcomes that matter to the user or business.

# Step-writing rules

- **Given**: describe preconditions and state in business terms, not navigation or clicks.
- **When**: describe the meaningful action the user takes (e.g. “submits an exam”, “grades all responses”), not every interaction detail.
- **Then**: describe externally visible results and business rules, not internal flags or UI implementation details.
- Use **And** / **But** to keep scenarios readable, but limit the total number of steps by being more declarative.

# Good practices checklist

When writing or reviewing a scenario, ensure that:

- Steps describe **behaviour** and **intent**, not test scripts.
- There are no references to low-level UI artefacts (CSS selectors, exact button IDs, raw URLs) unless they truly are part of the business rules.
- Data values in steps are meaningful to the domain, not arbitrary technical details.
- The same scenario would still be valid if the UI was rebuilt, as long as the behaviour stayed the same.
- Scenarios are vivid, concise, and easy to understand for non-technical stakeholders.

If any of these fail, refactor the scenario to be more declarative.
