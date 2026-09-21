import test from "node:test";
import assert from "node:assert/strict";
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

test("repository artifacts produce the expected portfolio data", async () => {
  const data = await buildPortfolioData();
  assert.equal(data.testCases.length, 5);
  assert.equal(data.executions.length, 3);
  assert.equal(data.testData.length, 2);
  assert.ok(data.planSections.length >= 8);
  assert.equal(data.bug.severity, "P1");
});
