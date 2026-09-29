import initialContent from "../content/portfolio.json";

export type Language = "en" | "vi";
export type LocalizedText = Record<Language, string>;

export type PortfolioContent = {
  schemaVersion: 1;
  settings: {
    brand: string;
    ownerName: string;
    repositoryUrl: string;
    siteTitle: string;
    siteDescription: string;
    runProduct: string;
    runSuite: LocalizedText;
    runEnvironment: string;
    executionEnvironment: string;
    bugId: string;
  };
  profile: {
    heroTitleTop: LocalizedText;
    heroTitleAccent: LocalizedText;
    intro: LocalizedText;
  };
  experience: {
    titleTop: LocalizedText;
    titleAccent: LocalizedText;
    summary: LocalizedText;
    tools: string[];
    projects: Array<{
      id: string;
      name: LocalizedText;
      type: LocalizedText;
      description: LocalizedText;
    }>;
  };
  qa: {
    testCases: Array<{
      id: string;
      title: string;
      type: string;
      priority: string;
      preconditions: string;
      steps: string[];
      expected: string;
    }>;
    executions: Array<{
      id: string;
      title: string;
      executedBy: string;
      date: string;
      result: string;
      notes: string;
    }>;
    testData: Array<{
      name: string;
      email: string;
      current_address: string;
      permanent_address: string;
    }>;
    planSections: Array<{ title: string; items: string[] }>;
    bug: {
      title: string;
      environment: string;
      severity: string;
      status: string;
      steps: string[];
      actual: string;
      expected: string;
    };
  };
  copy: Record<string, LocalizedText>;
};

export const defaultPortfolioContent = initialContent as PortfolioContent;
export const draftStorageKey = "qa-portfolio-admin-draft-v1";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === "string";
const isTextList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isText);
const isLocalized = (value: unknown): value is LocalizedText =>
  isObject(value) && isText(value.en) && isText(value.vi);

export function isPortfolioContent(value: unknown): value is PortfolioContent {
  if (!isObject(value) || value.schemaVersion !== 1) return false;
  const { settings, profile, experience, qa, copy } = value;
  if (!isObject(settings) || ![settings.brand, settings.ownerName, settings.repositoryUrl, settings.siteTitle, settings.siteDescription, settings.runProduct, settings.runEnvironment, settings.executionEnvironment, settings.bugId].every(isText) || !isLocalized(settings.runSuite)) return false;
  if (!isObject(profile) || !isLocalized(profile.heroTitleTop) || !isLocalized(profile.heroTitleAccent) || !isLocalized(profile.intro)) return false;
  if (!isObject(experience) || !isLocalized(experience.titleTop) || !isLocalized(experience.titleAccent) || !isLocalized(experience.summary) || !isTextList(experience.tools) || !Array.isArray(experience.projects)) return false;
  if (!experience.projects.every((project) => isObject(project) && isText(project.id) && isLocalized(project.name) && isLocalized(project.type) && isLocalized(project.description))) return false;
  if (!isObject(qa) || !Array.isArray(qa.testCases) || !Array.isArray(qa.executions) || !Array.isArray(qa.testData) || !Array.isArray(qa.planSections) || !isObject(qa.bug)) return false;
  if (!qa.testCases.every((item) => isObject(item) && [item.id, item.title, item.type, item.priority, item.preconditions, item.expected].every(isText) && isTextList(item.steps))) return false;
  if (!qa.executions.every((item) => isObject(item) && [item.id, item.title, item.executedBy, item.date, item.result, item.notes].every(isText))) return false;
  if (!qa.testData.every((item) => isObject(item) && [item.name, item.email, item.current_address, item.permanent_address].every(isText))) return false;
  if (!qa.planSections.every((item) => isObject(item) && isText(item.title) && isTextList(item.items))) return false;
  if (![qa.bug.title, qa.bug.environment, qa.bug.severity, qa.bug.status, qa.bug.actual, qa.bug.expected].every(isText) || !isTextList(qa.bug.steps)) return false;
  return isObject(copy) && Object.values(copy).every(isLocalized);
}
