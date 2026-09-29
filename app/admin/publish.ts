import type { PortfolioContent } from "../content";

const apiRoot = "https://api.github.com/repos/hieunt210703/Qa-Portfolio";
const apiVersion = "2026-03-10";
const githubUserAgent = "Hieu-QA-Portfolio-Admin";

const csvCell = (value: string) => /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
const csvRow = (values: string[]) => values.map(csvCell).join(",");
const markdownCell = (value: string) => value.replaceAll("|", "\\|").replaceAll("\n", "<br>");

export function buildArtifactFiles(content: PortfolioContent): Record<string, string> {
  const { qa, settings } = content;
  const casesCsv = [
    csvRow(["ID", "Title", "Type", "Priority", "Preconditions", "Steps", "Expected Result"]),
    ...qa.testCases.map((item) => csvRow([item.id, item.title, item.type, item.priority, item.preconditions, item.steps.join("\n"), item.expected])),
  ].join("\n") + "\n";
  const runsCsv = [
    csvRow(["Test ID", "Title", "Executed By", "Date", "Result", "Notes"]),
    ...qa.executions.map((item) => csvRow([item.id, item.title, item.executedBy, item.date, item.result, item.notes])),
  ].join("\n") + "\n";
  const dataCsv = [
    csvRow(["name", "email", "current_address", "permanent_address"]),
    ...qa.testData.map((item) => csvRow([item.name, item.email, item.current_address, item.permanent_address])),
  ].join("\n") + "\n";
  const plan = [
    "# Test Plan",
    "",
    `Project: QA Portfolio - ${settings.runProduct}`,
    `Prepared by: ${settings.ownerName}`,
    "",
    ...qa.planSections.flatMap((section, index) => [
      `${index + 1}. ${section.title}`,
      ...section.items.map((item) => `- ${item}`),
      "",
    ]),
  ].join("\n");
  const bug = [
    "# Bug Report Template",
    "",
    "Title: [Short descriptive title]",
    "Reporter: [Your name]",
    "Environment: [OS / Browser / Version / URL]",
    "Severity/Priority: [P0/P1/P2/P3]",
    "Steps to Reproduce:",
    "1. ", "2. ", "3. ",
    "",
    "Actual Result:", "", "Expected Result:", "", "Attachments:", "- Screenshots", "- Console logs", "- Network logs", "",
    "Example:",
    `Title: ${qa.bug.title}`,
    `Reporter: ${settings.ownerName}`,
    `Environment: ${qa.bug.environment}`,
    `Severity/Priority: ${qa.bug.severity}`,
    `Status: ${qa.bug.status}`,
    "Steps to Reproduce:",
    ...qa.bug.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    `Actual Result: ${qa.bug.actual}`,
    `Expected Result: ${qa.bug.expected}`,
    "",
  ].join("\n");
  const casesMd = [
    "# Test Cases",
    "",
    "| ID | Title | Type | Priority | Preconditions | Steps | Expected Result |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...qa.testCases.map((item) => `| ${[item.id, item.title, item.type, item.priority, item.preconditions, item.steps.join("<br>"), item.expected].map(markdownCell).join(" | ")} |`),
    "",
  ].join("\n");

  return {
    "content/portfolio.json": `${JSON.stringify(content, null, 2)}\n`,
    "TEST_CASES.csv": casesCsv,
    "TEST_CASES.md": casesMd,
    "SAMPLE_TEST_EXECUTION_REPORT.csv": runsCsv,
    "test_data.csv": dataCsv,
    "TEST_PLAN.md": plan,
    "BUG_REPORT_TEMPLATE.md": bug,
  };
}

async function request<T>(path: string, token: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${apiRoot}${path}`, {
    method,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token.trim()}`,
      "User-Agent": githubUserAgent,
      "X-GitHub-Api-Version": apiVersion,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("GitHub từ chối quyền truy cập. Hãy kiểm tra token có quyền Contents: Read and write cho repo Qa-Portfolio.");
    }
    if (response.status === 409 || response.status === 422) {
      throw new Error("Kho mã nguồn đã thay đổi hoặc không cho cập nhật nhánh main. Hãy tải lại trang admin, kiểm tra bản nháp rồi thử lại.");
    }
    throw new Error(`GitHub chưa nhận bản cập nhật (HTTP ${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export async function publishPortfolioContent(content: PortfolioContent, token: string): Promise<string> {
  const reference = await request<{ object: { sha: string } }>("/git/ref/heads/main", token);
  const parentSha = reference.object.sha;
  const parent = await request<{ tree: { sha: string } }>(`/git/commits/${parentSha}`, token);
  const files = buildArtifactFiles(content);
  const tree = await request<{ sha: string }>("/git/trees", token, "POST", {
    base_tree: parent.tree.sha,
    tree: Object.entries(files).map(([path, fileContent]) => ({ path, mode: "100644", type: "blob", content: fileContent })),
  });
  const commit = await request<{ sha: string }>("/git/commits", token, "POST", {
    message: "Update QA portfolio content from admin",
    tree: tree.sha,
    parents: [parentSha],
  });
  await request("/git/refs/heads/main", token, "PATCH", { sha: commit.sha, force: false });
  return `https://github.com/hieunt210703/Qa-Portfolio/commit/${commit.sha}`;
}
