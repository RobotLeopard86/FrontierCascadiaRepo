---
name: dh-reportback
description: Use when running an agentic or multi-step workflow - dispatch a background reporter subagent to post each completed step to GitHub on the fly, so session participants see live progress without the main thread stopping to write updates
license: Complete terms in LICENSE
---

# DH Reportback

## Overview

Agentic work moves faster than anyone watching can read. This skill makes the
work legible without slowing it down: a **reporter subagent** posts progress to
GitHub while the main thread keeps building.

**Core principle:** Reporting is delegated, never deferred. You do the work; the
reporter publishes it.

**Announce at start:** "I'm using the dh-reportback skill to report progress to GitHub via a background reporter agent."

## When This Applies

**Use when:**
- Multi-step or long-running agentic workflows
- A human partner is not watching every tool call
- Shared sessions where several participants need the same picture of progress

**Don't use when:**
- A single-question turn that changes nothing
- No GitHub issue or PR tracks the work (ask where reports go first)

## Why a Subagent

Posting to GitHub inline costs the main thread its momentum and its context: `gh`
invocations, API errors, retries, and comment bodies all land in the transcript
you are trying to keep clear for the actual task. A subagent runs in the
background, keeps its tool output out of your context, and cannot stall your
work — if it fails, it fails beside you, not in front of you.

## The Process

### Step 1: Open the reporter at the start of the workflow

Dispatch one reporter with the Agent tool. It starts cold with no session
history, so hand it everything it needs:

```
Agent({
  description: "GitHub progress reporter",
  subagent_type: "general-purpose",
  model: "haiku",
  prompt: "You are the progress reporter for <task>. Post updates to <repo> <issue|PR> #<number>
           using `gh issue comment <number> --body-file <file>` (or `gh pr comment`).
           Post exactly the report body I send you, verbatim, as one comment.
           Confirm the comment URL back to me. Do not edit the repo, do not run tests,
           do not interpret the work — you only publish."
})
```

Note the agent's name or ID from the result. That is the address for every later
update.

### Step 2: Report on the fly, one dispatch per milestone

As soon as a step completes — not at the end of the turn — send it to the
existing reporter:

```
SendMessage({ to: "<reporter name>", message: "<report entry>" })
```

Reusing the same reporter keeps the running thread of what has already been
posted. A fresh `Agent` call starts over with no memory of prior updates, so
only spawn again if the reporter has exited.

### Step 3: Keep working — do not wait

The reporter runs in the background. Continue the task immediately. Its
completion notification arrives on its own; until it does, you do not know the
comment landed. **Never write or predict that notification yourself**, and never
claim a report was posted before the reporter says so.

### Step 4: Close out each turn

Before ending a turn, confirm every completed step has been handed to the
reporter. If a notification reported a failed post, say so in-channel and
re-send that entry rather than dropping it.

## What Each Entry Contains

1. What the step was
2. What it touched — files, commands, branches
3. The outcome, including failures verbatim, never smoothed over

```markdown
## Progress — <short task name>

1. **<step>** — <what it touched> → <outcome>
2. **<step>** — <what it touched> → <outcome>

**Next:** <what happens next, or "awaiting input">
```

## Red Flags

- Running `gh` yourself mid-task instead of dispatching the reporter
- Batching a whole session into one end-of-run comment
- Saying "posted to GitHub" before the reporter's notification confirms it
- Spawning a new reporter every turn, so each one re-posts from zero
- Blocking on the reporter, or polling it, instead of continuing the work
- Letting the reporter touch the repo, the branch, or the tests
- Omitting a step because it failed or was reverted
