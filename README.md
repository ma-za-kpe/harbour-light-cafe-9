# Harbour Light Café

> **Demonstration:** this is a demonstration site for a fictional business. Its name, prices, hours and contact details are invented and must not be used.

Live site: https://ma-za-kpe.github.io/harbour-light-cafe-9/

Built and published by Yard Crew from an approved brief. Everything the public
sees is in `site/`.

## Changing your content

Edit the line shown, open a pull request, and the checks below run
automatically.

- Flat white costs 3.20 pounds: `site/index.html` line 66
- Full breakfast costs 9.50 pounds: `site/index.html` line 75
- Lemon drizzle cake costs 3.80 pounds: `site/index.html` line 84
- Open Wednesday to Monday, 8am to 4pm: `site/index.html` line 6
- Address: 3 Quay Street, Whitby: `site/index.html` line 6
- Phone: 01947 600 000: `site/index.html` line 129
- Colours and spacing: the design tokens in `site/styles.css` lines 1–12.

## Checks that protect your site

- `python -m unittest discover -s tests` runs the frozen tests, including
  `tests/test_brief.py`, which come from your approved brief.
- `pre-commit install` once, so the same pinned hooks as CI run on every commit.
- CI also checks the page in a real browser at phone and desktop sizes, with
  automated accessibility checks.
- `tests/` belongs to you (CODEOWNERS): nobody edits it to make a change pass.
  CI and tooling (`.github/`) changes are approved by the crew's platform
  review and must keep every action pinned, the tests running and every job.

## Publishing

Merging to `main` publishes the site to GitHub Pages; each published version is
a tagged release.

## Approving content

Read every price, time and contact detail on the live page before telling
customers about it. The crew states only what your brief gives; anything new
needs your approval first.

## Custom domain

Add your domain under Settings, Pages, Custom domain, then point a DNS CNAME
record at the GitHub Pages address.

## Analytics

No analytics or trackers are installed, so the site collects nothing about
visitors. Adding any is a privacy decision for you to make.

## Maintenance

The site is static: no server, database or secrets to patch. Keep the pinned
tool versions current through reviewed pull requests.
