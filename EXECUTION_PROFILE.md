# EXECUTION_PROFILE.md

## Purpose

Control Codex execution behavior.

This document focuses on efficiency, exploration control, and validation requirements.

---

# Default Mode

Preferred workflow:

Analysis
→ Planning
→ Implementation
→ Validation
→ Final Report

Avoid:

Analysis
→ Re-analysis
→ Re-analysis
→ Re-analysis
→ Implementation

---

# Exploration Budget

Before implementation:

* Maximum 10 file reads
* Maximum 5 searches
* Maximum 2 analysis cycles

When confidence exceeds 80%:

STOP exploring
START implementation

Avoid:

* Reading the same file repeatedly
* Searching for already confirmed information
* Exploring unrelated modules
* Expanding investigation beyond task scope

Focus only on files likely to be modified.

---

# Implementation Budget

Prefer:

* Modifying existing code
* Existing stores
* Existing services
* Existing components
* Existing APIs

Avoid:

* Creating new frameworks
* Creating new architectural layers
* Introducing unnecessary abstractions
* Large-scale refactoring

Unless explicitly requested.

---

# Monorepo Rules

Current packages:

* panel-web
* panel-bff
* panel-shared
* panel-desktop
* panel-npm
* panel-vscode
* fake-hermes
* license-server
* license-web

Only modify packages directly related to the requirement.

Do not touch unrelated packages.

---

# Hermes-Specific Rules

Respect AGENTS.md conventions.

Always remember:

* ESM only
* .js extension on TS imports
* state.db is read-only
* SSE must continue proxying through BFF
* Hermes CLI calls require timeoutMs
* Components should remain reasonably small
* Business logic belongs in stores/services

---

# Validation Requirements

Required:

```bash
pnpm --filter @hermes-panel/bff typecheck
pnpm --filter @hermes-panel/web typecheck
pnpm test
```

Optional:

```bash
pnpm build
```

Only run when relevant.

---

# Completion Criteria

A task is complete only if:

* Feature implemented
* Typecheck passes
* Tests pass
* No broken imports
* No obvious regression
* No TODO placeholders left behind

---

# Reporting Format

At completion output:

## Feature Summary

## Modified Files

## Validation Results

## Remaining Risks

## Future Improvements
