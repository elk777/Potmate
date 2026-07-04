# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

<!--
Document your project's quality standards here.

Questions to answer:
- What patterns are forbidden?
- What linting rules do you enforce?
- What are your testing requirements?
- What code review standards apply?
-->

(To be filled by the team)

---

## Forbidden Patterns

<!-- Patterns that should never be used and why -->

- Desktop pet overlays must not resize the native transparent window when a panel opens, changes tabs, or changes content height. Keep the pet window stable; constrain the panel inside the current viewport with fixed anchors, `max-height`, and internal scrolling.

---

## Required Patterns

<!-- Patterns that must always be used -->

- Before shipping a desktop pet overlay or resize interaction, verify small-window boundaries such as 220x325 and 320x520. Confirm the viewport size stays unchanged for panel open/close, popovers remain inside the viewport, and height grips grow upward from a fixed bottom anchor without moving the pet stage.

---

## Testing Requirements

<!-- What level of testing is expected -->

(To be filled by the team)

---

## Code Review Checklist

<!-- What reviewers should check -->

(To be filled by the team)
