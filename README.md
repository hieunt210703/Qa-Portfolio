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

The public portfolio stays on GitHub Pages. `/admin/` there redirects to the owner-only admin hosted on Sites. Sign in with the GitHub account allowed by `ADMIN_GITHUB_LOGIN`. **Save draft online** stores content in the admin database without changing the public site. **Publish** saves the latest edit, commits `content/portfolio.json` and the matching Markdown/CSV artifacts to `main`, and lets the existing GitHub Pages workflow rebuild the public site. No token is entered on each publish. A browser-local copy is kept for preview and recovery, and JSON import/export remains available.

Local `npm run dev` supports editing and previewing a browser-local draft. Cloud save and GitHub sign-in are available on the hosted admin, where the Worker API and database are installed.

### One-time GitHub App setup

1. The Sites runtime needs `ADMIN_GITHUB_LOGIN` (the allowed GitHub username), `ADMIN_OWNER_EMAIL` (the Sites owner's email), and `SESSION_KEY` (32 random bytes encoded as base64url). The email and key are stored as Sites secrets. Generate a new key locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"` if this site is recreated.
2. Open the owner-only [online admin](https://hieunt-qa-portfolio.loretaraiche3.chatgpt.site/admin/). Its setup screen links to [GitHub App registration](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app) with the callback URL prefilled. Give the app **Contents: Read and write** repository permission, disable unused webhooks, and install it for **only** `Qa-Portfolio`. Keep expiring user access tokens enabled.
3. Copy the new App's Client ID and Client Secret into the owner-only setup form. The secret is encrypted with `SESSION_KEY` in the admin database, and is never committed or sent through chat. Sign in with GitHub once, then use **Save draft online** and **Publish**. GitHub may require sign-in again if the authorization expires or is revoked.

The GitHub App user token stays inside an encrypted, HTTP-only cookie on the admin origin. The browser page does not receive the token. The backend checks the GitHub login against the allowlist and rejects cross-origin write requests. The setup form also checks the Sites owner identity. The admin remains owner-only on Sites as an additional access layer.

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
