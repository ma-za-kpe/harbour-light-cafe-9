# Working on this site

This repository was created and is published by Yard Crew's trusted delivery
code. People and agents who change it follow the same rules.

- **The tests are the acceptance contract.** `tests/` belongs to the owner
  (CODEOWNERS). Never edit it to make a change pass. CI and tooling
  (`.github/`) changes need the platform review's approval and keep every
  action pinned, the tests running and every job.
- **Test first.** `tests/test_brief.py` is generated from the approved brief and
  fails until the page meets it. Run `python -m unittest discover -s tests`
  before and after a change, and keep the pinned pre-commit hooks installed
  (`pre-commit install`); CI runs the same hooks.
- **Checked in a real browser.** CI also runs `tests/browser/qa.mjs` at phone
  and desktop sizes: no overflow, keyboard focus, reduced motion and no axe
  WCAG 2.1 AA violations. Screenshots are kept for 7 days as review evidence.
- **Static only.** Everything in `site/` is public. No scripts, keys, trackers
  or server code. Use `%BASE%` for local links so the site works under its path.
- **Accessible by default.** One `h1`, header, main and footer landmarks, alt
  text, visible focus, sufficient contrast, reduced-motion support.
- **Clean up after yourself.** Keep files small and the repository lean: no
  build output, caches or large binaries in Git; CI keeps only the QA
  screenshots, for 7 days.
- **Evidence over claims.** A change is done when the tests pass and the
  published page shows its release marker, not when it looks finished.
- **Publishing is verified.** Merging to `main` publishes the site, and a
  release counts only once the live page shows it.
