---
name: Workspace lockfile review
description: Review pnpm lockfile changes for unrelated peer-resolution churn when adding a workspace dependency.
---

When updating one workspace dependency, verify that the lockfile diff is limited to that dependency's importer, package resolution, and snapshot entries.

**Why:** pnpm can refresh stale peer-resolution snapshots for unrelated workspaces during lockfile generation, creating noisy or unintended dependency changes.

**How to apply:** Compare the lockfile diff against the requested package change before validation; restore unrelated peer snapshot changes rather than bundling them into the task.