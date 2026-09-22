"use client";

import { useMemo, useState } from "react";
import { portfolioData } from "./portfolio-data.generated";

type Theme = "dark" | "light";

const repositoryUrl = "https://github.com/hieunt210703/Qa-Portfolio";
const caseTypes = ["All", "Smoke", "Functional", "Regression"] as const;
const workflowSteps = ["Understand", "Plan", "Design", "Execute", "Report", "Regress"];

function ArrowIcon({ direction = "right" }: { direction?: "right" | "down" }) {
  return (
    <svg aria-hidden="true" className={`arrow-icon arrow-${direction}`} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.2c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.57-.29-5.28-1.28-5.28-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.43-2.71 5.4-5.29 5.69.42.36.79 1.06.79 2.14v3.18c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  );
}

function ResultBadge({ result }: { result: string }) {
  const normalized = result.toLowerCase().replaceAll(" ", "-");
  return (
    <span className={`result-badge result-${normalized}`}>
      <i aria-hidden="true" />
      {result}
    </span>
  );
}

function SectionIndex({ number, label }: { number: string; label: string }) {
  return (
    <div className="section-index" aria-hidden="true">
      <strong>{number}</strong>
      <span>{label}</span>
    </div>
  );
}

export default function Home() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [activeType, setActiveType] = useState<(typeof caseTypes)[number]>("All");
  const [query, setQuery] = useState("");
  const [selectedCase, setSelectedCase] = useState<string | null>("TC-F-001");
  const [activeStrategy, setActiveStrategy] = useState(0);
  const [activeWorkflow, setActiveWorkflow] = useState(0);

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
  const strategy = portfolioData.planSections[activeStrategy];

  return (
    <main className="portfolio" data-theme={theme}>
      <a className="skip-link" href="#main-content">Skip to content</a>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="Hieu NT QA Portfolio home">
          HIEU.NT <span>/</span> QA
        </a>
        <nav aria-label="Primary navigation">
          <a href="#cases">Cases</a>
          <a href="#strategy">Strategy</a>
          <a href="#defect">Defect</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="header-tools">
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <span aria-hidden="true">[</span><i aria-hidden="true" /><span aria-hidden="true">]</span>
          </button>
          <span className="header-mantra">TEST<br />BETTER<br />SOFTWARE</span>
        </div>
      </header>

      <div id="main-content">
        <section className="hero section-shell" id="top">
          <div className="hero-copy">
            <h1>
              I test what
              <span>users actually do.<i aria-hidden="true" /></span>
            </h1>
            <p className="hero-lede">
              A practical testing case study that turns requirements into clear test coverage,
              traceable execution results, and actionable defect reports.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#cases">Explore test cases <ArrowIcon /></a>
              <a className="button button-secondary" href={repositoryUrl} target="_blank" rel="noreferrer">
                View repository <GitHubIcon />
              </a>
            </div>
            <div className="quality-line" aria-hidden="true">
              <span className="dot-matrix" /><span>QUALITY BUILDS TRUST</span><i />
            </div>
          </div>

          <aside className="run-console" aria-label="Latest test run summary">
            <div className="console-scan" aria-hidden="true" />
            <div className="run-console-header">
              <strong>LATEST TEST RUN</strong>
              <span><i /> RUN COMPLETE</span>
            </div>
            <div className="run-title-row">
              <div>
                <strong>demoqa.com / smoke suite</strong>
                <span>19 Jan 2026 · Chrome / Windows</span>
              </div>
              <b>{passRate}%</b>
            </div>
            <div className="run-progress" aria-label={`${passRate}% of executed tests passed`}>
              <span style={{ width: `${passRate}%` }} />
            </div>
            <div className="run-stats">
              <div><strong>{executedCount}</strong><span>executed</span></div>
              <div><strong className="text-pass">{passCount}</strong><span>passed</span></div>
              <div><strong className="text-fail">{failCount}</strong><span>failed</span></div>
            </div>
            <div className="run-table" role="table" aria-label="Latest executed cases">
              <div className="run-table-head" role="row"><span>#</span><span>Test case</span><span>Result</span></div>
              {cases.slice(0, 3).map((testCase) => (
                <div className="run-table-row" role="row" key={testCase.id}>
                  <span>{testCase.id.replace(/TC-[A-Z]-/, "TC-")}</span>
                  <strong>{testCase.title}</strong>
                  <ResultBadge result={testCase.result} />
                </div>
              ))}
            </div>
            <div className="console-footer">
              <span><b>&gt;</b> {executedCount} tests executed. {passCount} passed. {failCount} failed.<i aria-hidden="true" /></span>
              <a href="#execution">View all results <ArrowIcon /></a>
            </div>
          </aside>
        </section>

        <section className="metrics-rail section-shell" aria-label="Portfolio metrics">
          {[
            [String(cases.length).padStart(2, "0"), "Designed cases"],
            [`${passRate}%`, "Pass rate"],
            [String(portfolioData.testData.length).padStart(2, "0"), "Data profiles"],
            ["P1", "Top defect"],
          ].map(([value, label]) => (
            <article className={value === "P1" ? "metric metric-alert" : "metric"} key={label}>
              <strong>{value}</strong><span>{label}</span>
            </article>
          ))}
          <span className="metrics-mantra" aria-hidden="true">TEST<br />ANALYZE<br />REPORT<br />IMPROVE</span>
        </section>

        <section className="section section-shell cases-section" id="cases">
          <div className="section-heading cases-heading">
            <SectionIndex number="01" label="Test case explorer" />
            <h2>Coverage you<br /><span>can inspect.</span></h2>
            <p>Every case is generated from the repository&apos;s CSV source, keeping the portfolio and test artifacts in sync.</p>
          </div>

          <div className="case-toolbar">
            <div className="filter-group" aria-label="Filter by test type">
              {caseTypes.map((type) => (
                <button type="button" key={type} className={activeType === type ? "active" : ""} onClick={() => setActiveType(type)} aria-pressed={activeType === type}>
                  {type}
                </button>
              ))}
            </div>
            <label className="search-box">
              <span className="sr-only">Search test cases</span><SearchIcon />
              <input type="search" placeholder="Search cases..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
          </div>

          <div className="case-list" aria-live="polite">
            <div className="case-list-head" aria-hidden="true">
              <span>#</span><span>ID / TYPE</span><span>TEST CASE</span><span>PRIORITY</span><span>STATUS</span><span />
            </div>
            {filteredCases.map((testCase, index) => {
              const expanded = selectedCase === testCase.id;
              return (
                <article className={`case-row ${expanded ? "expanded" : ""}`} key={testCase.id}>
                  <button className="case-summary" type="button" onClick={() => setSelectedCase(expanded ? null : testCase.id)} aria-expanded={expanded}>
                    <span className="row-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="case-id"><b>{testCase.id}</b><small>{testCase.type}</small></span>
                    <span className="case-title">{testCase.title}</span>
                    <span className={`priority priority-${testCase.priority.toLowerCase()}`}>{testCase.priority}</span>
                    <ResultBadge result={testCase.result} />
                    <span className="expand-icon" aria-hidden="true"><ArrowIcon direction="down" /></span>
                  </button>
                  {expanded && (
                    <div className="case-detail">
                      <div><span className="detail-label">Preconditions</span><p>{testCase.preconditions}</p></div>
                      <div><span className="detail-label">Steps</span><ol>{testCase.steps.map((step) => <li key={step}>{step.replace(/^\d+\.\s*/, "")}</li>)}</ol></div>
                      <div><span className="detail-label">Expected result</span><p>{testCase.expected}</p></div>
                      <div><span className="detail-label">Execution note</span><p className={testCase.result === "Fail" ? "note-fail" : ""}>{testCase.notes || "No execution note recorded."}</p></div>
                    </div>
                  )}
                </article>
              );
            })}
            {!filteredCases.length && <p className="empty-state">No test cases match this filter.</p>}
          </div>
          <div className="case-footer">
            <p>Showing {filteredCases.length} of {cases.length} test cases</p>
            <span aria-hidden="true"><i /><i /><i /><i /><i /></span>
          </div>
        </section>

        <section className="section execution-section" id="execution">
          <div className="section-shell">
            <SectionIndex number="02" label="Execution snapshot" />
            <div className="execution-grid">
              <div className="execution-dial-wrap">
                <div className="execution-dial" style={{ background: `conic-gradient(var(--accent) 0 ${passRate}%, var(--dial-track) ${passRate}% 100%)` }} aria-label={`${passRate}% pass rate`}>
                  <div><strong>{passRate}%</strong><span>pass rate</span></div>
                </div>
                <p>TEST <ArrowIcon /> EXECUTE <ArrowIcon /> VALIDATE <ArrowIcon /> IMPROVE</p>
              </div>
              <div className="execution-main">
                <h2>Results, <span>not just<br />intentions.</span></h2>
                <p>The latest recorded run reveals one concrete validation issue and a clear next action for regression.</p>
                <div className="test-trace" aria-label="Test execution trace">
                  {cases.map((testCase, index) => (
                    <article className={`trace-node trace-${testCase.result.toLowerCase().replaceAll(" ", "-")}`} key={testCase.id}>
                      <i aria-hidden="true" /><strong>{testCase.id}</strong><span>{testCase.title}</span><b>{testCase.result}</b>
                      {index < cases.length - 1 && <em aria-hidden="true" />}
                    </article>
                  ))}
                </div>
                <div className="execution-summary">
                  <div><strong>{executedCount}</strong><span>Executed</span></div>
                  <div><strong className="text-pass">{passCount}</strong><span>Passed</span></div>
                  <div><strong className="text-fail">{failCount}</strong><span>Failed</span></div>
                  <div><strong>{notRunCount}</strong><span>Not run</span></div>
                </div>
              </div>
              <dl className="execution-meta">
                <div><dt>Executed by</dt><dd>{portfolioData.executions[0]?.executedBy}</dd></div>
                <div><dt>Environment</dt><dd>DemoQA / Web</dd></div>
                <div><dt>Last run</dt><dd>19 Jan 2026</dd></div>
              </dl>
            </div>
          </div>
        </section>

        <section className="section section-shell strategy-section" id="strategy">
          <div className="strategy-heading">
            <div>
              <SectionIndex number="03" label="Test strategy" />
              <h2>A deliberate<br /><span>testing approach.</span></h2>
              <p>The plan balances structured cases with exploratory testing, while keeping scope and release criteria explicit.</p>
            </div>
            <div className="workflow" aria-label="QA workflow">
              {workflowSteps.map((step, index) => (
                <button className={activeWorkflow === index ? "active" : ""} type="button" key={step} onClick={() => setActiveWorkflow(index)} aria-pressed={activeWorkflow === index}>
                  <span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="strategy-browser">
            <div className="strategy-index" role="tablist" aria-label="Test plan sections">
              {portfolioData.planSections.slice(0, 8).map((section, index) => (
                <button type="button" role="tab" aria-selected={activeStrategy === index} className={activeStrategy === index ? "active" : ""} onClick={() => setActiveStrategy(index)} key={section.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span><strong>{section.title}</strong><ArrowIcon />
                </button>
              ))}
            </div>
            <article className="strategy-detail" role="tabpanel">
              <header><span>{String(activeStrategy + 1).padStart(2, "0")}</span><small>TEST STRATEGY</small></header>
              <h3>{strategy.title}</h3>
              <ul>{strategy.items.map((item) => <li key={item}>{item}</li>)}</ul>
              <footer>
                <span>{String(activeStrategy + 1).padStart(2, "0")} / 08</span>
                <div>
                  <button type="button" onClick={() => setActiveStrategy((activeStrategy + 7) % 8)} aria-label="Previous strategy section"><ArrowIcon /></button>
                  <button type="button" onClick={() => setActiveStrategy((activeStrategy + 1) % 8)} aria-label="Next strategy section"><ArrowIcon /></button>
                </div>
              </footer>
            </article>
          </div>
        </section>

        <section className="section defect-section" id="defect">
          <div className="section-shell">
            <div className="defect-layout">
              <div className="defect-heading">
                <SectionIndex number="04" label="Defect case study" />
                <h2>From failure to<br /><span>an actionable report.</span></h2>
                <p>A real defect, clearly documented from reproduction to impact.</p>
                <a href="#cases" className="button defect-back">Back to test cases <ArrowIcon /></a>
              </div>

              <article className="bug-file">
                <header>
                  <strong>BUG-001</strong><span>OPEN</span><div><small>SEVERITY</small><b>{portfolioData.bug.severity}</b></div>
                </header>
                <h3>{portfolioData.bug.title}</h3>
                <p className="bug-environment">Environment: {portfolioData.bug.environment}</p>
                <div className="bug-steps">
                  <span className="detail-label">Steps to reproduce</span>
                  <ol>{portfolioData.bug.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                </div>
                <div className="result-diff">
                  <div className="actual-result"><span>Actual</span><p>{portfolioData.bug.actual}</p></div>
                  <div className="expected-result"><span>Expected</span><p>{portfolioData.bug.expected}</p></div>
                </div>
              </article>
            </div>
            <div className="impact-rail">
              <strong>WHY IT MATTERS</strong>
              <p>Invalid contact data can enter the system, reducing data quality and breaking downstream communication.</p>
              <span className="dot-matrix" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="section section-shell data-section">
          <div className="data-heading">
            <SectionIndex number="05" label="Test data" />
            <h2>Repeatable inputs. <span>Reliable checks.</span></h2>
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
            <h2>Let&apos;s build quality in,<br />not bolt it on later.</h2>
            <div>
              <p>Explore the full test artifacts, commit history, and future automation roadmap on GitHub.</p>
              <a className="button contact-button" href={repositoryUrl} target="_blank" rel="noreferrer">Open GitHub repository <ArrowIcon /></a>
            </div>
          </div>
        </section>
      </div>

      <footer className="site-footer">
        <div className="section-shell footer-inner">
          <div><strong>HIEU.NT / QA</strong><span>Manual testing portfolio</span></div>
          <i aria-hidden="true" />
          <p>Built from living QA artifacts · {new Date().getFullYear()}</p>
        </div>
      </footer>
    </main>
  );
}
