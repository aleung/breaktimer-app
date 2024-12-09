# Changelog

## Build 2024-12-09

Fix:

- Break popup when computer is waked up from sleep. Idle reset doesn't work.

## Build 2024-12-06

New feature:

- Subtract idle time from break popup duration
  - If the PC has been idle before break popup, shorten the the break length by subtract the idle time. It only takes effect when idle reset is enabled.

Other changes:

- Improve the logic for idle reset
- Port some fixes from BreakTimer origin v1.3.2 (see git log)
- Update dependencies

## Build 2024-12-05

New feature:

- Dynamic tray icon and tool tip for remaining time to next break (implement [BreakTimer origin #93](https://github.com/tom-james-watson/breaktimer-app/issues/93) and [BreakTimer origin #126](https://github.com/tom-james-watson/breaktimer-app/issues/126))

Remove features not in high value to reduce code complexity:

- Working hour - we should not stay on computer too long no matter for work or not
- Idle reset notification

Other changes:

- Unify the idle reset duration calculation for computer in idle, lock and sleep states.
- Use UNIX epoch to avoid issue during TZ/DST switching (fix [BreakTimer origin #215](https://github.com/tom-james-watson/breaktimer-app/issues/215))
- Add logs for debugging

Baseline: BreakTimer origin 1.3.0-dev
