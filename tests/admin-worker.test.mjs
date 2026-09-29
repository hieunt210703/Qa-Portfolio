import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: [fileURLToPath(new URL("../worker/index.ts", import.meta.url))],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  write: false,
});
const worker = (await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`)).default;
const content = JSON.parse(await readFile(new URL("../content/portfolio.json", import.meta.url), "utf8"));

test("GitHub sign-in allows an owner to save a cloud draft and publish without exposing a token to the page", async () => {
  const origin = "https://admin.example";
  const previousFetch = globalThis.fetch;
  let storedDraft = null;
  let oauthGranted = true;
  const githubCalls = [];
  const env = {
    GITHUB_CLIENT_ID: "test-client",
    GITHUB_CLIENT_SECRET: "test-secret",
    ADMIN_GITHUB_LOGIN: "hieunt210703",
    SESSION_KEY: Buffer.alloc(32, 7).toString("base64url"),
    ASSETS: { fetch: async () => new Response("asset") },
    DB: {
      prepare(sql) {
        let bound = [];
        return {
          bind(...values) { bound = values; return this; },
          async first() { return sql.includes("SELECT") ? storedDraft : null; },
          async run() {
            if (sql.includes("INSERT")) storedDraft = { content: bound[0], updated_at: bound[1] };
            return { success: true };
          },
        };
      },
    },
  };
  globalThis.fetch = async (input, options = {}) => {
    const url = String(input);
    githubCalls.push({ url, options });
    if (url === "https://github.com/login/oauth/access_token") return Response.json(oauthGranted ? { access_token: "ghu_test", expires_in: 28_800, refresh_token: "ghr_test", refresh_token_expires_in: 15_897_600 } : { error: "bad_verification_code" });
    if (url.startsWith("https://api.github.com/") && !options.headers?.["User-Agent"]) return Response.json({ message: "User agent required" }, { status: 403 });
    if (url === "https://api.github.com/user") return Response.json({ login: "hieunt210703" });
    if (url.endsWith("/git/ref/heads/main")) return Response.json({ object: { sha: "parent-sha" } });
    if (url.endsWith("/git/commits/parent-sha")) return Response.json({ tree: { sha: "base-tree-sha" } });
    if (url.endsWith("/git/trees")) return Response.json({ sha: "new-tree-sha" });
    if (url.endsWith("/git/commits")) return Response.json({ sha: "new-commit-sha" });
    if (url.endsWith("/git/refs/heads/main")) return Response.json({ object: { sha: "new-commit-sha" } });
    throw new Error(`Unexpected request: ${url}`);
  };
  try {
    const unauthorized = await worker.fetch(new Request(`${origin}/admin-api/draft`, { method: "POST", headers: { Origin: origin }, body: "{}" }), env);
    assert.equal(unauthorized.status, 401);

    const start = await worker.fetch(new Request(`${origin}/admin-api/auth/start`), env);
    assert.equal(start.status, 302);
    const authorizeUrl = new URL(start.headers.get("Location"));
    assert.equal(authorizeUrl.hostname, "github.com");
    assert.ok(authorizeUrl.searchParams.get("code_challenge"));
    const stateValue = start.headers.get("Set-Cookie").match(/qa_portfolio_oauth=([^;]+)/)[1];
    const state = stateValue.split(".")[0];
    const callback = await worker.fetch(new Request(`${origin}/admin-api/auth/callback?state=${state}&code=test-code`, { headers: { Cookie: `qa_portfolio_oauth=${stateValue}` } }), env);
    assert.equal(callback.status, 302);
    const callbackCookies = callback.headers.getSetCookie?.().join("; ") ?? callback.headers.get("Set-Cookie");
    const sessionValue = callbackCookies.match(/qa_portfolio_session=([^;]+)/)[1];
    assert.ok(!sessionValue.includes("ghu_test"));
    const headers = { Cookie: `qa_portfolio_session=${sessionValue}` };

    const session = await worker.fetch(new Request(`${origin}/admin-api/session`, { headers }), env);
    assert.deepEqual(await session.json(), { login: "hieunt210703" });
    const crossOriginSave = await worker.fetch(new Request(`${origin}/admin-api/draft`, { method: "POST", headers: { ...headers, Origin: "https://other.example" }, body: JSON.stringify(content) }), env);
    assert.equal(crossOriginSave.status, 403);
    const save = await worker.fetch(new Request(`${origin}/admin-api/draft`, { method: "POST", headers: { ...headers, Origin: origin }, body: JSON.stringify(content) }), env);
    assert.equal(save.status, 200);
    const draft = await worker.fetch(new Request(`${origin}/admin-api/draft`, { headers }), env);
    assert.deepEqual((await draft.json()).content, content);
    const publish = await worker.fetch(new Request(`${origin}/admin-api/publish`, { method: "POST", headers: { ...headers, Origin: origin } }), env);
    assert.equal(publish.status, 200);
    assert.equal((await publish.json()).commitUrl, "https://github.com/hieunt210703/Qa-Portfolio/commit/new-commit-sha");
    assert.ok(githubCalls.filter((call) => call.url.includes("api.github.com/repos")).every((call) => call.options.headers.Authorization === "Bearer ghu_test"));
    assert.ok(githubCalls.filter((call) => call.url.includes("api.github.com/repos")).every((call) => !String(call.options.body ?? "").includes("test-secret")));
    oauthGranted = false;
    const retry = await worker.fetch(new Request(`${origin}/admin-api/auth/callback?state=${state}&code=used-code`, { headers: { Cookie: `qa_portfolio_oauth=${stateValue}` } }), env);
    assert.equal(retry.status, 401);
    assert.match(retry.headers.get("Content-Type"), /text\/html/);
    assert.match(await retry.text(), /Thử đăng nhập lại/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("owner-only setup stores the GitHub App secret encrypted", async () => {
  const origin = "https://admin.example";
  let configValue = null;
  const env = {
    ADMIN_GITHUB_LOGIN: "hieunt210703",
    ADMIN_OWNER_EMAIL: "owner@example.com",
    SESSION_KEY: Buffer.alloc(32, 9).toString("base64url"),
    ASSETS: { fetch: async () => new Response("asset") },
    DB: {
      prepare(sql) {
        let bound = [];
        return {
          bind(...values) { bound = values; return this; },
          async first() { return sql.includes("SELECT value") && configValue ? { value: configValue } : null; },
          async run() {
            if (sql.includes("INSERT INTO admin_config")) configValue = bound[1];
            return { success: true };
          },
        };
      },
    },
  };
  const setupUrl = `${origin}/admin-api/setup`;
  const forbidden = await worker.fetch(new Request(setupUrl), env);
  assert.equal(forbidden.status, 403);
  const ownerHeaders = { "oai-authenticated-user-email": "owner@example.com" };
  const info = await worker.fetch(new Request(setupUrl, { headers: ownerHeaders }), env);
  assert.equal(info.status, 200);
  assert.equal((await info.json()).configured, false);
  const wrongOrigin = await worker.fetch(new Request(setupUrl, { method: "POST", headers: { ...ownerHeaders, Origin: "https://other.example" }, body: "{}" }), env);
  assert.equal(wrongOrigin.status, 403);
  const save = await worker.fetch(new Request(setupUrl, {
    method: "POST",
    headers: { ...ownerHeaders, Origin: origin },
    body: JSON.stringify({ clientId: "Iv1.testclient", clientSecret: "long-test-client-secret-value" }),
  }), env);
  assert.equal(save.status, 200);
  assert.ok(configValue);
  assert.ok(!configValue.includes("long-test-client-secret-value"));
  const updated = await worker.fetch(new Request(setupUrl, { headers: ownerHeaders }), env);
  assert.equal((await updated.json()).configured, true);
  const login = await worker.fetch(new Request(`${origin}/admin-api/auth/start`), env);
  assert.equal(new URL(login.headers.get("Location")).searchParams.get("client_id"), "Iv1.testclient");
});
