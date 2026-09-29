"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { defaultPortfolioContent, draftStorageKey, isPortfolioContent, type LocalizedText, type PortfolioContent } from "../content";
import "./admin.css";

const onlineAdminUrl = "https://hieunt-qa-portfolio.loretaraiche3.chatgpt.site/admin/";
const publicWebsiteUrl = "https://hieunt210703.github.io/Qa-Portfolio/";
type AuthStatus = "checking" | "setup" | "signedIn" | "signedOut" | "local" | "unavailable";

async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/admin-api/${path}`, { credentials: "same-origin", cache: "no-store", ...options });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `Không hoàn tất được yêu cầu (HTTP ${response.status}).`);
  return data;
}

type Tab = "profile" | "experience" | "cases" | "runs" | "strategy" | "defect" | "data" | "copy";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "profile", label: "Giới thiệu & cài đặt" },
  { id: "experience", label: "Kinh nghiệm & dự án" },
  { id: "cases", label: "Ca kiểm thử" },
  { id: "runs", label: "Kết quả thực thi" },
  { id: "strategy", label: "Chiến lược" },
  { id: "defect", label: "Báo cáo lỗi" },
  { id: "data", label: "Dữ liệu kiểm thử" },
  { id: "copy", label: "Nhãn Anh / Việt" },
];

function Field({ label, value, onChange, multiline = false, type = "text", hint }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {multiline
        ? <textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} />
        : <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function LocalizedField({ label, value, onChange, multiline = false }: {
  label: string;
  value: LocalizedText;
  onChange: (language: "en" | "vi", value: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="admin-localized">
      <h3>{label}</h3>
      <div className="admin-two-col">
        <Field label="English" value={value.en} onChange={(text) => onChange("en", text)} multiline={multiline} />
        <Field label="Tiếng Việt" value={value.vi} onChange={(text) => onChange("vi", text)} multiline={multiline} />
      </div>
    </div>
  );
}

function LinesField({ label, values, onChange }: { label: string; values: string[]; onChange: (values: string[]) => void }) {
  return <Field label={label} value={values.join("\n")} onChange={(text) => onChange(text.split("\n"))} multiline hint="Mỗi dòng là một mục." />;
}

function validateForPublish(content: PortfolioContent): string[] {
  const errors: string[] = [];
  if (!content.profile.heroTitleTop.en.trim() || !content.profile.heroTitleTop.vi.trim() || !content.profile.intro.en.trim() || !content.profile.intro.vi.trim()) {
    errors.push("Điền đầy đủ tiêu đề và lời giới thiệu bằng cả hai ngôn ngữ.");
  }
  if (!content.settings.repositoryUrl.startsWith("https://")) errors.push("Liên kết kho mã nguồn phải bắt đầu bằng https://.");
  if (!content.qa.testCases.length) errors.push("Cần ít nhất một ca kiểm thử.");
  if (!content.qa.planSections.length) errors.push("Cần ít nhất một phần chiến lược.");
  if (!content.qa.bug.title.trim()) errors.push("Báo cáo lỗi cần có tiêu đề.");
  const ids = content.qa.testCases.map((item) => item.id.trim());
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) errors.push("ID ca kiểm thử phải có giá trị và không trùng nhau.");
  if (content.qa.executions.some((item) => !ids.includes(item.id))) errors.push("Mỗi kết quả thực thi phải liên kết với một ID ca kiểm thử có trong danh sách.");
  if (content.qa.executions.some((item) => item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date))) errors.push("Ngày thực thi phải có định dạng YYYY-MM-DD.");
  return errors;
}

export default function AdminPage() {
  const [draft, setDraft] = useState<PortfolioContent>(defaultPortfolioContent);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("profile");
  const [notice, setNotice] = useState("");
  const [copySearch, setCopySearch] = useState("");
  const [newCopyKey, setNewCopyKey] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [signedInAs, setSignedInAs] = useState("");
  const [setupInfo, setSetupInfo] = useState<{ callbackUrl: string; registrationUrl: string } | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [setupSaving, setSetupSaving] = useState(false);
  const [publishedContent, setPublishedContent] = useState<PortfolioContent>(defaultPortfolioContent);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [commitUrl, setCommitUrl] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (window.location.hostname === "hieunt210703.github.io") {
        window.location.replace(onlineAdminUrl);
        return;
      }
      let localDraft: PortfolioContent | null = null;
      try {
        const saved = window.localStorage.getItem(draftStorageKey);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (isPortfolioContent(parsed)) {
            localDraft = parsed;
            setDraft(parsed);
          }
          else setNotice("Bản nháp cũ không đúng định dạng. Đang hiển thị nội dung đã xuất bản.");
        }
      } catch {
        setNotice("Không đọc được bản nháp cũ. Đang hiển thị nội dung đã xuất bản.");
      }
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        setAuthStatus("local");
        setReady(true);
        return;
      }
      try {
        const session = await adminRequest<{ login: string }>("session");
        setSignedInAs(session.login);
        const [published, saved] = await Promise.all([
          adminRequest<PortfolioContent>("published"),
          adminRequest<{ content: PortfolioContent | null; updatedAt: string | null }>("draft"),
        ]);
        if (isPortfolioContent(published)) setPublishedContent(published);
        if (saved.content && isPortfolioContent(saved.content)) {
          if (localDraft && JSON.stringify(localDraft) !== JSON.stringify(saved.content)) {
            window.localStorage.setItem(`${draftStorageKey}-backup`, JSON.stringify(localDraft));
            setNotice("Đã tải bản nháp online. Bản nháp cũ trên máy được giữ để bạn khôi phục nếu cần.");
          }
          setDraft(saved.content);
        } else if (!localDraft && isPortfolioContent(published)) setDraft(published);
        setAuthStatus("signedIn");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không kết nối được với admin online.";
        if (message.includes("chưa được cấu hình")) {
          try {
            const setup = await adminRequest<{ configured: boolean; callbackUrl: string; registrationUrl: string }>("setup");
            if (!setup.configured) {
              setSetupInfo(setup);
              setAuthStatus("setup");
              setReady(true);
              return;
            }
          } catch {
            // The owner-only setup endpoint is unavailable here.
          }
        }
        setAuthStatus(message.includes("đăng nhập") ? "signedOut" : "unavailable");
        setNotice(message);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    } catch {
      // The explicit save and download controls report storage failures.
    }
  }, [draft, ready]);

  const edit = (mutate: (next: PortfolioContent) => void) => {
    setDraft((current) => {
      const next = structuredClone(current);
      mutate(next);
      return next;
    });
    setCommitUrl("");
  };

  const copyKeys = useMemo(() => Object.keys(draft.copy).filter((key) => {
    const needle = copySearch.trim().toLowerCase();
    return !needle || [key, draft.copy[key].en, draft.copy[key].vi].some((value) => value.toLowerCase().includes(needle));
  }).sort((first, second) => first.localeCompare(second)), [draft.copy, copySearch]);
  const shownCopyKeys = copyKeys.slice(0, 30);

  const saveDraftOnline = async (content: PortfolioContent) => {
    if (authStatus !== "signedIn") throw new Error("Hãy đăng nhập GitHub để lưu bản nháp online.");
    return adminRequest<{ updatedAt: string }>("draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    });
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      if (authStatus === "signedIn") {
        await saveDraftOnline(draft);
        setNotice("Đã lưu bản nháp online. Website công khai chưa thay đổi.");
      } else {
        setNotice("Đã lưu bản nháp trên máy này. Đăng nhập ở admin online để lưu lên mạng.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể lưu bản nháp. Hãy tải tệp JSON để giữ bản sao.");
    } finally {
      setSaving(false);
    }
  };

  const downloadDraft = () => {
    const blob = new Blob([`${JSON.stringify(draft, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "qa-portfolio-draft.json";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const importDraft = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isPortfolioContent(parsed)) throw new Error("Tệp không đúng định dạng nội dung portfolio.");
      setDraft(parsed);
      setNotice("Đã nhập bản nháp. Bạn có thể xem trước trước khi xuất bản.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không đọc được tệp JSON.");
    }
  };

  const resetDraft = () => {
    if (!window.confirm("Bỏ toàn bộ thay đổi trong bản nháp và trở về nội dung đang xuất bản?")) return;
    setDraft(structuredClone(publishedContent));
    setNotice("Đã khôi phục nội dung từ phiên bản đang xuất bản.");
    setCommitUrl("");
  };

  const restoreLocalBackup = () => {
    try {
      const saved = window.localStorage.getItem(`${draftStorageKey}-backup`);
      const parsed: unknown = saved ? JSON.parse(saved) : null;
      if (!isPortfolioContent(parsed)) throw new Error("Không còn bản nháp cũ trên máy.");
      setDraft(parsed);
      setNotice("Đã khôi phục bản nháp trên máy. Bấm Lưu bản nháp để cập nhật bản online.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không khôi phục được bản nháp cũ.");
    }
  };

  const saveSetup = async () => {
    setSetupSaving(true);
    try {
      await adminRequest("setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      setClientSecret("");
      setNotice("");
      setAuthStatus("signedOut");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không lưu được cấu hình GitHub App.");
    } finally {
      setSetupSaving(false);
    }
  };

  const submitPublish = async () => {
    const errors = validateForPublish(draft);
    if (errors.length) {
      setNotice(errors.join(" "));
      setPublishOpen(false);
      return;
    }
    if (authStatus !== "signedIn") {
      setNotice("Hãy đăng nhập GitHub trên trang admin online để xuất bản.");
      return;
    }
    setPublishing(true);
    setNotice("");
    try {
      await saveDraftOnline(draft);
      const result = await adminRequest<{ commitUrl: string }>("publish", { method: "POST" });
      setCommitUrl(result.commitUrl);
      setPublishOpen(false);
      setNotice("Đã gửi nội dung lên GitHub. Website sẽ cập nhật sau khi quy trình xuất bản hoàn tất.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Xuất bản chưa thành công.");
    } finally {
      setPublishing(false);
    }
  };

  if (authStatus === "checking") {
    return <main className="admin-app admin-gate"><div className="admin-gate-card"><strong>HIEU.NT / QA</strong><h1>Đang mở trang quản lý...</h1></div></main>;
  }

  if (authStatus === "setup") {
    return <main className="admin-app admin-gate"><div className="admin-gate-card admin-setup-card">
      <strong>HIEU.NT / QA</strong>
      <h1>Thiết lập đăng nhập GitHub một lần</h1>
      <p>Tạo GitHub App cho tài khoản của bạn, cấp quyền <b>Contents: Read and write</b> và chỉ cài cho repository <b>Qa-Portfolio</b>. Sau đó điền Client ID và Client Secret bên dưới.</p>
      {setupInfo && <><a href={setupInfo.registrationUrl} target="_blank" rel="noreferrer">Mở trang tạo GitHub App ↗</a><p>Callback URL: <code>{setupInfo.callbackUrl}</code></p></>}
      <div className="admin-setup-fields"><Field label="GitHub App Client ID" value={clientId} onChange={setClientId} /><Field label="GitHub App Client Secret" type="password" value={clientSecret} onChange={setClientSecret} hint="Thông tin này được mã hóa và lưu trong khu vực admin riêng, không đưa vào mã nguồn." /></div>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      <button className="admin-primary admin-setup-button" type="button" disabled={setupSaving || !clientId.trim() || !clientSecret.trim()} onClick={() => void saveSetup()}>{setupSaving ? "Đang lưu..." : "Lưu thiết lập"}</button>
    </div></main>;
  }

  if (authStatus === "signedOut" || authStatus === "unavailable") {
    return <main className="admin-app admin-gate"><div className="admin-gate-card">
      <strong>HIEU.NT / QA</strong>
      <h1>{authStatus === "signedOut" ? "Đăng nhập để quản lý portfolio" : "Admin online chưa sẵn sàng"}</h1>
      <p>{authStatus === "signedOut" ? "Chỉ tài khoản GitHub được phép mới có thể lưu bản nháp online và xuất bản." : notice}</p>
      {authStatus === "signedOut" && <a className="admin-primary admin-login-link" href="/admin-api/auth/start">Đăng nhập bằng GitHub ↗</a>}
      <a href={publicWebsiteUrl}>Xem website công khai</a>
    </div></main>;
  }

  return (
    <main className="admin-app">
      <header className="admin-topbar">
        <div><strong>HIEU.NT / QA</strong><span>Content studio</span></div>
        <div className="admin-top-actions">
          <a href={authStatus === "local" ? "/" : publicWebsiteUrl}>Xem website</a>
          <Link href="/?preview=1" target="_blank" rel="noreferrer">Xem trước bản nháp ↗</Link>
          {authStatus === "signedIn" && <button type="button" onClick={async () => { await adminRequest("logout", { method: "POST" }); setAuthStatus("signedOut"); }}>Đăng xuất {signedInAs}</button>}
          {authStatus === "signedIn" ? <button className="admin-primary" type="button" onClick={() => setPublishOpen(true)}>Xuất bản</button> : <a className="admin-primary" href={onlineAdminUrl}>Mở admin online ↗</a>}
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar" aria-label="Các mục quản lý">
          <p>NỘI DUNG</p>
          <nav>
            {tabs.map((item) => (
              <button key={item.id} type="button" className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)} aria-current={tab === item.id ? "page" : undefined}>{item.label}</button>
            ))}
          </nav>
          <div className="admin-sidebar-note">{authStatus === "signedIn" ? "Bấm Lưu bản nháp để lưu online. Chỉ nút Xuất bản mới cập nhật website công khai." : "Bạn đang xem bản local. Mở admin online và đăng nhập GitHub để lưu hoặc xuất bản."}</div>
        </aside>

        <div className="admin-main">
          <div className="admin-heading">
            <div><span>QUẢN LÝ PORTFOLIO</span><h1>{tabs.find((item) => item.id === tab)?.label}</h1></div>
            <p>Chỉnh sửa bản nháp, mở bản xem trước, sau đó xuất bản khi nội dung đã sẵn sàng.</p>
          </div>
          {notice && <p className="admin-notice" role="status">{notice} {commitUrl && <a href={commitUrl} target="_blank" rel="noreferrer">Xem commit ↗</a>}</p>}

          {tab === "profile" && <div className="admin-stack">
            <section className="admin-card">
              <h2>Phần mở đầu</h2>
              <LocalizedField label="Tiêu đề dòng 1" value={draft.profile.heroTitleTop} onChange={(language, value) => edit((next) => { next.profile.heroTitleTop[language] = value; })} />
              <LocalizedField label="Tiêu đề dòng 2" value={draft.profile.heroTitleAccent} onChange={(language, value) => edit((next) => { next.profile.heroTitleAccent[language] = value; })} />
              <LocalizedField label="Lời giới thiệu" value={draft.profile.intro} multiline onChange={(language, value) => edit((next) => { next.profile.intro[language] = value; })} />
            </section>
            <section className="admin-card">
              <h2>Thông tin website</h2>
              <div className="admin-two-col">
                <Field label="Tên hiển thị" value={draft.settings.brand} onChange={(value) => edit((next) => { next.settings.brand = value; })} />
                <Field label="Họ tên tác giả tài liệu QA" value={draft.settings.ownerName} onChange={(value) => edit((next) => { next.settings.ownerName = value; })} />
                <Field label="Mã báo cáo lỗi" value={draft.settings.bugId} onChange={(value) => edit((next) => { next.settings.bugId = value; })} />
                <Field label="Tiêu đề trình duyệt" value={draft.settings.siteTitle} onChange={(value) => edit((next) => { next.settings.siteTitle = value; })} />
                <Field label="Liên kết GitHub" type="url" value={draft.settings.repositoryUrl} onChange={(value) => edit((next) => { next.settings.repositoryUrl = value; })} />
              </div>
              <Field label="Mô tả chia sẻ" value={draft.settings.siteDescription} multiline onChange={(value) => edit((next) => { next.settings.siteDescription = value; })} />
            </section>
            <section className="admin-card">
              <h2>Thông tin lần chạy mẫu</h2>
              <div className="admin-two-col">
                <Field label="Sản phẩm / website" value={draft.settings.runProduct} onChange={(value) => edit((next) => { next.settings.runProduct = value; })} />
                <Field label="Môi trường ở bảng kết quả" value={draft.settings.runEnvironment} onChange={(value) => edit((next) => { next.settings.runEnvironment = value; })} />
              </div>
              <LocalizedField label="Tên bộ kiểm thử" value={draft.settings.runSuite} onChange={(language, value) => edit((next) => { next.settings.runSuite[language] = value; })} />
              <Field label="Môi trường ở phần thực thi" value={draft.settings.executionEnvironment} onChange={(value) => edit((next) => { next.settings.executionEnvironment = value; })} />
            </section>
          </div>}

          {tab === "experience" && <div className="admin-stack">
            <section className="admin-card">
              <h2>Kinh nghiệm</h2>
              <LocalizedField label="Tiêu đề dòng 1" value={draft.experience.titleTop} onChange={(language, value) => edit((next) => { next.experience.titleTop[language] = value; })} />
              <LocalizedField label="Tiêu đề dòng 2" value={draft.experience.titleAccent} onChange={(language, value) => edit((next) => { next.experience.titleAccent[language] = value; })} />
              <LocalizedField label="Tóm tắt" value={draft.experience.summary} multiline onChange={(language, value) => edit((next) => { next.experience.summary[language] = value; })} />
              <LinesField label="Công cụ đã dùng" values={draft.experience.tools} onChange={(values) => edit((next) => { next.experience.tools = values; })} />
            </section>
            <div className="admin-list-heading"><h2>Dự án ({draft.experience.projects.length})</h2><button type="button" onClick={() => edit((next) => { next.experience.projects.push({ id: `project-${Date.now()}`, name: { en: "New project", vi: "Dự án mới" }, type: { en: "Web and API", vi: "Web và API" }, description: { en: "", vi: "" } }); })}>+ Thêm dự án</button></div>
            {draft.experience.projects.map((project, index) => <section className="admin-card" key={project.id}>
              <div className="admin-card-title"><h3>{project.name.vi || project.name.en || `Dự án ${index + 1}`}</h3><button type="button" className="admin-danger" onClick={() => edit((next) => { next.experience.projects.splice(index, 1); })}>Xóa</button></div>
              <LocalizedField label="Tên dự án" value={project.name} onChange={(language, value) => edit((next) => { next.experience.projects[index].name[language] = value; })} />
              <LocalizedField label="Loại sản phẩm" value={project.type} onChange={(language, value) => edit((next) => { next.experience.projects[index].type[language] = value; })} />
              <LocalizedField label="Nội dung công việc" value={project.description} multiline onChange={(language, value) => edit((next) => { next.experience.projects[index].description[language] = value; })} />
            </section>)}
          </div>}

          {tab === "cases" && <div className="admin-stack">
            <div className="admin-list-heading"><h2>Ca kiểm thử ({draft.qa.testCases.length})</h2><button type="button" onClick={() => edit((next) => { next.qa.testCases.push({ id: `TC-N-${String(Date.now()).slice(-5)}`, title: "", type: "Functional", priority: "Medium", preconditions: "", steps: [""], expected: "" }); })}>+ Thêm ca</button></div>
            {draft.qa.testCases.map((testCase, index) => <section className="admin-card" key={index}>
              <div className="admin-card-title"><h3>{testCase.id || `Ca ${index + 1}`}</h3><button className="admin-danger" type="button" onClick={() => edit((next) => { next.qa.testCases.splice(index, 1); })}>Xóa</button></div>
              <div className="admin-two-col">
                <Field label="ID" value={testCase.id} onChange={(value) => edit((next) => { next.qa.testCases[index].id = value; })} />
                <Field label="Tiêu đề" value={testCase.title} onChange={(value) => edit((next) => { next.qa.testCases[index].title = value; })} />
                <Field label="Loại (Smoke / Functional / Regression)" value={testCase.type} onChange={(value) => edit((next) => { next.qa.testCases[index].type = value; })} />
                <Field label="Ưu tiên" value={testCase.priority} onChange={(value) => edit((next) => { next.qa.testCases[index].priority = value; })} />
              </div>
              <Field label="Điều kiện tiên quyết" value={testCase.preconditions} onChange={(value) => edit((next) => { next.qa.testCases[index].preconditions = value; })} />
              <LinesField label="Các bước" values={testCase.steps} onChange={(values) => edit((next) => { next.qa.testCases[index].steps = values; })} />
              <Field label="Kết quả mong đợi" value={testCase.expected} multiline onChange={(value) => edit((next) => { next.qa.testCases[index].expected = value; })} />
            </section>)}
          </div>}

          {tab === "runs" && <div className="admin-stack">
            <div className="admin-list-heading"><h2>Kết quả thực thi ({draft.qa.executions.length})</h2><button type="button" onClick={() => edit((next) => { const first = next.qa.testCases[0]; next.qa.executions.push({ id: first?.id ?? "", title: first?.title ?? "", executedBy: "", date: new Date().toISOString().slice(0, 10), result: "Not Run", notes: "" }); })}>+ Thêm kết quả</button></div>
            {draft.qa.executions.map((run, index) => <section className="admin-card" key={index}>
              <div className="admin-card-title"><h3>{run.id || `Kết quả ${index + 1}`}</h3><button className="admin-danger" type="button" onClick={() => edit((next) => { next.qa.executions.splice(index, 1); })}>Xóa</button></div>
              <div className="admin-two-col">
                <label className="admin-field"><span>ID ca kiểm thử</span><select value={run.id} onChange={(event) => edit((next) => { const selected = next.qa.testCases.find((item) => item.id === event.target.value); next.qa.executions[index].id = event.target.value; next.qa.executions[index].title = selected?.title ?? ""; })}>{draft.qa.testCases.map((item) => <option key={item.id} value={item.id}>{item.id} — {item.title}</option>)}</select></label>
                <Field label="Tiêu đề bản ghi" value={run.title} onChange={(value) => edit((next) => { next.qa.executions[index].title = value; })} />
                <label className="admin-field"><span>Kết quả</span><select value={run.result} onChange={(event) => edit((next) => { next.qa.executions[index].result = event.target.value; })}><option>Pass</option><option>Fail</option><option>Not Run</option></select></label>
                <Field label="Ngày chạy" type="date" value={run.date} onChange={(value) => edit((next) => { next.qa.executions[index].date = value; })} />
                <Field label="Người thực thi" value={run.executedBy} onChange={(value) => edit((next) => { next.qa.executions[index].executedBy = value; })} />
              </div>
              <Field label="Ghi chú" value={run.notes} multiline onChange={(value) => edit((next) => { next.qa.executions[index].notes = value; })} />
            </section>)}
          </div>}

          {tab === "strategy" && <div className="admin-stack">
            <div className="admin-list-heading"><h2>Kế hoạch kiểm thử ({draft.qa.planSections.length})</h2><button type="button" onClick={() => edit((next) => { next.qa.planSections.push({ title: "New section", items: [""] }); })}>+ Thêm phần</button></div>
            {draft.qa.planSections.map((section, index) => <section className="admin-card" key={index}>
              <div className="admin-card-title"><h3>{String(index + 1).padStart(2, "0")} · {section.title}</h3><button className="admin-danger" type="button" onClick={() => edit((next) => { next.qa.planSections.splice(index, 1); })}>Xóa</button></div>
              <Field label="Tiêu đề" value={section.title} onChange={(value) => edit((next) => { next.qa.planSections[index].title = value; })} />
              <LinesField label="Nội dung" values={section.items} onChange={(values) => edit((next) => { next.qa.planSections[index].items = values; })} />
            </section>)}
          </div>}

          {tab === "defect" && <section className="admin-card admin-stack">
            <h2>Báo cáo lỗi</h2>
            <div className="admin-two-col">
              <Field label="Tiêu đề" value={draft.qa.bug.title} onChange={(value) => edit((next) => { next.qa.bug.title = value; })} />
              <Field label="Môi trường" value={draft.qa.bug.environment} onChange={(value) => edit((next) => { next.qa.bug.environment = value; })} />
              <Field label="Mức độ ưu tiên" value={draft.qa.bug.severity} onChange={(value) => edit((next) => { next.qa.bug.severity = value; })} />
              <Field label="Trạng thái" value={draft.qa.bug.status} onChange={(value) => edit((next) => { next.qa.bug.status = value; })} />
            </div>
            <LinesField label="Các bước tái hiện" values={draft.qa.bug.steps} onChange={(values) => edit((next) => { next.qa.bug.steps = values; })} />
            <div className="admin-two-col">
              <Field label="Kết quả thực tế" value={draft.qa.bug.actual} multiline onChange={(value) => edit((next) => { next.qa.bug.actual = value; })} />
              <Field label="Kết quả mong đợi" value={draft.qa.bug.expected} multiline onChange={(value) => edit((next) => { next.qa.bug.expected = value; })} />
            </div>
          </section>}

          {tab === "data" && <div className="admin-stack">
            <div className="admin-list-heading"><h2>Dữ liệu kiểm thử ({draft.qa.testData.length})</h2><button type="button" onClick={() => edit((next) => { next.qa.testData.push({ name: "", email: "", current_address: "", permanent_address: "" }); })}>+ Thêm dữ liệu</button></div>
            {draft.qa.testData.map((profile, index) => <section className="admin-card" key={index}>
              <div className="admin-card-title"><h3>DATA-{String(index + 1).padStart(2, "0")}</h3><button className="admin-danger" type="button" onClick={() => edit((next) => { next.qa.testData.splice(index, 1); })}>Xóa</button></div>
              <div className="admin-two-col">
                <Field label="Tên" value={profile.name} onChange={(value) => edit((next) => { next.qa.testData[index].name = value; })} />
                <Field label="Email" value={profile.email} onChange={(value) => edit((next) => { next.qa.testData[index].email = value; })} />
                <Field label="Địa chỉ hiện tại" value={profile.current_address} onChange={(value) => edit((next) => { next.qa.testData[index].current_address = value; })} />
                <Field label="Địa chỉ thường trú" value={profile.permanent_address} onChange={(value) => edit((next) => { next.qa.testData[index].permanent_address = value; })} />
              </div>
            </section>)}
          </div>}

          {tab === "copy" && <div className="admin-stack">
            <section className="admin-card"><h2>Nhãn và nội dung song ngữ</h2><p className="admin-help">Các mục ở đây gồm tiêu đề các phần, nút, nhãn và bản dịch của dữ liệu QA. Khi thêm một câu tiếng Anh mới vào ca kiểm thử, thêm đúng câu đó ở đây để có bản tiếng Việt.</p>
              <Field label="Tìm nội dung" value={copySearch} onChange={setCopySearch} />
              <div className="admin-two-col"><Field label="Câu tiếng Anh mới" value={newCopyKey} onChange={setNewCopyKey} /><button className="admin-add-copy" type="button" onClick={() => { const key = newCopyKey.trim(); if (!key) return; if (draft.copy[key]) { setNotice("Câu này đã có trong danh sách."); return; } edit((next) => { next.copy[key] = { en: key, vi: "" }; }); setNewCopyKey(""); }}>+ Thêm câu</button></div>
              <p className="admin-help">Hiển thị {shownCopyKeys.length} / {copyKeys.length} mục phù hợp. Dùng ô tìm kiếm để thu hẹp danh sách.</p>
            </section>
            {shownCopyKeys.map((key) => <section className="admin-card admin-copy-entry" key={key}>
              <div className="admin-card-title"><code>{key}</code><button className="admin-danger" type="button" onClick={() => edit((next) => { delete next.copy[key]; })}>Xóa</button></div>
              <div className="admin-two-col">
                <Field label="English" value={draft.copy[key].en} multiline onChange={(value) => edit((next) => { next.copy[key].en = value; })} />
                <Field label="Tiếng Việt" value={draft.copy[key].vi} multiline onChange={(value) => edit((next) => { next.copy[key].vi = value; })} />
              </div>
            </section>)}
          </div>}

          <div className="admin-bottom-actions">
            <button className="admin-primary" type="button" disabled={saving} onClick={() => void saveDraft()}>{saving ? "Đang lưu..." : authStatus === "signedIn" ? "Lưu bản nháp online" : "Lưu bản nháp trên máy"}</button>
            <button type="button" onClick={downloadDraft}>Tải bản sao JSON</button>
            <button type="button" onClick={() => importRef.current?.click()}>Nhập bản nháp</button>
            <button type="button" onClick={resetDraft}>Khôi phục bản đã xuất bản</button>
            {authStatus === "signedIn" && <button type="button" onClick={restoreLocalBackup}>Khôi phục bản nháp cũ trên máy</button>}
            <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importDraft(file); event.target.value = ""; }} />
          </div>
        </div>
      </div>

      {publishOpen && <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !publishing) setPublishOpen(false); }}>
        <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="publish-title">
          <h2 id="publish-title">Xuất bản portfolio</h2>
          <p>Bản nháp hiện tại sẽ được lưu online rồi cập nhật lên website công khai. Bạn đang đăng nhập bằng GitHub; không cần nhập token.</p>
          <div className="admin-modal-actions"><button type="button" disabled={publishing} onClick={() => setPublishOpen(false)}>Hủy</button><button className="admin-primary" type="button" disabled={publishing} onClick={() => void submitPublish()}>{publishing ? "Đang xuất bản..." : "Xác nhận xuất bản"}</button></div>
        </div>
      </div>}
    </main>
  );
}
