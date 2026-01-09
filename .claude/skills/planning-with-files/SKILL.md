---
name: planning-with-files
description: Implements Manus-style file-based planning for complex tasks. Creates task_plan.md, findings.md, and progress.md. Use when starting complex multi-step tasks, research projects, or any task requiring >5 tool calls.
allowed-tools: Read, Write, Glob, Grep, Bash
---

# Planning with Files

## Overview

This skill implements a structured planning approach using three key files to manage complex tasks:
- **task_plan.md**: High-level task breakdown and strategy
- **findings.md**: Discoveries and research results
- **progress.md**: Execution progress and updates

## When to Use

Use this skill for:
- Complex multi-step tasks
- Research projects requiring investigation
- Tasks with more than 5 planned tool calls
- Projects needing clear documentation of progress

## Instructions

When working on a complex task:

1. Create `task_plan.md` with your task breakdown
2. Create `findings.md` to track discoveries
3. Create `progress.md` to document execution steps
4. Update files as you work through the task
5. Reference these files throughout the conversation

## File Formats

### task_plan.md

```markdown
# Task Plan

## Overview
[Brief description of the task]

## Goals
- Goal 1
- Goal 2
- Goal 3

## Strategy
[How you'll approach this]

## Steps
1. Step 1
2. Step 2
3. Step 3
```

### findings.md

```markdown
# Findings

## Research Results
- Finding 1
- Finding 2

## Discoveries
- Discovery 1
- Discovery 2

## Questions
- Unanswered question 1
- Unanswered question 2
```

### progress.md

```markdown
# Progress

## Status
Current phase: [phase name]

## Completed
- [x] Completed task 1
- [x] Completed task 2

## In Progress
- [ ] Current task 1
- [ ] Current task 2

## Next Steps
1. Next step 1
2. Next step 2
```

## Best Practices

- Keep task_plan.md high-level and strategic
- Update findings.md as you discover new information
- Update progress.md after completing each significant step
- Reference these files in your responses to maintain context
- Store planning files in a `.planning/` directory to keep them organized
