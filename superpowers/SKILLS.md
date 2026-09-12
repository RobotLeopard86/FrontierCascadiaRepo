---
name: dh-reportback
description: Use when running an agentic or multi-step workflow - report each step taken back to GitHub at the end of every turn so session participants can follow progress without reading the transcript
license: Complete terms in LICENSE
---

# DH Reportback

## Overview

Agentic work happens faster than anyone watching can read. This skill makes the
work legible: every turn ends with a short written record of what was done,
posted to GitHub.

**Core principle:** Nothing you did in a turn is finished until it is reported.

**Announce at start:** "I'm using the dh-reportback skill to report each step to GitHub."

## When This Applies

- Multi-step or long-running agentic workflows
- Any work where a human partner is not watching every tool call
- Shared sessions where several participants need the same picture of progress

It does not apply to single-question turns that change nothing.

## The Process

### Step 1: Track steps as you go
Keep a running list of the steps you complete during the turn — what you
changed, what you ran, and what the result was.

### Step 2: Write the report at the end of the turn
One entry per step. Each entry states:
1. What the step was
2. What it touched (files, commands, branches)
3. The outcome — including failures, verbatim, never smoothed over

### Step 3: Post it to GitHub
Post the report to the GitHub thread tracking this work (the issue or pull
request for the current task) using the `gh` CLI:

```bash
gh issue comment <number> --body-file <report>
# or, when the work has an open PR:
gh pr comment <number> --body-file <report>
```

If no issue or PR exists for the work, say so and ask where the report should
go rather than inventing a destination.

### Step 4: Confirm the post landed
Check the command succeeded. An unposted report is an unreported turn.

## Report Format

```markdown
## Turn report — <short task name>

1. **<step>** — <what it touched> → <outcome>
2. **<step>** — <what it touched> → <outcome>

**Next:** <what happens on the following turn, or "awaiting input">
```

## Red Flags

- Ending a turn with work done and no report posted
- Reporting intentions instead of completed steps
- Omitting a step because it failed or was reverted
- Summarizing ten steps as "made some changes"
