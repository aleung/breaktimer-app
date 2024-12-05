# Changelog

## Build 2024-12-06

Other changes:

- Port some fixes from BreakTimer origin v1.3.2 (see git log)
- Update depenencies

## Build 2024-12-05

New feature:

- Dynamic tray icon and tool tip for remaining time to next break (implement [BreakTimer origin #93](https://github.com/tom-james-watson/breaktimer-app/issues/93) and [BreakTimer origin #126](https://github.com/tom-james-watson/breaktimer-app/issues/126))

Remove features not in high value to reduce code complexity:

- Working hour - we should not stay on computer too long no matter for work or not
- Idle reset notification

Other changes:

- Add logs for debugging
- Use UNIX epoch to avoid issue during TZ/DST switching (fix [BreakTimer origin #215](https://github.com/tom-james-watson/breaktimer-app/issues/215))
- Unify the idle reset duration calculation for computer in idle, lock and sleep states.

Baseline: BreakTimer origin 1.3.0-dev
