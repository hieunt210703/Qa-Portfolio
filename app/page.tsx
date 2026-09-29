"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { defaultPortfolioContent, draftStorageKey, isPortfolioContent, type PortfolioContent } from "./content";
import { translate, type Language } from "./translations";

type Theme = "dark" | "light";

const workflowSteps = ["Understand", "Plan", "Design", "Execute", "Report", "Regress"];
const languageStorageKey = "portfolio-language";
const languageChangeEvent = "portfolio-language-change";

function subscribeLanguage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(languageChangeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(languageChangeEvent, callback);
  };
}

function getStoredLanguage(): Language {
  return window.localStorage.getItem(languageStorageKey) === "vi" ? "vi" : "en";
}

function getServerLanguage(): Language {
  return "en";
}

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

function ResultBadge({ result, t }: { result: string; t: (value: string) => string }) {
  const normalized = result.toLowerCase().replaceAll(" ", "-");
  return (
    <span className={`result-badge result-${normalized}`}>
      <i aria-hidden="true" />
      {t(result)}
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
  const [theme, setTheme] = useState<Theme>("light");
  const language = useSyncExternalStore(subscribeLanguage, getStoredLanguage, getServerLanguage);
  const [content, setContent] = useState<PortfolioContent>(defaultPortfolioContent);
  const portfolioData = content.qa;
  const repositoryUrl = content.settings.repositoryUrl;
  const [activeType, setActiveType] = useState("All");
  const [query, setQuery] = useState("");
  const [selectedCase, setSelectedCase] = useState<string | null>("TC-F-001");
  const [activeStrategy, setActiveStrategy] = useState(0);
  const [activeWorkflow, setActiveWorkflow] = useState(0);
  const t = useCallback((value: string) => translate(value, language, content.copy), [language, content.copy]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("preview")) return;
    const readDraft = () => {
      try {
        const saved = window.localStorage.getItem(draftStorageKey);
        if (!saved) return;
        const parsed: unknown = JSON.parse(saved);
        if (isPortfolioContent(parsed)) setContent(parsed);
      } catch {
        // A malformed draft leaves the published content visible.
      }
    };
    readDraft();
    window.addEventListener("storage", readDraft);
    return () => window.removeEventListener("storage", readDraft);
  }, []);

  function changeLanguage(nextLanguage: Language) {
    window.localStorage.setItem(languageStorageKey, nextLanguage);
    window.dispatchEvent(new Event(languageChangeEvent));
  }

  const executionById = useMemo(
    () =>
      new Map<string, (typeof portfolioData.executions)[number]>(
        portfolioData.executions.map((execution) => [execution.id, execution]),
      ),
    [portfolioData],
  );

  const cases = useMemo(
    () =>
      portfolioData.testCases.map((testCase) => ({
        ...testCase,
        result: executionById.get(testCase.id)?.result ?? "Not Run",
        notes: executionById.get(testCase.id)?.notes ?? "",
      })),
    [executionById, portfolioData.testCases],
  );

  const caseTypes = useMemo(() => ["All", ...new Set(cases.map((testCase) => testCase.type))], [cases]);

  const filteredCases = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return cases.filter((testCase) => {
      const typeMatches = activeType === "All" || testCase.type === activeType;
      const queryMatches =
        !normalizedQuery ||
        `${testCase.id} ${testCase.title} ${t(testCase.title)} ${testCase.expected} ${t(testCase.expected)}`
          .toLowerCase()
          .includes(normalizedQuery);
      return typeMatches && queryMatches;
    });
  }, [activeType, cases, query, t]);

  const passCount = cases.filter((testCase) => testCase.result === "Pass").length;
  const failCount = cases.filter((testCase) => testCase.result === "Fail").length;
  const notRunCount = cases.filter((testCase) => testCase.result === "Not Run").length;
  const executedCount = cases.length - notRunCount;
  const latestExecutedCases = cases
    .filter((testCase) => testCase.result !== "Not Run")
    .sort((first, second) => (executionById.get(second.id)?.date ?? "").localeCompare(executionById.get(first.id)?.date ?? ""))
    .slice(0, 3);
  const passRate = executedCount ? Math.round((passCount / executedCount) * 100) : 0;
  const visibleStrategies = portfolioData.planSections;
  const strategyCount = visibleStrategies.length;
  const strategy = visibleStrategies[activeStrategy] ?? visibleStrategies[0] ?? { title: "", items: [] };
  const latestRunDate = portfolioData.executions.filter((execution) => execution.result !== "Not Run").reduce<string>(
    (latest, execution) => execution.date > latest ? execution.date : latest,
    "",
  );
  const formattedRunDate = latestRunDate
    ? new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${latestRunDate}T00:00:00Z`))
    : "—";

  return (
    <main className="portfolio" data-theme={theme} data-language={language}>
      <a className="skip-link" href="#main-content">{t("Skip to content")}</a>

      <header className="site-header">
        <a className="brand" href="#top" aria-label={t("Hieu NT QA Portfolio home")}>{content.settings.brand}</a>
        <nav aria-label={t("Primary navigation")}>
          <a href="#experience">{t("Work")}</a>
          <a href="#cases">{t("Cases")}</a>
          <a href="#defect">{t("Defect")}</a>
          <a href="#contact">{t("Contact")}</a>
        </nav>
        <div className="header-tools">
          <div className="language-switch" role="group" aria-label="Language / Ngôn ngữ">
            {(["en", "vi"] as const).map((option) => (
              <button key={option} type="button" lang={option} aria-label={option === "vi" ? "Tiếng Việt" : "English"} aria-pressed={language === option} onClick={() => changeLanguage(option)}>
                {option.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={t(`Switch to ${theme === "dark" ? "light" : "dark"} theme`)}
            title={t(`Switch to ${theme === "dark" ? "light" : "dark"} theme`)}
          >
            <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
            <span>{theme === "dark" ? t("Light") : t("Dark")}</span>
          </button>
        </div>
      </header>

      <div id="main-content">
        <section className="hero section-shell" id="top">
          <div className="hero-copy">
            <h1>
              {content.profile.heroTitleTop[language]}
              <span>{content.profile.heroTitleAccent[language]}</span>
            </h1>
            <p className="hero-lede">
              {content.profile.intro[language]}
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#cases">{t("Explore test cases")} <ArrowIcon /></a>
              <a className="button button-secondary" href={repositoryUrl} target="_blank" rel="noreferrer">
                {t("View repository")} <GitHubIcon />
              </a>
            </div>
          </div>

          <aside className="run-console" aria-label={t("Latest test run summary")}>
            <div className="run-console-header">
              <strong>{t("LATEST TEST RUN")}</strong>
              <span><i /> {executedCount ? t("RUN COMPLETE") : t("Not Run")}</span>
            </div>
            <div className="run-title-row">
              <div>
                <strong>{content.settings.runProduct} / {content.settings.runSuite[language]}</strong>
                <span>{formattedRunDate} · {content.settings.runEnvironment}</span>
              </div>
              <b>{passRate}%</b>
            </div>
            <div className="run-progress" aria-label={language === "vi" ? `${passRate}% ca đã chạy đạt` : `${passRate}% of executed tests passed`}>
              <span style={{ width: `${passRate}%` }} />
            </div>
            <div className="run-stats">
              <div><strong>{executedCount}</strong><span>{t("executed")}</span></div>
              <div><strong className="text-pass">{passCount}</strong><span>{t("passed")}</span></div>
              <div><strong className="text-fail">{failCount}</strong><span>{t("failed")}</span></div>
            </div>
            <div className="run-table" role="table" aria-label={t("Latest executed cases")}>
              <div className="run-table-head" role="row"><span>#</span><span>{t("Test case")}</span><span>{t("Result")}</span></div>
              {latestExecutedCases.map((testCase) => (
                <div className="run-table-row" role="row" key={testCase.id}>
                  <span>{testCase.id.replace(/TC-[A-Z]-/, "TC-")}</span>
                  <strong>{t(testCase.title)}</strong>
                  <ResultBadge result={testCase.result} t={t} />
                </div>
              ))}
            </div>
            <div className="console-footer">
              <a href="#execution">{t("View all results")} <ArrowIcon /></a>
            </div>
          </aside>
        </section>

        <section className="section section-shell experience-section" id="experience">
          <div className="experience-intro">
            <SectionIndex number="01" label={t("Professional experience")} />
            <h2>{content.experience.titleTop[language]}<br /><span>{content.experience.titleAccent[language]}</span></h2>
            <p>{content.experience.summary[language]}</p>
            <div className="experience-tools"><strong>{t("Tools used")}</strong><span>{content.experience.tools.join(" · ")}</span></div>
          </div>
          <div className="experience-projects">
            {content.experience.projects.map((project, index) => (
              <article className="experience-project" key={project.id}>
                <span className="project-number">0{index + 1}</span>
                <div>
                  <span className="project-type">{project.type[language]}</span>
                  <h3>{project.name[language]}</h3>
                  <p>{project.description[language]}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-shell cases-section" id="cases">
          <div className="section-heading cases-heading">
            <SectionIndex number="02" label={t("Test case explorer")} />
            <h2>{t("Coverage you")}<br /><span>{t("can inspect.")}</span></h2>
            <p>{t("This DemoQA sample links each test case to execution evidence and the documented defect.")}</p>
          </div>

          <div className="case-toolbar">
            <div className="filter-group" aria-label={t("Filter by test type")}>
              {caseTypes.map((type) => (
                <button type="button" key={type} className={activeType === type ? "active" : ""} onClick={() => setActiveType(type)} aria-pressed={activeType === type}>
                  {t(type)}
                </button>
              ))}
            </div>
            <label className="search-box">
              <span className="sr-only">{t("Search test cases")}</span><SearchIcon />
              <input type="search" placeholder={t("Search cases...")} value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
          </div>

          <div className="case-list" aria-live="polite">
            <div className="case-list-head" aria-hidden="true">
              <span>#</span><span>{t("ID / TYPE")}</span><span>{t("TEST CASE")}</span><span>{t("PRIORITY")}</span><span>{t("STATUS")}</span><span />
            </div>
            {filteredCases.map((testCase, index) => {
              const expanded = selectedCase === testCase.id;
              return (
                <article className={`case-row ${expanded ? "expanded" : ""}`} key={testCase.id}>
                  <button className="case-summary" type="button" onClick={() => setSelectedCase(expanded ? null : testCase.id)} aria-expanded={expanded}>
                    <span className="row-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="case-id"><b>{testCase.id}</b><small>{t(testCase.type)}</small></span>
                    <span className="case-title">{t(testCase.title)}</span>
                    <span className={`priority priority-${testCase.priority.toLowerCase()}`}>{t(testCase.priority)}</span>
                    <ResultBadge result={testCase.result} t={t} />
                    <span className="expand-icon" aria-hidden="true"><ArrowIcon direction="down" /></span>
                  </button>
                  {expanded && (
                    <div className="case-detail">
                      <div><span className="detail-label">{t("Preconditions")}</span><p>{t(testCase.preconditions)}</p></div>
                      <div><span className="detail-label">{t("Steps")}</span><ol>{testCase.steps.map((step) => <li key={step}>{t(step.replace(/^\d+\.\s*/, ""))}</li>)}</ol></div>
                      <div><span className="detail-label">{t("Expected result")}</span><p>{t(testCase.expected)}</p></div>
                      <div><span className="detail-label">{t("Execution note")}</span><p className={testCase.result === "Fail" ? "note-fail" : ""}>{t(testCase.notes || "No execution note recorded.")}</p></div>
                    </div>
                  )}
                </article>
              );
            })}
            {!filteredCases.length && <p className="empty-state">{t("No test cases match this filter.")}</p>}
          </div>
          <div className="case-footer">
            <p>{t("Showing")} {filteredCases.length} {t("of")} {cases.length} {t("test cases")}</p>
            <span aria-hidden="true"><i /><i /><i /><i /><i /></span>
          </div>
        </section>

        <section className="section execution-section" id="execution">
          <div className="section-shell">
            <SectionIndex number="03" label={t("Execution snapshot")} />
            <div className="execution-grid">
              <div className="execution-dial-wrap">
                <div className="execution-dial" style={{ background: `conic-gradient(var(--accent) 0 ${passRate}%, var(--dial-track) ${passRate}% 100%)` }} aria-label={`${passRate}% ${t("pass rate")}`}>
                  <div><strong>{passRate}%</strong><span>{t("pass rate")}</span></div>
                </div>
                <p>{t("TEST")} <ArrowIcon /> {t("EXECUTE")} <ArrowIcon /> {t("VALIDATE")} <ArrowIcon /> {t("IMPROVE")}</p>
              </div>
              <div className="execution-main">
                <h2>{t("Results,")} <span>{t("not just")}<br />{t("intentions.")}</span></h2>
                <p>{t("The latest recorded run reveals one concrete validation issue and a clear next action for regression.")}</p>
                <div className="test-trace" aria-label={t("Test execution trace")}>
                  {cases.map((testCase, index) => (
                    <article className={`trace-node trace-${testCase.result.toLowerCase().replaceAll(" ", "-")}`} key={testCase.id}>
                      <i aria-hidden="true" /><strong>{testCase.id}</strong><span>{t(testCase.title)}</span><b>{t(testCase.result)}</b>
                      {index < cases.length - 1 && <em aria-hidden="true" />}
                    </article>
                  ))}
                </div>
                <div className="execution-summary">
                  <div><strong>{executedCount}</strong><span>{t("Executed")}</span></div>
                  <div><strong className="text-pass">{passCount}</strong><span>{t("Passed")}</span></div>
                  <div><strong className="text-fail">{failCount}</strong><span>{t("Failed")}</span></div>
                  <div><strong>{notRunCount}</strong><span>{t("Not run")}</span></div>
                </div>
              </div>
              <dl className="execution-meta">
                <div><dt>{t("Environment")}</dt><dd>{content.settings.executionEnvironment}</dd></div>
                <div><dt>{t("Last run")}</dt><dd>{formattedRunDate}</dd></div>
              </dl>
            </div>
          </div>
        </section>

        <section className="section section-shell strategy-section" id="strategy">
          <div className="strategy-heading">
            <div>
              <SectionIndex number="04" label={t("Test strategy")} />
              <h2>{t("A deliberate")}<br /><span>{t("testing approach.")}</span></h2>
              <p>{t("The plan balances structured cases with exploratory testing, while keeping scope and release criteria explicit.")}</p>
            </div>
            <div className="workflow" aria-label={t("QA workflow")}>
              {workflowSteps.map((step, index) => (
                <button className={activeWorkflow === index ? "active" : ""} type="button" key={step} onClick={() => setActiveWorkflow(index)} aria-pressed={activeWorkflow === index}>
                  <span>{String(index + 1).padStart(2, "0")}</span><strong>{t(step)}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="strategy-browser">
            <div className="strategy-index" role="tablist" aria-label={t("Test plan sections")}>
              {visibleStrategies.map((section, index) => (
                <button type="button" role="tab" aria-selected={activeStrategy === index} className={activeStrategy === index ? "active" : ""} onClick={() => setActiveStrategy(index)} key={section.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span><strong>{t(section.title)}</strong><ArrowIcon />
                </button>
              ))}
            </div>
            <article className="strategy-detail" role="tabpanel">
              <header><span>{String(activeStrategy + 1).padStart(2, "0")}</span><small>{t("TEST STRATEGY")}</small></header>
              <h3>{t(strategy.title)}</h3>
              <ul>{strategy.items.map((item) => <li key={item}>{t(item)}</li>)}</ul>
              <footer>
                <span>{String(Math.min(activeStrategy + 1, strategyCount)).padStart(2, "0")} / {String(strategyCount).padStart(2, "0")}</span>
                <div>
                  <button type="button" disabled={!strategyCount} onClick={() => setActiveStrategy((activeStrategy + strategyCount - 1) % strategyCount)} aria-label={t("Previous strategy section")}><ArrowIcon /></button>
                  <button type="button" disabled={!strategyCount} onClick={() => setActiveStrategy((activeStrategy + 1) % strategyCount)} aria-label={t("Next strategy section")}><ArrowIcon /></button>
                </div>
              </footer>
            </article>
          </div>
        </section>

        <section className="section defect-section" id="defect">
          <div className="section-shell">
            <div className="defect-layout">
              <div className="defect-heading">
                <SectionIndex number="05" label={t("Defect case study")} />
                <h2>{t("From failure to")}<br /><span>{t("an actionable report.")}</span></h2>
                <p>{t("A real defect, clearly documented from reproduction to impact.")}</p>
                <a href="#cases" className="button defect-back">{t("Back to test cases")} <ArrowIcon /></a>
              </div>

              <article className="bug-file">
                <header>
                  <strong>{content.settings.bugId}</strong><span>{t(portfolioData.bug.status)}</span><div><small>{t("SEVERITY")}</small><b>{portfolioData.bug.severity}</b></div>
                </header>
                <h3>{t(portfolioData.bug.title)}</h3>
                <p className="bug-environment">{t("Environment")}: {portfolioData.bug.environment}</p>
                <div className="bug-steps">
                  <span className="detail-label">{t("Steps to reproduce")}</span>
                  <ol>{portfolioData.bug.steps.map((step) => <li key={step}>{t(step)}</li>)}</ol>
                </div>
                <div className="result-diff">
                  <div className="actual-result"><span>{t("Actual")}</span><p>{t(portfolioData.bug.actual)}</p></div>
                  <div className="expected-result"><span>{t("Expected")}</span><p>{t(portfolioData.bug.expected)}</p></div>
                </div>
              </article>
            </div>
            <div className="impact-rail">
              <strong>{t("WHY IT MATTERS")}</strong>
              <p>{t("Invalid contact data can enter the system, reducing data quality and breaking downstream communication.")}</p>
              <span className="dot-matrix" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="section section-shell data-section">
          <div className="data-heading">
            <SectionIndex number="06" label={t("Test data")} />
            <h2>{t("Repeatable inputs.")} <span>{t("Reliable checks.")}</span></h2>
          </div>
          <div className="data-table-wrap">
            <table>
              <thead><tr><th>{t("Profile")}</th><th>{t("Name")}</th><th>{t("Email")}</th><th>{t("Current address")}</th><th>{t("Permanent address")}</th></tr></thead>
              <tbody>
                {portfolioData.testData.map((profile, index) => (
                  <tr key={`${profile.email}-${index}`}>
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
            <h2>{t("Let's build quality in,")}<br />{t("not bolt it on later.")}</h2>
            <div>
              <p>{t("Explore the full test artifacts, commit history, and future automation roadmap on GitHub.")}</p>
              <a className="button contact-button" href={repositoryUrl} target="_blank" rel="noreferrer">{t("Open GitHub repository")} <ArrowIcon /></a>
            </div>
          </div>
        </section>
      </div>

      <footer className="site-footer">
        <div className="section-shell footer-inner">
          <div><strong>{content.settings.brand}</strong><span>{t("Manual testing portfolio")}</span></div>
          <i aria-hidden="true" />
          <p>{t("Built from living QA artifacts")} · {new Date().getFullYear()}</p>
        </div>
      </footer>
    </main>
  );
}
