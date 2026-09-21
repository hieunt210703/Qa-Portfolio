# Hieu NT — QA Portfolio

A practical manual QA portfolio presented as an interactive static website. The site turns the repository's test artifacts into a searchable case explorer, execution dashboard, test strategy, defect case study, and reusable test-data view.

## Live site

GitHub Pages: <https://hieunt210703.github.io/Qa-Portfolio/>

## Portfolio artifacts

- `TEST_PLAN.md` — scope, objectives, approach, entry/exit criteria, and risks
- `TEST_CASES.md` / `TEST_CASES.csv` — smoke, functional, and regression cases
- `SAMPLE_TEST_EXECUTION_REPORT.csv` — recorded execution results
- `BUG_REPORT_TEMPLATE.md` — reusable defect template with a worked example
- `test_data.csv` — reusable form-testing data
- `CHECKLIST.md` — manual execution checklist

The website data is generated from these Markdown and CSV files during each build, so artifact updates stay synchronized with the presentation layer.

## Run locally

Requirements: Node.js 22 or later.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Quality checks

```bash
npm test
npm run lint
npm run build
```

The production build is fully static. Pushes to `main` trigger the GitHub Pages deployment workflow.

## Roadmap

- Add Playwright smoke and regression automation
- Run browser tests in GitHub Actions
- Attach screenshots and network evidence to defect case studies
- Expand accessibility and cross-browser coverage

## Repository

Maintained by [hieunt210703](https://github.com/hieunt210703). Licensed under the MIT License.
