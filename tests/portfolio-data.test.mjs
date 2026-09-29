import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildPortfolioData,
  parseBugExample,
  parseCsv,
  parsePlan,
} from "../scripts/generate-portfolio-data.mjs";

test("CSV parser preserves quoted values containing commas", () => {
  const rows = parseCsv('ID,Expected Result\nTC-1,"Loads, then confirms"\n');
  assert.equal(rows[0]["Expected Result"], "Loads, then confirms");
});

test("Markdown parsers return structured portfolio content", () => {
  assert.deepEqual(parsePlan("1. Scope\n- Forms\n- Links"), [
    { title: "Scope", items: ["Forms", "Links"] },
  ]);
  assert.equal(
    parseBugExample("Example:\nTitle: Broken form\nSeverity/Priority: P1").severity,
    "P1",
  );
});

test("repository artifacts match the managed QA content", async () => {
  const data = await buildPortfolioData();
  const content = JSON.parse(await readFile(new URL("../content/portfolio.json", import.meta.url), "utf8"));
  assert.deepEqual(data.testCases, content.qa.testCases);
  assert.deepEqual(data.executions, content.qa.executions);
  assert.deepEqual(data.testData, content.qa.testData);
  assert.deepEqual(data.planSections, content.qa.planSections);
  const bug = structuredClone(content.qa.bug);
  delete bug.status;
  assert.deepEqual(data.bug, bug);
});
