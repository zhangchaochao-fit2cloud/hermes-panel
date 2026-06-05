# AGENT_WORKFLOW.md

## Purpose

Define how Codex should execute tasks in this repository.

This document controls workflow.

AGENTS.md provides project context.
EXECUTION_PROFILE.md provides execution constraints.

---

# Phase 1 — Requirement Analysis

Before coding:

1. Read the requirement
2. Identify affected features
3. Identify impacted packages
4. Identify impacted files
5. Identify API changes
6. Identify shared type changes
7. Identify validation requirements

Output:

* Feature Breakdown
* Impacted Packages
* Impacted Files
* Risks

Do NOT write code during this phase.

---

# Phase 2 — Planning

For each feature:

* Backend changes
* Frontend changes
* Shared type changes
* Data model changes
* API changes

Output:

* Implementation Plan
* File Change Plan

Do NOT perform unrelated refactoring.

---

# Phase 3 — Implementation

Implement features incrementally.

Rules:

* Reuse existing architecture
* Reuse existing stores
* Reuse existing services
* Reuse existing DTOs/types
* Minimize changed files
* Preserve backward compatibility whenever possible

Avoid:

* Large refactors
* New abstractions without clear benefit
* Rewriting working code

Output:

* Modified Files
* Change Summary

---

# Phase 4 — Validation

Required validation:

## Backend

* TypeScript typecheck
* Existing tests

## Frontend

* vue-tsc
* Existing tests

## Functional

Verify:

* Happy path
* Error path
* Loading state
* Empty state

Output:

* Validation Results

---

# Phase 5 — Final Report

Output:

## Feature Summary

## Modified Files

## API Changes

## Validation Results

## Risks

## Follow-up Improvements

Task is not complete until validation passes.
