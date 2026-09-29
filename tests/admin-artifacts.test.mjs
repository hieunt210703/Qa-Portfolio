import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildArtifactFiles, publishPortfolioContent } from "../app/admin/publish.ts";
import { parseBugExample, parseCsv, parsePlan } from "../scripts/generate-portfolio-data.mjs";

const content = JSON.parse(await readFile(new URL("../content/portfolio.json", import.meta.url), "utf8"));

test("admin export preserves QA data, including Unicode and CSV punctuation", () => {
  const edited = structuredClone(content);
  edited.qa.testCases[0].title = "Tìm kiếm, nhập \"A\"";
  edited.qa.testCases[0].steps = ["1. Mở trang; chờ tải", "2. Nhập dữ liệu\nmới"];
  edited.qa.testData[0].current_address = "12 Nguyễn Huệ, Quận 1";
  const files = buildArtifactFiles(edited);
  assert.deepEqual(JSON.parse(files["content/portfolio.json"]), edited);
  const cases = parseCsv(files["TEST_CASES.csv"]);
  assert.equal(cases[0].Title, edited.qa.testCases[0].title);
  assert.equal(cases[0].Steps, edited.qa.testCases[0].steps.join("\n"));
  assert.equal(parseCsv(files["test_data.csv"])[0].current_address, edited.qa.testData[0].current_address);
  assert.deepEqual(parsePlan(files["TEST_PLAN.md"]), edited.qa.planSections);
  const bug = structuredClone(edited.qa.bug);
  delete bug.status;
  assert.deepEqual(parseBugExample(files["BUG_REPORT_TEMPLATE.md"]), bug);
});

test("publishing commits the content and QA artifacts together without forcing the branch", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const responses = [
    { object: { sha: "parent-sha" } },
    { tree: { sha: "base-tree-sha" } },
    { sha: "new-tree-sha" },
    { sha: "new-commit-sha" },
    { object: { sha: "new-commit-sha" } },
  ];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options });
    return new Response(JSON.stringify(responses[calls.length - 1]), { status: 200 });
  };
  try {
    const url = await publishPortfolioContent(content, "test-token");
    assert.equal(url, "https://github.com/hieunt210703/Qa-Portfolio/commit/new-commit-sha");
    assert.equal(calls.length, 5);
    assert.deepEqual(calls.map((call) => call.method), ["GET", "GET", "POST", "POST", "PATCH"]);
    assert.ok(calls.every((call) => call.headers.Authorization === "Bearer test-token"));
    const tree = JSON.parse(calls[2].body);
    assert.equal(tree.base_tree, "base-tree-sha");
    assert.deepEqual(tree.tree.map((item) => item.path), Object.keys(buildArtifactFiles(content)));
    assert.equal(JSON.parse(calls[3].body).parents[0], "parent-sha");
    assert.deepEqual(JSON.parse(calls[4].body), { sha: "new-commit-sha", force: false });
    assert.ok(calls.every((call) => !call.body?.includes("test-token")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
