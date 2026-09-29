import { defaultPortfolioContent, isPortfolioContent, type PortfolioContent } from "../app/content";
import { publishPortfolioContent } from "../app/admin/publish";
import { adminConfigSchema, portfolioDraftSchema } from "../db/schema";

type Statement = {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
};

type Env = {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DB: { prepare(sql: string): Statement };
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  ADMIN_GITHUB_LOGIN?: string;
  ADMIN_OWNER_EMAIL?: string;
  SESSION_KEY?: string;
};

type GitHubTokens = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  error?: string;
};

type Session = {
  login: string;
  accessToken: string;
  accessExpiresAt: number;
  refreshToken?: string;
  refreshExpiresAt?: number;
};

const apiVersion = "2026-03-10";
const sessionCookieName = "qa_portfolio_session";
const stateCookieName = "qa_portfolio_oauth";
const draftTable = "portfolio_draft";
const configTable = "admin_config";
const maxDraftBytes = 512_000;

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers },
  });
}

function cookie(request: Request, name: string): string | null {
  const item = (request.headers.get("Cookie") ?? "").split("; ").find((part) => part.startsWith(`${name}=`));
  return item ? item.slice(name.length + 1) : null;
}

function encode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decode(value: string): Uint8Array {
  const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function random(size: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(size));
}

function sessionKey(env: Env): Promise<CryptoKey> {
  const bytes = decode(env.SESSION_KEY ?? "");
  if (bytes.length !== 32) throw new Error("SESSION_KEY chưa được cấu hình đúng.");
  return crypto.subtle.importKey("raw", bytes as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptText(value: string, env: Env): Promise<string> {
  const iv = random(12);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, await sessionKey(env), new TextEncoder().encode(value)));
  const combined = new Uint8Array(iv.length + encrypted.length);
  combined.set(iv);
  combined.set(encrypted, iv.length);
  return encode(combined);
}

async function decryptText(value: string, env: Env): Promise<string | null> {
  try {
    const combined = decode(value);
    if (combined.length < 29) return null;
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: combined.slice(0, 12) as BufferSource },
      await sessionKey(env),
      combined.slice(12) as BufferSource,
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

async function seal(session: Session, env: Env): Promise<string> {
  return encryptText(JSON.stringify(session), env);
}

async function unseal(value: string, env: Env): Promise<Session | null> {
  try {
    const raw = await decryptText(value, env);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || !("login" in parsed) || !("accessToken" in parsed) || !("accessExpiresAt" in parsed)) return null;
    const session = parsed as Session;
    if (typeof session.login !== "string" || typeof session.accessToken !== "string" || typeof session.accessExpiresAt !== "number") return null;
    return session;
  } catch {
    return null;
  }
}

function sessionCookie(value: string, maxAge: number): string {
  return `${sessionCookieName}=${value}; Path=/admin-api; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearSession(): string {
  return sessionCookie("", 0);
}

function configured(env: Env): boolean {
  return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.ADMIN_GITHUB_LOGIN && env.SESSION_KEY);
}

async function ensureConfigTable(env: Env): Promise<void> {
  await env.DB.prepare(adminConfigSchema).run();
}

async function withStoredConfig(env: Env): Promise<Env> {
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) return env;
  await ensureConfigTable(env);
  const row = await env.DB.prepare(`SELECT value FROM ${configTable} WHERE id = ?`).bind("github_app").first<{ value: string }>();
  if (!row) return env;
  const plain = await decryptText(row.value, env);
  if (!plain) return env;
  try {
    const parsed: unknown = JSON.parse(plain);
    if (typeof parsed !== "object" || parsed === null || !("clientId" in parsed) || !("clientSecret" in parsed) || typeof parsed.clientId !== "string" || typeof parsed.clientSecret !== "string") return env;
    return { ...env, GITHUB_CLIENT_ID: parsed.clientId, GITHUB_CLIENT_SECRET: parsed.clientSecret };
  } catch {
    return env;
  }
}

function isSiteOwner(request: Request, env: Env): boolean {
  return Boolean(env.ADMIN_OWNER_EMAIL && request.headers.get("oai-authenticated-user-email")?.toLowerCase() === env.ADMIN_OWNER_EMAIL.toLowerCase());
}

async function exchangeCode(code: string, verifier: string, origin: string, env: Env): Promise<GitHubTokens> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      code_verifier: verifier,
      redirect_uri: `${origin}/admin-api/auth/callback`,
    }),
  });
  if (!response.ok) throw new Error("GitHub chưa xác nhận đăng nhập.");
  return response.json() as Promise<GitHubTokens>;
}

async function refresh(session: Session, env: Env): Promise<Session | null> {
  if (session.accessExpiresAt > Date.now() + 60_000) return session;
  if (!session.refreshToken || !session.refreshExpiresAt || session.refreshExpiresAt <= Date.now()) return null;
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
    }),
  });
  if (!response.ok) return null;
  const tokens = await response.json() as GitHubTokens;
  if (!tokens.access_token) return null;
  return {
    login: session.login,
    accessToken: tokens.access_token,
    accessExpiresAt: Date.now() + (tokens.expires_in ?? 28_800) * 1000,
    refreshToken: tokens.refresh_token,
    refreshExpiresAt: tokens.refresh_token_expires_in ? Date.now() + tokens.refresh_token_expires_in * 1000 : undefined,
  };
}

async function authorize(request: Request, env: Env): Promise<{ session: Session; renewedCookie?: string } | null> {
  const sealed = cookie(request, sessionCookieName);
  if (!sealed) return null;
  const oldSession = await unseal(sealed, env);
  if (!oldSession || oldSession.login.toLowerCase() !== env.ADMIN_GITHUB_LOGIN?.toLowerCase()) return null;
  const session = await refresh(oldSession, env);
  if (!session) return null;
  if (session === oldSession) return { session };
  const maxAge = Math.max(0, Math.floor(((session.refreshExpiresAt ?? session.accessExpiresAt) - Date.now()) / 1000));
  return { session, renewedCookie: sessionCookie(await seal(session, env), maxAge) };
}

function withCookie(response: Response, value?: string): Response {
  if (value) response.headers.set("Set-Cookie", value);
  return response;
}

function validate(content: unknown): content is PortfolioContent {
  if (!isPortfolioContent(content)) return false;
  const ids = content.qa.testCases.map((item) => item.id.trim());
  return Boolean(
    content.profile.heroTitleTop.en.trim() && content.profile.heroTitleTop.vi.trim() &&
    content.profile.intro.en.trim() && content.profile.intro.vi.trim() &&
    content.settings.repositoryUrl.startsWith("https://") &&
    content.qa.testCases.length && content.qa.planSections.length && content.qa.bug.title.trim() &&
    ids.every(Boolean) && new Set(ids).size === ids.length &&
    content.qa.executions.every((item) => ids.includes(item.id) && (!item.date || /^\d{4}-\d{2}-\d{2}$/.test(item.date)))
  );
}

async function ensureDraftTable(env: Env): Promise<void> {
  await env.DB.prepare(portfolioDraftSchema).run();
}

async function currentPublished(token: string): Promise<PortfolioContent> {
  const response = await fetch("https://api.github.com/repos/hieunt210703/Qa-Portfolio/contents/content/portfolio.json?ref=main", {
    cache: "no-store",
    headers: { Accept: "application/vnd.github.raw+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": apiVersion },
  });
  if (!response.ok) return defaultPortfolioContent;
  const parsed: unknown = await response.json();
  return isPortfolioContent(parsed) ? parsed : defaultPortfolioContent;
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.startsWith("/admin-api/")) return env.ASSETS.fetch(request);
  if (path === "/admin-api/setup") {
    if (!isSiteOwner(request, env)) return json({ error: "Chỉ chủ sở hữu site có thể thiết lập đăng nhập." }, 403);
    if (!env.SESSION_KEY) return json({ error: "Thiếu khóa bảo vệ phiên đăng nhập." }, 503);
    if (request.method === "GET") {
      const current = await withStoredConfig(env);
      const registrationUrl = new URL("https://github.com/settings/apps/new");
      registrationUrl.searchParams.set("name", "Hieu QA Portfolio Admin");
      registrationUrl.searchParams.set("url", `${url.origin}/admin/`);
      registrationUrl.searchParams.append("callback_urls[]", `${url.origin}/admin-api/auth/callback`);
      registrationUrl.searchParams.set("contents", "write");
      registrationUrl.searchParams.set("webhook_active", "false");
      registrationUrl.searchParams.set("public", "false");
      return json({ configured: configured(current), callbackUrl: `${url.origin}/admin-api/auth/callback`, registrationUrl: registrationUrl.toString() });
    }
    if (request.method === "POST") {
      if (request.headers.get("Origin") !== url.origin) return json({ error: "Yêu cầu không đúng nguồn." }, 403);
      const raw = await request.text();
      if (raw.length > 10_000) return json({ error: "Thông tin thiết lập quá dài." }, 413);
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { return json({ error: "Thông tin thiết lập không hợp lệ." }, 400); }
      if (typeof parsed !== "object" || parsed === null || !("clientId" in parsed) || !("clientSecret" in parsed) || typeof parsed.clientId !== "string" || typeof parsed.clientSecret !== "string" || parsed.clientId.trim().length < 8 || parsed.clientSecret.trim().length < 20) return json({ error: "Nhập Client ID và Client Secret của GitHub App." }, 400);
      await ensureConfigTable(env);
      const encrypted = await encryptText(JSON.stringify({ clientId: parsed.clientId.trim(), clientSecret: parsed.clientSecret.trim() }), env);
      await env.DB.prepare(`INSERT INTO ${configTable} (id, value) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value`).bind("github_app", encrypted).run();
      return json({ configured: true });
    }
    return json({ error: "Phương thức không được hỗ trợ." }, 405);
  }
  env = await withStoredConfig(env);
  if (!configured(env)) return json({ error: "Admin chưa được cấu hình đăng nhập GitHub." }, 503);

  if (path === "/admin-api/auth/start" && request.method === "GET") {
    const state = encode(random(24));
    const verifier = encode(random(32));
    const challenge = encode(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
    const target = new URL("https://github.com/login/oauth/authorize");
    target.searchParams.set("client_id", env.GITHUB_CLIENT_ID!);
    target.searchParams.set("redirect_uri", `${url.origin}/admin-api/auth/callback`);
    target.searchParams.set("state", state);
    target.searchParams.set("code_challenge", challenge);
    target.searchParams.set("code_challenge_method", "S256");
    target.searchParams.set("allow_signup", "false");
    return new Response(null, { status: 302, headers: { Location: target.toString(), "Set-Cookie": `${stateCookieName}=${state}.${verifier}; Path=/admin-api/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600`, "Cache-Control": "no-store" } });
  }

  if (path === "/admin-api/auth/callback" && request.method === "GET") {
    const stored = cookie(request, stateCookieName);
    const [state, verifier] = stored?.split(".") ?? [];
    if (!state || !verifier || state !== url.searchParams.get("state") || !url.searchParams.get("code")) return json({ error: "Phiên đăng nhập GitHub không hợp lệ. Hãy thử lại." }, 400);
    const tokens = await exchangeCode(url.searchParams.get("code")!, verifier, url.origin, env);
    if (!tokens.access_token || tokens.error) return json({ error: "GitHub chưa cấp quyền cho ứng dụng admin." }, 401);
    const userResponse = await fetch("https://api.github.com/user", { headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${tokens.access_token}`, "X-GitHub-Api-Version": apiVersion } });
    if (!userResponse.ok) return json({ error: "Không xác minh được tài khoản GitHub." }, 401);
    const user = await userResponse.json() as { login?: string };
    if (user.login?.toLowerCase() !== env.ADMIN_GITHUB_LOGIN?.toLowerCase()) return json({ error: "Tài khoản GitHub này không được phép quản lý portfolio." }, 403);
    const now = Date.now();
    const session: Session = {
      login: user.login!,
      accessToken: tokens.access_token,
      accessExpiresAt: now + (tokens.expires_in ?? 28_800) * 1000,
      refreshToken: tokens.refresh_token,
      refreshExpiresAt: tokens.refresh_token_expires_in ? now + tokens.refresh_token_expires_in * 1000 : undefined,
    };
    const maxAge = Math.max(0, Math.floor(((session.refreshExpiresAt ?? session.accessExpiresAt) - now) / 1000));
    const headers = new Headers({ Location: "/admin/", "Cache-Control": "no-store" });
    headers.append("Set-Cookie", sessionCookie(await seal(session, env), maxAge));
    headers.append("Set-Cookie", `${stateCookieName}=; Path=/admin-api/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
    return new Response(null, { status: 302, headers });
  }

  if (request.method === "POST" && request.headers.get("Origin") !== url.origin) return json({ error: "Yêu cầu không đúng nguồn." }, 403);
  const auth = await authorize(request, env);
  if (!auth) return withCookie(json({ error: "Vui lòng đăng nhập GitHub." }, 401), clearSession());

  if (path === "/admin-api/session" && request.method === "GET") return withCookie(json({ login: auth.session.login }), auth.renewedCookie);
  if (path === "/admin-api/logout" && request.method === "POST") return withCookie(json({ ok: true }), clearSession());
  if (path === "/admin-api/published" && request.method === "GET") return withCookie(json(await currentPublished(auth.session.accessToken)), auth.renewedCookie);

  if (path === "/admin-api/draft") {
    await ensureDraftTable(env);
    if (request.method === "GET") {
      const draft = await env.DB.prepare(`SELECT content, updated_at FROM ${draftTable} WHERE id = 1`).first<{ content: string; updated_at: string }>();
      return withCookie(json(draft ? { content: JSON.parse(draft.content), updatedAt: draft.updated_at } : { content: null, updatedAt: null }), auth.renewedCookie);
    }
    if (request.method === "POST") {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > maxDraftBytes) return json({ error: "Bản nháp quá lớn." }, 413);
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { return json({ error: "Bản nháp không phải JSON hợp lệ." }, 400); }
      if (!validate(parsed)) return json({ error: "Bản nháp thiếu thông tin hoặc có ID ca kiểm thử không hợp lệ." }, 400);
      const updatedAt = new Date().toISOString();
      await env.DB.prepare(`INSERT INTO ${draftTable} (id, content, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`).bind(raw, updatedAt).run();
      return withCookie(json({ updatedAt }), auth.renewedCookie);
    }
  }

  if (path === "/admin-api/publish" && request.method === "POST") {
    await ensureDraftTable(env);
    const draft = await env.DB.prepare(`SELECT content FROM ${draftTable} WHERE id = 1`).first<{ content: string }>();
    if (!draft) return json({ error: "Hãy lưu bản nháp trước khi xuất bản." }, 400);
    const parsed: unknown = JSON.parse(draft.content);
    if (!validate(parsed)) return json({ error: "Bản nháp chưa đủ thông tin để xuất bản." }, 400);
    const commitUrl = await publishPortfolioContent(parsed, auth.session.accessToken);
    return withCookie(json({ commitUrl }), auth.renewedCookie);
  }

  return json({ error: "Không tìm thấy thao tác." }, 404);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      console.error("Admin request failed", error);
      return json({ error: "Không hoàn tất được thao tác. Hãy thử lại hoặc kiểm tra cấu hình admin." }, 500);
    }
  },
};

export default worker;
