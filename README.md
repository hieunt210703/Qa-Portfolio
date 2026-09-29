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

The website reads its editable content from `content/portfolio.json`. Publishing through the admin page commits that file together with updated QA artifacts, so the website and repository evidence stay aligned.

## Run locally

Requirements: Node.js 22 or later.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Update content

Open `/admin/` on the running website. Edit the introduction, experience, projects, test cases, execution results, strategy, defect, test data, or English/Vietnamese copy. Draft changes are saved in the current browser. Use **Preview draft** to inspect them on the website before publishing, and **Download JSON** to keep a backup.

To publish, create a fine-grained GitHub personal access token limited to this repository with **Contents: Read and write** permission. Enter it only in the Publish dialog. The token is used for that request and is not saved. Publishing makes one commit containing `content/portfolio.json` and the corresponding Markdown/CSV QA artifacts. The existing GitHub Pages workflow then builds the public website. The admin page itself is reachable by visitors; only a valid repository token can publish.

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
