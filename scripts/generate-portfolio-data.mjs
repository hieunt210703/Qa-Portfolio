import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function parseCsv(source) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field.trim());
    if (row.some(Boolean)) rows.push(row);
  }

  const [headers = [], ...records] = rows;
  return records.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

export function parsePlan(source) {
  const sections = [];
  let current = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = line.match(/^\d+\.\s+(.+)$/);

    if (heading) {
      current = { title: heading[1], items: [] };
      sections.push(current);
    } else if (current && line.startsWith("- ")) {
      current.items.push(line.slice(2));
    } else if (current && line) {
      current.items.push(line);
    }
  }

  return sections;
}

export function parseBugExample(source) {
  const example = source.split("Example:")[1] ?? "";
  const value = (label) =>
    example.match(new RegExp(`^${label}:\\s*(.+)$`, "mi"))?.[1]?.trim() ?? "";
  const stepsBlock = example.match(/Steps to Reproduce:\s*([\s\S]*?)\s*Actual Result:/i)?.[1] ?? "";
  const steps = [...stepsBlock.matchAll(/^\d+\.\s*(.+)$/gm)].map((match) => match[1].trim());

  return {
    title: value("Title"),
    environment: value("Environment"),
    severity: value("Severity/Priority"),
    steps,
    actual: value("Actual Result"),
    expected: value("Expected Result"),
  };
}

export async function buildPortfolioData() {
  const [casesSource, executionsSource, testDataSource, planSource, bugSource] =
    await Promise.all([
      readFile(resolve(root, "TEST_CASES.csv"), "utf8"),
      readFile(resolve(root, "SAMPLE_TEST_EXECUTION_REPORT.csv"), "utf8"),
      readFile(resolve(root, "test_data.csv"), "utf8"),
      readFile(resolve(root, "TEST_PLAN.md"), "utf8"),
      readFile(resolve(root, "BUG_REPORT_TEMPLATE.md"), "utf8"),
    ]);

  const testCases = parseCsv(casesSource).map((testCase) => ({
    id: testCase.ID,
    title: testCase.Title,
    type: testCase.Type,
    priority: testCase.Priority,
    preconditions: testCase.Preconditions,
    steps: testCase.Steps.split(";").map((step) => step.trim()),
    expected: testCase["Expected Result"],
  }));

  const executions = parseCsv(executionsSource).map((execution) => ({
    id: execution["Test ID"],
    title: execution.Title,
    executedBy: execution["Executed By"],
    date: execution.Date,
    result: execution.Result,
    notes: execution.Notes,
  }));

  return {
    testCases,
    executions,
    testData: parseCsv(testDataSource),
    planSections: parsePlan(planSource),
    bug: parseBugExample(bugSource),
  };
}

export async function writeGeneratedData() {
  const outputPath = resolve(root, "app", "portfolio-data.generated.ts");
  const data = await buildPortfolioData();
  const output = `// Generated from the repository QA artifacts. Do not edit by hand.\nexport const portfolioData = ${JSON.stringify(data, null, 2)} as const;\n`;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, "utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await writeGeneratedData();
}
