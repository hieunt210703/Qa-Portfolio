"use client";

import { useMemo, useState } from "react";
import { portfolioData } from "./portfolio-data.generated";

type Theme = "dark" | "light";

const repositoryUrl = "https://github.com/hieunt210703/Qa-Portfolio";
const caseTypes = ["All", "Smoke", "Functional", "Regression"] as const;

function ResultBadge({ result }: { result: string }) {
  const normalized = result.toLowerCase().replace(" ", "-");
  return <span className={`result-badge result-${normalized}`}>{result}</span>;
}

export default function Home() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [activeType, setActiveType] = useState<(typeof caseTypes)[number]>("All");
  const [query, setQuery] = useState("");
  const [selectedCase, setSelectedCase] = useState<string | null>(null);

  const executionById = useMemo(
    () =>
      new Map<string, (typeof portfolioData.executions)[number]>(
        portfolioData.executions.map((execution) => [execution.id, execution]),
      ),
    [],
  );

  const cases = useMemo(
    () =>
      portfolioData.testCases.map((testCase) => ({
        ...testCase,
        result: executionById.get(testCase.id)?.result ?? "Not Run",
        notes: executionById.get(testCase.id)?.notes ?? "",
      })),
    [executionById],
  );

  const filteredCases = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return cases.filter((testCase) => {
      const typeMatches = activeType === "All" || testCase.type === activeType;
      const queryMatches =
        !normalizedQuery ||
        `${testCase.id} ${testCase.title} ${testCase.expected}`
          .toLowerCase()
          .includes(normalizedQuery);
      return typeMatches && queryMatches;
    });
  }, [activeType, cases, query]);

  const passCount = cases.filter((testCase) => testCase.result === "Pass").length;
  const failCount = cases.filter((testCase) => testCase.result === "Fail").length;
  const notRunCount = cases.filter((testCase) => testCase.result === "Not Run").length;
  const executedCount = cases.length - notRunCount;
  const passRate = executedCount ? Math.round((passCount / executedCount) * 100) : 0;

  return (
    <main className="portfolio" data-theme={theme}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="Hieu NT QA Portfolio home">
          <span className="brand-mark" aria-hidden="true">HN</span>
          <span>HIEU.NT / QA</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#cases">Cases</a>
          <a href="#strategy">Strategy</a>
          <a href="#defect">Defect</a>
          <a href="#contact">Contact</a>
        </nav>
        <button
          className="theme-toggle"
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          <span aria-hidden="true">{theme === "dark" ? "☼" : "◐"}</span>
          <span className="theme-label">{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </header>

      <div id="main-content">
        <section className="hero section-shell" id="top">
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" /> Manual QA portfolio · Web testing</p>
            <h1>I test what users <em>actually do.</em></h1>
            <p className="hero-lede">
              A practical testing case study that turns requirements into clear test coverage,
              traceable execution results, and actionable defect reports.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#cases">Explore test cases <span aria-hidden="true">↓</span></a>
              <a className="button button-secondary" href={repositoryUrl} target="_blank" rel="noreferrer">
                View repository <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <aside className="run-card" aria-label="Latest test run summary">
            <div className="run-card-header">
              <span>RUN / 2026.01.19</span>
              <span className="live-label"><i /> COMPLETE</span>
            </div>
            <div className="run-command"><span>$</span> execute smoke --target demoqa.com</div>
            <div className="run-grid">
              <div><strong>{executedCount}</strong><span>executed</span></div>
              <div><strong className="text-pass">{passCount}</strong><span>passed</span></div>
              <div><strong className="text-fail">{failCount}</strong><span>failed</span></div>
            </div>
            <div className="run-progress" aria-label={`${passRate}% of executed tests passed`}>
              <span style={{ width: `${passRate}%` }} />
            </div>
            <div className="run-log">
              <p><span>✓</span> Page load verified</p>
              <p><span>✓</span> Form submission verified</p>
              <p className="log-fail"><span>×</span> Invalid email accepted</p>
            </div>
          </aside>
        </section>

        <section className="metrics section-shell" aria-label="Portfolio metrics">
          {[
            [String(cases.length).padStart(2, "0"), "Designed cases", "Across 3 test types"],
            [`${passRate}%`, "Pass rate", "Of executed cases"],
            [String(portfolioData.testData.length).padStart(2, "0"), "Data profiles", "Reusable form data"],
            ["P1", "Top defect", "Validation gap found"],
          ].map(([value, label, detail], index) => (
            <article className="metric" key={label} style={{ animationDelay: `${index * 80}ms` }}>
              <span className="metric-index">0{index + 1}</span>
              <strong>{value}</strong>
              <h2>{label}</h2>
              <p>{detail}</p>
            </article>
          ))}
        </section>

        <section className="section section-shell" id="cases">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">01 / Test case explorer</p>
              <h2>Coverage you can inspect.</h2>
            </div>
            <p>Every case is generated from the repository&apos;s CSV source, keeping the portfolio and test artifacts in sync.</p>
          </div>

          <div className="case-toolbar">
            <div className="filter-group" aria-label="Filter by test type">
              {caseTypes.map((type) => (
                <button
                  type="button"
                  key={type}
                  className={activeType === type ? "active" : ""}
                  onClick={() => setActiveType(type)}
                  aria-pressed={activeType === type}
                >
                  {type}
                </button>
              ))}
            </div>
            <label className="search-box">
              <span className="sr-only">Search test cases</span>
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search cases..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          <div className="case-list" aria-live="polite">
            <div className="case-list-head" aria-hidden="true">
              <span>ID / TYPE</span><span>TEST CASE</span><span>PRIORITY</span><span>STATUS</span><span />
            </div>
            {filteredCases.map((testCase) => {
              const expanded = selectedCase === testCase.id;
              return (
                <article className={`case-row ${expanded ? "expanded" : ""}`} key={testCase.id}>
                  <button
                    className="case-summary"
                    type="button"
                    onClick={() => setSelectedCase(expanded ? null : testCase.id)}
                    aria-expanded={expanded}
                  >
                    <span className="case-id"><b>{testCase.id}</b><small>{testCase.type}</small></span>
                    <span className="case-title">{testCase.title}</span>
                    <span className={`priority priority-${testCase.priority.toLowerCase()}`}>{testCase.priority}</span>
                    <ResultBadge result={testCase.result} />
                    <span className="expand-icon" aria-hidden="true">{expanded ? "−" : "+"}</span>
                  </button>
                  {expanded && (
                    <div className="case-detail">
                      <div>
                        <span className="detail-label">Preconditions</span>
                        <p>{testCase.preconditions}</p>
                      </div>
                      <div>
                        <span className="detail-label">Steps</span>
                        <ol>{testCase.steps.map((step) => <li key={step}>{step.replace(/^\d+\.\s*/, "")}</li>)}</ol>
                      </div>
                      <div>
                        <span className="detail-label">Expected result</span>
                        <p>{testCase.expected}</p>
                      </div>
                      {testCase.notes && (
                        <div className="case-note"><span>Execution note</span>{testCase.notes}</div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
            {!filteredCases.length && <p className="empty-state">No test cases match this filter.</p>}
          </div>
          <p className="result-count">Showing {filteredCases.length} of {cases.length} test cases</p>
        </section>

        <section className="section execution-section">
          <div className="section-shell execution-layout">
            <div className="section-heading">
              <p className="eyebrow">02 / Execution snapshot</p>
              <h2>Results, not just intentions.</h2>
              <p className="section-intro">The latest recorded run reveals one concrete validation issue and a clear next action for regression.</p>
            </div>
            <div className="execution-panel">
              <div className="donut" style={{ background: `conic-gradient(var(--pass) 0 ${passRate}%, var(--fail) ${passRate}% 100%)` }}>
                <div><strong>{passRate}%</strong><span>pass rate</span></div>
              </div>
              <div className="legend">
                <div><span className="legend-dot pass-dot" /><p><strong>{passCount}</strong>Passed</p></div>
                <div><span className="legend-dot fail-dot" /><p><strong>{failCount}</strong>Failed</p></div>
                <div><span className="legend-dot pending-dot" /><p><strong>{notRunCount}</strong>Not run</p></div>
              </div>
              <div className="execution-meta">
                <span>EXECUTED BY</span><strong>{portfolioData.executions[0]?.executedBy}</strong>
                <span>ENVIRONMENT</span><strong>DemoQA / Web</strong>
                <span>LAST RUN</span><strong>19 Jan 2026</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-shell" id="strategy">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">03 / Test strategy</p>
              <h2>A deliberate testing approach.</h2>
            </div>
            <p>The plan balances structured cases with exploratory testing, while keeping scope and release criteria explicit.</p>
          </div>

          <div className="workflow" aria-label="QA workflow">
            {["Understand", "Plan", "Design", "Execute", "Report", "Regress"].map((step, index) => (
              <div className="workflow-step" key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>

          <div className="strategy-grid">
            {portfolioData.planSections.slice(0, 8).map((section, index) => (
              <article className="strategy-card" key={section.title}>
                <span className="card-number">{String(index + 1).padStart(2, "0")}</span>
                <h3>{section.title}</h3>
                <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        <section className="section defect-section" id="defect">
          <div className="section-shell">
            <div className="section-heading split-heading">
              <div>
                <p className="eyebrow defect-eyebrow">04 / Defect case study</p>
                <h2>From failure to an actionable report.</h2>
              </div>
              <div className="severity"><span>SEVERITY</span><strong>{portfolioData.bug.severity}</strong></div>
            </div>

            <article className="bug-card">
              <div className="bug-main">
                <div className="bug-title-row">
                  <span className="bug-id">BUG-001</span>
                  <ResultBadge result="Open" />
                </div>
                <h3>{portfolioData.bug.title}</h3>
                <p className="environment">{portfolioData.bug.environment}</p>
                <div className="bug-steps">
                  <span className="detail-label">Steps to reproduce</span>
                  <ol>{portfolioData.bug.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                </div>
              </div>
              <div className="bug-results">
                <div className="actual-result">
                  <span>ACTUAL</span>
                  <p>{portfolioData.bug.actual}</p>
                </div>
                <div className="expected-result">
                  <span>EXPECTED</span>
                  <p>{portfolioData.bug.expected}</p>
                </div>
                <div className="impact-note">
                  <span>WHY IT MATTERS</span>
                  <p>Invalid contact data can enter the system, reducing data quality and breaking downstream communication.</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="section section-shell data-section">
          <div className="section-heading">
            <p className="eyebrow">05 / Test data</p>
            <h2>Repeatable inputs. Reliable checks.</h2>
          </div>
          <div className="data-table-wrap">
            <table>
              <thead><tr><th>Profile</th><th>Name</th><th>Email</th><th>Current address</th><th>Permanent address</th></tr></thead>
              <tbody>
                {portfolioData.testData.map((profile, index) => (
                  <tr key={profile.email}>
                    <td>DATA-{String(index + 1).padStart(2, "0")}</td>
                    <td>{profile.name}</td><td>{profile.email}</td><td>{profile.current_address}</td><td>{profile.permanent_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="section-shell contact-inner">
            <p className="eyebrow">Ready for the next test cycle</p>
            <h2>Let&apos;s build quality in,<br />not bolt it on later.</h2>
            <p>Explore the full test artifacts, commit history, and future automation roadmap on GitHub.</p>
            <a className="button button-light" href={repositoryUrl} target="_blank" rel="noreferrer">Open GitHub repository <span aria-hidden="true">↗</span></a>
          </div>
        </section>
      </div>

      <footer>
        <div className="section-shell footer-inner">
          <div><strong>HIEU.NT / QA</strong><span>Manual testing portfolio</span></div>
          <p>Built from living QA artifacts · {new Date().getFullYear()}</p>
        </div>
      </footer>
    </main>
  );
}
