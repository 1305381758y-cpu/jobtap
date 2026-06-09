import { Fragment, FormEvent, ReactNode, useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  Send,
} from 'lucide-react';
import {
  AdminPayload,
  AdminRole,
  AdminStatus,
  AdminUser,
  ApiError,
  EmployerJobPayload,
  Job,
  JobPayload,
  JobStatus,
  approveJob,
  createAdmin,
  createJob,
  getStatistics,
  listAdmins,
  listJobs,
  login,
  submitEmployerJob,
  rejectJob,
  removeJob,
  updateAdmin,
  updateJob,
  StatisticsItem,
} from './api';
import { t, DEFAULT_ADMIN_LOCALE } from './i18n';
import { validateContactLink } from './contactLinkPolicy';
import type { SupportedLocale } from './i18n';
import { COUNTRY_OPTIONS, type CountryOption } from './countryOptions';

type Page = 'review' | 'jobs' | 'statistics' | 'settings';
type View = 'admin' | 'submit' | 'privacy';
type Session = { token: string; email: string; role: AdminRole };
type EmployerJobForm = Omit<EmployerJobPayload, 'city'> & { city: string };
type EmployerJobFormErrors = Partial<Record<keyof EmployerJobForm, string>>;

const initialJobForm: JobPayload = {
  title: '',
  employerName: '',
  countryCode: 'US',
  city: '',
  isRemote: false,
  salaryText: '',
  workTimeText: '',
  description: '',
  contactUrl: '',
  status: 'approved',
};

const initialEmployerJobForm: EmployerJobForm = {
  title: '',
  employerName: '',
  countryCode: 'US',
  city: '',
  isRemote: false,
  salaryText: '',
  workTimeText: '',
  description: '',
  contactUrl: '',
  website: '',
};

const initialAdminForm: AdminPayload = {
  email: '',
  password: '',
  role: 'operator',
  status: 'active',
};

const adminLocale: SupportedLocale = DEFAULT_ADMIN_LOCALE;

const roleLabel: Record<AdminRole, string> = {
  owner: t(adminLocale, 'role.owner'),
  operator: t(adminLocale, 'role.operator'),
};

const adminStatusLabel: Record<AdminStatus, string> = {
  active: t(adminLocale, 'adminStatus.active'),
  disabled: t(adminLocale, 'adminStatus.disabled'),
};

const jobStatusLabel: Record<JobStatus, string> = {
  draft: t(adminLocale, 'jobStatus.draft'),
  pending: t(adminLocale, 'jobStatus.pending'),
  approved: t(adminLocale, 'jobStatus.approved'),
  rejected: t(adminLocale, 'jobStatus.rejected'),
  removed: t(adminLocale, 'jobStatus.removed'),
};

function parseSession(token: string): Session | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { token, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

function getInitialView(): View {
  if (typeof window === 'undefined') return 'admin';
  const search = new URLSearchParams(window.location.search);
  if (search.get('mode') === 'submit' || window.location.pathname === '/submit') return 'submit';
  if (search.get('mode') === 'privacy' || window.location.pathname === '/privacy') return 'privacy';
  return 'admin';
}

function normalizeEmployerJobForm(form: EmployerJobForm): EmployerJobPayload {
  return {
    ...form,
    title: form.title.trim(),
    employerName: form.employerName.trim(),
    countryCode: form.countryCode.trim().toUpperCase(),
    city: form.city.trim() || undefined,
    salaryText: form.salaryText.trim(),
    workTimeText: form.workTimeText.trim(),
    description: form.description.trim(),
    contactUrl: form.contactUrl.trim(),
  };
}

function validateEmployerJobForm(form: EmployerJobPayload): EmployerJobFormErrors {
  const errors: EmployerJobFormErrors = {};
  if (form.title.trim().length < 2) errors.title = '请输入至少 2 个字符的职位标题';
  if (form.title.trim().length > 120) errors.title = '职位标题不能超过 120 个字符';
  if (form.employerName.trim().length < 2) errors.employerName = '请输入雇主名称';
  if (form.employerName.trim().length > 120) errors.employerName = '雇主名称不能超过 120 个字符';
  if (!/^[A-Z]{2}$/.test(form.countryCode.trim().toUpperCase())) errors.countryCode = '请输入 2 位国家代码，例如 US';
  if ((form.city ?? '').trim().length > 120) errors.city = '城市名不能超过 120 个字符';
  if (!form.salaryText.trim()) errors.salaryText = '请输入薪资信息';
  if (form.salaryText.trim().length > 120) errors.salaryText = '薪资信息不能超过 120 个字符';
  if (!form.workTimeText.trim()) errors.workTimeText = '请输入工时或班次信息';
  if (form.workTimeText.trim().length > 120) errors.workTimeText = '工时说明不能超过 120 个字符';
  if (form.description.trim().length < 10) errors.description = '职位描述至少需要 10 个字符';
  if (form.description.trim().length > 5000) errors.description = '职位描述不能超过 5000 个字符';
  if (!form.contactUrl.trim()) {
    errors.contactUrl = '请输入联系链接';
  } else if (form.contactUrl.trim().length > 1000) {
    errors.contactUrl = '联系链接不能超过 1000 个字符';
  } else {
    const result = validateContactLink(form.contactUrl.trim());
    if (result) {
      errors.contactUrl = result;
    }
  }
  return errors;
}

function formatCountryCodeOption(code: string, options: CountryOption[] = []) {
  const option = options.find((entry) => entry.code === code);
  return option ? `${option.code} - ${option.name}` : code;
}

function filterCountryCodeOptions(query: string, options: CountryOption[] = []) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const displayCode = normalized.match(/^([a-z]{2})\s+-\s+/)?.[1];
  const search = displayCode ?? normalized;

  return options.filter((option) => {
    return (
      option.code.toLowerCase().includes(search) ||
      option.name.toLowerCase().includes(search) ||
      option.englishName.toLowerCase().includes(search)
    );
  });
}

function resolveCountryCodeQuery(query: string, options: CountryOption[] = []) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return '';

  const displayMatch = query.trim().match(/^([a-z]{2})\s+-\s+/i);
  if (displayMatch) {
    return displayMatch[1].toUpperCase();
  }

  const exactMatch = options.find((option) => {
    return (
      option.code.toLowerCase() === normalized ||
      option.name.toLowerCase() === normalized ||
      option.englishName.toLowerCase() === normalized
    );
  });
  if (exactMatch) return exactMatch.code;

  const matches = filterCountryCodeOptions(query, options);
  return matches.length === 1 ? matches[0].code : '';
}


function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === 'approved' || status === 'active') return 'chip chip-success';
  if (status === 'pending') return 'chip chip-warning';
  if (status === 'rejected' || status === 'disabled') return 'chip chip-danger';
  return 'chip';
}

function App() {
  const [view] = useState<View>(getInitialView);
  const [session, setSession] = useState<Session | null>(() => {
    const token = localStorage.getItem('jobtap_admin_token');
    return token ? parseSession(token) : null;
  });

  useEffect(() => {
    function clearInvalidSession() {
      localStorage.removeItem('jobtap_admin_token');
      setSession(null);
    }
    window.addEventListener('jobtap:unauthorized', clearInvalidSession);
    return () => window.removeEventListener('jobtap:unauthorized', clearInvalidSession);
  }, []);

  if (view === 'submit') {
    return <EmployerSubmissionPage />;
  }

  if (view === 'privacy') {
    return <PrivacyPolicyPage />;
  }

  if (!session) {
    return <LoginScreen onLogin={setSession} />;
  }

  return <AdminConsole session={session} onLogout={() => {
    localStorage.removeItem('jobtap_admin_token');
    setSession(null);
  }} />;
}

function PrivacyPolicyPage() {
  return (
    <main className="public-page">
      <div className="public-shell">
        <article className="public-card privacy-card">
          <a className="text-link hero-back" href="/">
            JobTap
          </a>
          <div className="privacy-hero">
            <span className="eyebrow">Privacy Policy</span>
            <h1>JobTap Privacy Policy</h1>
            <p>
              Effective date: June 2, 2026. JobTap helps users browse part-time job
              listings and contact employers through external links. This Privacy
              Policy explains what information we collect, how we use it, and how
              users can contact us.
            </p>
          </div>

          <section className="privacy-section">
            <h2>Scope</h2>
            <p>
              This policy applies to the JobTap Android app and related JobTap services.
              The current mobile app is Android-only. Mobile job seekers do not need to
              create an account, log in, or submit a resume to use JobTap.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Information We Collect</h2>
            <h3>Anonymous Device Identifier</h3>
            <p>
              JobTap creates and stores an anonymous device identifier on your device.
              We use this identifier to count unique app installations, deduplicate
              analytics, and understand app usage. This identifier is not linked to a
              JobTap user account because the mobile app does not have user accounts.
            </p>
            <h3>Country Code</h3>
            <p>
              JobTap uses a country code to show job listings relevant to your country.
              The country code may come from your device region settings, request
              metadata, or IP-based infrastructure headers when device region is
              unavailable or invalid. JobTap does not collect precise GPS location in
              the current mobile app.
            </p>
            <h3>App Analytics</h3>
            <p>JobTap collects basic app interaction events, including:</p>
            <ul>
              <li><code>app_open</code></li>
              <li><code>job_list_view</code></li>
              <li><code>job_detail_view</code></li>
              <li><code>contact_click</code></li>
            </ul>
            <p>
              For <code>job_detail_view</code> and <code>contact_click</code>, JobTap may
              include the related job ID. Analytics events may also include app version,
              platform, locale, countryCode, anonymous deviceId, and source screen.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Information We Do Not Collect From Mobile Job Seekers</h2>
            <p>
              JobTap does not require mobile job seekers to create an account. In the
              current Android app, JobTap does not collect resumes, job applications,
              profile photos, names, passwords, or job-seeker email addresses.
            </p>
          </section>

          <section className="privacy-section">
            <h2>External Contact Links</h2>
            <p>
              When you tap a contact link, JobTap opens an external app or website such
              as phone, email, WhatsApp, Telegram, SMS, or a web page. Communication
              with employers happens outside JobTap and may be governed by the privacy
              policies of those external services.
            </p>
            <p>
              JobTap records that the contact button was tapped for analytics and
              deduplication. JobTap does not collect the contents of calls, emails, SMS
              messages, chats, or conversations that happen outside the app.
            </p>
          </section>

          <section className="privacy-section">
            <h2>How We Use Information</h2>
            <ul>
              <li>Show job listings matched to your country.</li>
              <li>Operate and secure the app.</li>
              <li>Measure unique active users and job engagement.</li>
              <li>Count job detail views and contact clicks.</li>
              <li>Calculate aggregate contact click rates.</li>
              <li>Improve app reliability and user experience.</li>
              <li>Prevent spam, abuse, and duplicate analytics counting.</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>Sharing</h2>
            <p>
              We do not sell mobile-user data. We do not share mobile-user data with
              third-party advertising networks. Infrastructure providers may process
              data only as needed to host, operate, secure, or monitor JobTap.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Retention</h2>
            <p>
              Analytics and operational records are retained only as long as needed for
              app operation, analytics, security, legal, or business purposes.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Security</h2>
            <p>
              Production traffic uses HTTPS encryption in transit. Access to
              administrative systems is limited to authorized operators.
            </p>
          </section>

          <section className="privacy-section">
            <h2>User Choices and Deletion Requests</h2>
            <p>
              Because the mobile app does not have user accounts, deletion requests may
              require the anonymous device identifier or other information needed to
              locate records. Users can contact us to request access or deletion.
            </p>
            <p>
              Contact: <a href="mailto:privacy@jobtap.work">privacy@jobtap.work</a>
            </p>
          </section>

          <section className="privacy-section">
            <h2>Children</h2>
            <p>
              JobTap is intended for job seekers and employers. Final target audience
              and age settings must be confirmed in Google Play Console before
              publication.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Changes</h2>
            <p>
              We may update this policy from time to time. The updated policy will be
              published at <a href="https://jobtap.work/privacy">https://jobtap.work/privacy</a>
              with a new effective date.
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}

function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState('admin@jobtap.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(email, password);
      const nextSession = parseSession(result.accessToken);
      if (!nextSession) throw new Error('Invalid token');
      localStorage.setItem('jobtap_admin_token', result.accessToken);
      onLogin(nextSession);
    } catch {
      setError('邮箱或密码错误');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark">JT</div>
        <h1>JobTap 点职</h1>
        <h2>管理后台</h2>
        <label>
          邮箱
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" />
        </label>
        <label>
          密码
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
        </label>
        {error ? <div className="form-error"><AlertCircle size={16} />{error}</div> : null}
        <button className="primary-button" disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>
        <a className="text-link" href="/?mode=submit">
          招聘方公开提交入口
        </a>
      </form>
    </main>
  );
}

function EmployerSubmissionPage() {
  const [form, setForm] = useState<EmployerJobForm>(initialEmployerJobForm);
  const [errors, setErrors] = useState<EmployerJobFormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submittedJob, setSubmittedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const countryOptions = COUNTRY_OPTIONS;
  const [countryQuery, setCountryQuery] = useState(() => formatCountryCodeOption(initialEmployerJobForm.countryCode, COUNTRY_OPTIONS));
  const [countryOpen, setCountryOpen] = useState(false);

  function updateField<K extends keyof EmployerJobForm>(key: K, value: EmployerJobForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function selectCountry(code: string) {
    updateField('countryCode', code);
    setCountryQuery(formatCountryCodeOption(code, countryOptions));
    setCountryOpen(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const resolvedCountryCode = resolveCountryCodeQuery(countryQuery, countryOptions);
    if (!resolvedCountryCode) {
      setErrors((current) => ({ ...current, countryCode: '请从下拉中选择一个国家' }));
      return;
    }

    const normalized = normalizeEmployerJobForm({
      ...form,
      countryCode: resolvedCountryCode,
    });
    const nextErrors = validateEmployerJobForm(normalized);
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const job = await submitEmployerJob(normalized);
      setSubmittedJob(job);
      setForm(initialEmployerJobForm);
      setCountryQuery(formatCountryCodeOption(initialEmployerJobForm.countryCode, countryOptions));
      setErrors({});
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : '提交失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="public-page">
      <div className="public-shell">
        <section className="public-card">
          <a className="text-link hero-back" href="/?mode=submit">
            JobTap 点职
          </a>
          {submittedJob ? (
            <div className="success-card">
              <div className="success-icon">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h2>已收到提交</h2>
                <p>
                  {submittedJob.title} 已进入审核队列。我们会尽快处理，职位 ID 为
                  <span className="mono-inline"> {submittedJob.id.slice(0, 8)}</span>。
                </p>
              </div>
              <button className="secondary-button" onClick={() => setSubmittedJob(null)}>
                再提交一条
              </button>
            </div>
          ) : null}

          <div className="public-card-header">
            <div>
              <span className="eyebrow">职位信息</span>
              <h2>招聘方提交表单</h2>
            </div>
            <span className="chip chip-warning">审核后发布</span>
          </div>

          {submitError ? <div className="form-error"><AlertCircle size={16} />{submitError}</div> : null}

          <form className="public-form" onSubmit={submit}>
            <div className="form-grid">
              <label>
                <span>职位标题 *</span>
                <input
                  required
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  aria-invalid={Boolean(errors.title)}
                  placeholder="例如 Senior Frontend Engineer"
                />
                {errors.title ? <small>{errors.title}</small> : null}
              </label>
              <label>
                <span>雇主名称 *</span>
                <input
                  required
                  value={form.employerName}
                  onChange={(event) => updateField('employerName', event.target.value)}
                  aria-invalid={Boolean(errors.employerName)}
                  placeholder="公司或团队名称"
                />
                {errors.employerName ? <small>{errors.employerName}</small> : null}
              </label>
            </div>

            <div className="form-grid">
              <label className="country-combobox">
                <span>国家代码 *</span>
                <input
                  required
                  value={countryQuery}
                  onFocus={() => setCountryOpen(true)}
                  onChange={(event) => {
                    setCountryQuery(event.target.value);
                    setCountryOpen(true);
                    const resolved = resolveCountryCodeQuery(event.target.value, countryOptions);
                    if (resolved) {
                      updateField('countryCode', resolved);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setCountryOpen(false), 120);
                    const resolved = resolveCountryCodeQuery(countryQuery, countryOptions);
                    if (resolved) {
                      selectCountry(resolved);
                    }
                  }}
                  aria-invalid={Boolean(errors.countryCode)}
                  placeholder="搜索国家代码或国家名"
                  autoComplete="off"
                />
                <div className={`country-dropdown ${countryOpen ? 'open' : ''}`}>
                  {countryOpen ? (
                    filterCountryCodeOptions(countryQuery, countryOptions).length > 0 ? (
                      filterCountryCodeOptions(countryQuery, countryOptions).map((option) => (
                        <button
                          key={option.code}
                          type="button"
                          className="country-option"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectCountry(option.code)}
                        >
                          <strong>{option.code}</strong>
                          <span>{option.name}</span>
                        </button>
                      ))
                    ) : (
                      <div className="country-empty">没有匹配的国家代码</div>
                    )
                  ) : null}
                </div>
                {errors.countryCode ? <small>{errors.countryCode}</small> : null}
              </label>
              <label>
                <span>城市</span>
                <input
                  value={form.city}
                  onChange={(event) => updateField('city', event.target.value)}
                  aria-invalid={Boolean(errors.city)}
                  placeholder="New York / 北京 / Remote"
                />
                {errors.city ? <small>{errors.city}</small> : null}
              </label>
            </div>

            <div className="form-grid">
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={form.isRemote}
                  onChange={(event) => updateField('isRemote', event.target.checked)}
                />
                <span>这是远程职位</span>
              </label>
              <div className="field-note">
                远程职位会在审核时做标记，便于站内展示。
              </div>
            </div>

            <div className="form-grid">
              <label>
                <span>薪资说明 *</span>
                <input
                  required
                  value={form.salaryText}
                  onChange={(event) => updateField('salaryText', event.target.value)}
                  aria-invalid={Boolean(errors.salaryText)}
                  placeholder="例如 $3k-$5k / 月"
                />
                {errors.salaryText ? <small>{errors.salaryText}</small> : null}
              </label>
              <label>
                <span>工时说明 *</span>
                <input
                  required
                  value={form.workTimeText}
                  onChange={(event) => updateField('workTimeText', event.target.value)}
                  aria-invalid={Boolean(errors.workTimeText)}
                  placeholder="例如 Full-time / 9:00-18:00"
                />
                {errors.workTimeText ? <small>{errors.workTimeText}</small> : null}
              </label>
            </div>

            <label>
              <span>联系链接 *</span>
              <input
                required
                value={form.contactUrl}
                onChange={(event) => updateField('contactUrl', event.target.value)}
                aria-invalid={Boolean(errors.contactUrl)}
                placeholder="https://..."
              />
              {errors.contactUrl ? <small>{errors.contactUrl}</small> : null}
            </label>

            <label>
              <span>职位描述 *</span>
              <textarea
                required
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                aria-invalid={Boolean(errors.description)}
                placeholder="介绍岗位职责、要求、团队背景、福利等"
              />
              {errors.description ? <small>{errors.description}</small> : null}
            </label>

            <label className="honeypot-field" aria-hidden="true">
              Website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={form.website ?? ''}
                onChange={(event) => updateField('website', event.target.value)}
              />
            </label>

            <div className="public-form-footer">
              <p>提交后会先进入审核队列，不会立即公开展示。</p>
              <button className="primary-button inline submit-button" disabled={loading}>
                <Send size={16} />
                {loading ? '提交中...' : '提交职位'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function AdminConsole({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [page, setPage] = useState<Page>('review');
  const nav = [
    { id: 'review' as Page, label: '审核队列', icon: CheckCircle2 },
    { id: 'jobs' as Page, label: '职位管理', icon: BriefcaseBusiness },
    { id: 'statistics' as Page, label: '数据统计', icon: BarChart3 },
    { id: 'settings' as Page, label: '设置', icon: Settings },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark small">JT</div>
          <div>
            <strong>JobTap 点职</strong>
            <span>管理后台</span>
          </div>
        </div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                onClick={() => setPage(item.id)}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <button className="logout-button" onClick={onLogout}>
          <LogOut size={17} />
          退出登录
        </button>
      </aside>
      <section className="workspace">
        {page === 'review' ? <ReviewQueue token={session.token} /> : null}
        {page === 'jobs' ? <JobsPage token={session.token} /> : null}
        {page === 'statistics' ? <StatisticsPage token={session.token} /> : null}
        {page === 'settings' ? <SettingsPage session={session} onLogout={onLogout} /> : null}
      </section>
    </div>
  );
}

function ReviewQueue({ token }: { token: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setJobs(await listJobs(token, { status: 'pending', source: 'employer_submitted' }));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function act(action: 'approve' | 'reject', job: Job) {
    try {
      if (action === 'approve') {
        await approveJob(token, job.id);
      } else {
        const reason = window.prompt('拒绝原因', '信息不完整');
        if (!reason) return;
        await rejectJob(token, job.id, reason);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '操作失败');
    }
  }

  return (
    <PageFrame title="审核队列" error={error}>
      <div className="panel">
        <TableToolbar title="待审核职位" meta={`${jobs.length} 条`} />
        <table>
          <thead>
            <tr>
              <th>职位</th>
              <th>雇主</th>
              <th>国家</th>
              <th>薪资</th>
              <th>工时</th>
              <th>提交时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={7} /> : jobs.map((job) => {
              const expanded = expandedJobId === job.id;
              return (
                <Fragment key={job.id}>
                  <tr>
                    <td>
                      <strong>{job.title}</strong>
                      <span className="muted block">{job.id.slice(0, 8)}</span>
                    </td>
                    <td>{job.employerName}</td>
                    <td>{job.countryCode}</td>
                    <td>{job.salaryText}</td>
                    <td>{job.workTimeText}</td>
                    <td>{formatDate(job.createdAt)}</td>
                    <td className="actions">
                      <button onClick={() => setExpandedJobId(expanded ? null : job.id)}>
                        {expanded ? '收起详情' : '查看详情'}
                      </button>
                      <button onClick={() => void act('approve', job)}>通过</button>
                      <button className="danger-link" onClick={() => void act('reject', job)}>拒绝</button>
                    </td>
                  </tr>
                  {expanded ? (
                    <tr className="detail-row">
                      <td colSpan={7}>
                        <div className="review-detail-card">
                          <div className="detail-grid">
                            <DetailItem label="岗位 ID" value={job.id} mono />
                            <DetailItem label="城市" value={job.city || '-'} />
                            <DetailItem label="远程" value={job.isRemote ? '是' : '否'} />
                            <DetailItem label="来源" value={job.source === 'employer_submitted' ? '雇主提交' : '后台创建'} />
                          </div>
                          <div className="detail-section">
                            <span>职位描述</span>
                            <p>{job.description}</p>
                          </div>
                          <div className="detail-section">
                            <span>联系链接</span>
                            <div className="contact-preview">
                              <code>{job.contactUrl}</code>
                              <a href={job.contactUrl} target="_blank" rel="noreferrer noopener">
                                打开测试
                              </a>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {!loading && jobs.length === 0 ? <EmptyRow colSpan={7} /> : null}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}

function JobsPage({ token }: { token: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filters, setFilters] = useState({ status: '', countryCode: '', source: '', search: '' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [form, setForm] = useState<JobPayload>(initialJobForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setJobs(await listJobs(token, filters));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditingJob(null);
    setForm(initialJobForm);
    setDrawerOpen(true);
  }

  function openEdit(job: Job) {
    setEditingJob(job);
    setForm({
      title: job.title,
      employerName: job.employerName,
      countryCode: job.countryCode,
      city: job.city ?? '',
      isRemote: job.isRemote,
      salaryText: job.salaryText,
      workTimeText: job.workTimeText,
      description: job.description,
      contactUrl: job.contactUrl,
      status: job.status,
    });
    setDrawerOpen(true);
  }

  async function submitJob(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateEmployerJobForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setError(Object.values(nextErrors).filter(Boolean)[0] ?? '请检查职位表单');
      return;
    }
    try {
      if (editingJob) {
        await updateJob(token, editingJob.id, form);
      } else {
        await createJob(token, form);
      }
      setDrawerOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败');
    }
  }

  async function remove(job: Job) {
    try {
      await removeJob(token, job.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '移除失败');
    }
  }

  return (
    <PageFrame title="职位管理" error={error}>
      <div className="filter-panel">
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="">全部状态</option>
          {Object.entries(jobStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={filters.source} onChange={(event) => setFilters({ ...filters, source: event.target.value })}>
          <option value="">全部来源</option>
          <option value="employer_submitted">雇主提交</option>
          <option value="admin_created">后台创建</option>
        </select>
        <input placeholder="国家代码" value={filters.countryCode} onChange={(event) => setFilters({ ...filters, countryCode: event.target.value.toUpperCase() })} />
        <input placeholder="搜索职位 ID / 标题" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <button onClick={() => void load()}>查询</button>
        <button onClick={() => setFilters({ status: '', countryCode: '', source: '', search: '' })}>重置</button>
        <button className="primary-button inline" onClick={openCreate}><Plus size={16} />新增职位</button>
      </div>
      <div className="panel">
        <TableToolbar title="职位列表" meta={`${jobs.length} 条`} />
        <table>
          <thead>
            <tr>
              <th>职位</th>
              <th>雇主</th>
              <th>国家</th>
              <th>远程</th>
              <th>薪资</th>
              <th>状态</th>
              <th>来源</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={9} /> : jobs.map((job) => (
              <tr key={job.id}>
                <td>
                  <strong>{job.title}</strong>
                  <span className="muted block">{job.id.slice(0, 8)}</span>
                </td>
                <td>{job.employerName}</td>
                <td>{job.countryCode}</td>
                <td>{job.isRemote ? '是' : '否'}</td>
                <td>{job.salaryText}</td>
                <td><span className={statusClass(job.status)}>{jobStatusLabel[job.status]}</span></td>
                <td>{job.source === 'admin_created' ? '后台创建' : '雇主提交'}</td>
                <td>{formatDate(job.updatedAt)}</td>
                <td className="actions">
                  <button onClick={() => openEdit(job)}>编辑</button>
                  <button className="danger-link" onClick={() => void remove(job)}>移除</button>
                </td>
              </tr>
            ))}
            {!loading && jobs.length === 0 ? <EmptyRow colSpan={9} /> : null}
          </tbody>
        </table>
      </div>
      {drawerOpen ? (
        <Drawer title={editingJob ? '编辑职位' : '新增职位'} onClose={() => setDrawerOpen(false)}>
          <JobForm form={form} setForm={setForm} onSubmit={submitJob} submitLabel={editingJob ? '保存职位' : '创建职位'} />
        </Drawer>
      ) : null}
    </PageFrame>
  );
}

function StatisticsPage({ token }: { token: string }) {
  const [filters, setFilters] = useState({ range: 'all', countryCode: '', jobId: '', startDate: '', endDate: '' });
  const [items, setItems] = useState<StatisticsItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const result = await getStatistics(token, filters);
      setItems(result.items);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const activeUsersByCountry = new Map<string, number>();
  items.forEach((item) => {
    activeUsersByCountry.set(item.countryCode, item.activeUsers);
  });
  const totals = items.reduce(
    (sum, item) => ({
      detailViews: sum.detailViews + item.detailViews,
      contactClicks: sum.contactClicks + item.contactClicks,
    }),
    { detailViews: 0, contactClicks: 0 },
  );
  const countryActiveUsers = Array.from(activeUsersByCountry.values()).reduce((sum, value) => sum + value, 0);
  const averageRate = totals.detailViews ? totals.contactClicks / totals.detailViews : 0;

  return (
    <PageFrame title="数据统计" error={error}>
      <div className="filter-panel">
        <select value={filters.range} onChange={(event) => setFilters({ ...filters, range: event.target.value })}>
          <option value="all">全部</option>
          <option value="today">今日</option>
          <option value="last7">近 7 天</option>
          <option value="last30">近 30 天</option>
        </select>
        <input placeholder="国家代码" value={filters.countryCode} onChange={(event) => setFilters({ ...filters, countryCode: event.target.value.toUpperCase() })} />
        <input placeholder="职位 ID" value={filters.jobId} onChange={(event) => setFilters({ ...filters, jobId: event.target.value })} />
        <input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} />
        <input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} />
        <button onClick={() => void load()}>查询</button>
        <button onClick={() => setFilters({ range: 'all', countryCode: '', jobId: '', startDate: '', endDate: '' })}>重置</button>
      </div>
      <div className="metric-grid">
        <MetricCard label="国家活跃人数" value={countryActiveUsers.toLocaleString()} />
        <MetricCard label="浏览详情人数" value={totals.detailViews.toLocaleString()} />
        <MetricCard label="点击联系人数" value={totals.contactClicks.toLocaleString()} />
        <MetricCard label="联系点击率" value={`${(averageRate * 100).toFixed(1)}%`} />
      </div>
      <div className="panel">
        <TableToolbar title="统计明细" meta={`${items.length} 条`} />
        <table>
          <thead>
            <tr>
              <th>国家</th>
              <th>岗位id</th>
              <th>活跃人数</th>
              <th>浏览详情人数</th>
              <th>点击联系人数</th>
              <th>联系点击率</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={6} /> : items.map((item) => (
              <tr key={`${item.countryCode}-${item.jobId}`}>
                <td>{item.countryCode}</td>
                <td className="mono">{item.jobId}</td>
                <td>{item.activeUsers}</td>
                <td>{item.detailViews}</td>
                <td>{item.contactClicks}</td>
                <td>{item.contactClickRate === null ? '-' : `${(item.contactClickRate * 100).toFixed(1)}%`}</td>
              </tr>
            ))}
            {!loading && items.length === 0 ? <EmptyRow colSpan={6} /> : null}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}

function SettingsPage({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(initialAdminForm);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setAdmins(await listAdmins(session.token));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreateAdmin() {
    setEditingAdmin(null);
    setForm(initialAdminForm);
    setConfirmPassword('');
    setDrawerMode('create');
  }

  function openEditAdmin(admin: AdminUser) {
    setEditingAdmin(admin);
    setForm({
      email: admin.email,
      password: '',
      role: admin.role,
      status: admin.status,
    });
    setConfirmPassword('');
    setDrawerMode('edit');
  }

  async function submitAdmin(event: FormEvent) {
    event.preventDefault();
    try {
      if (drawerMode === 'edit' && editingAdmin) {
        await updateAdmin(session.token, editingAdmin.id, {
          role: form.role,
          status: form.status,
        });
      } else {
        if (form.password !== confirmPassword) {
          setError('两次密码不一致');
          return;
        }
        await createAdmin(session.token, form);
      }
      setForm(initialAdminForm);
      setConfirmPassword('');
      setEditingAdmin(null);
      setDrawerMode(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败');
    }
  }

  async function toggleStatus(admin: AdminUser) {
    try {
      await updateAdmin(session.token, admin.id, {
        status: admin.status === 'active' ? 'disabled' : 'active',
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '更新失败');
    }
  }

  return (
    <PageFrame title="设置" error={error}>
      <div className="account-card">
        <div className="account-icon"><ShieldCheck size={22} /></div>
        <div>
          <span className="muted">当前账号</span>
          <strong>{session.email}</strong>
        </div>
        <span className="chip chip-success">{roleLabel[session.role]}</span>
        <button onClick={onLogout}>退出登录</button>
      </div>
      <div className="panel">
        <TableToolbar
          title="管理账户"
          meta={`${admins.length} 个`}
          action={<button className="primary-button inline" onClick={openCreateAdmin}><Plus size={16} />新增管理账户</button>}
        />
        <table>
          <thead>
            <tr>
              <th>邮箱</th>
              <th>角色</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>最近登录</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={6} /> : admins.map((admin) => (
              <tr key={admin.id}>
                <td>{admin.email}</td>
                <td>{roleLabel[admin.role]}</td>
                <td><span className={statusClass(admin.status)}>{adminStatusLabel[admin.status]}</span></td>
                <td>{formatDate(admin.createdAt)}</td>
                <td>{formatDate(admin.lastLoginAt)}</td>
                <td className="actions">
                  <button onClick={() => openEditAdmin(admin)}>编辑</button>
                  <button className="danger-link" onClick={() => void toggleStatus(admin)}>
                    {admin.status === 'active' ? '停用' : '启用'}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && admins.length === 0 ? <EmptyRow colSpan={6} /> : null}
          </tbody>
        </table>
      </div>
      {drawerMode ? (
        <Drawer title={drawerMode === 'create' ? '新增管理账户' : '编辑管理账户'} onClose={() => setDrawerMode(null)}>
          <form className="drawer-form" onSubmit={submitAdmin}>
            <label>邮箱<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="username" disabled={drawerMode === 'edit'} /></label>
            {drawerMode === 'create' ? (
              <>
                <label>密码<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" /></label>
                <label>确认密码<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" /></label>
              </>
            ) : null}
            <label>角色<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as AdminRole })}>
              <option value="owner">超级管理员</option>
              <option value="operator">运营管理员</option>
            </select></label>
            <label>状态<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AdminStatus })}>
              <option value="active">启用</option>
              <option value="disabled">停用</option>
            </select></label>
            <div className="drawer-actions">
              <button type="button" onClick={() => setDrawerMode(null)}>取消</button>
              <button className="primary-button">{drawerMode === 'create' ? '创建账户' : '保存账户'}</button>
            </div>
          </form>
        </Drawer>
      ) : null}
    </PageFrame>
  );
}

function DetailItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong className={mono ? 'mono' : undefined}>{value}</strong>
    </div>
  );
}

function JobForm({
  form,
  setForm,
  onSubmit,
  submitLabel,
}: {
  form: JobPayload;
  setForm: (form: JobPayload) => void;
  onSubmit: (event: FormEvent) => void;
  submitLabel: string;
}) {
  return (
    <form className="drawer-form" onSubmit={onSubmit}>
      <label>职位标题<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
      <label>雇主名称<input value={form.employerName} onChange={(event) => setForm({ ...form, employerName: event.target.value })} /></label>
      <div className="form-grid">
        <label>国家代码<input value={form.countryCode} onChange={(event) => setForm({ ...form, countryCode: event.target.value.toUpperCase() })} /></label>
        <label>城市<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
      </div>
      <label>薪资<input value={form.salaryText} onChange={(event) => setForm({ ...form, salaryText: event.target.value })} /></label>
      <label>工时<input value={form.workTimeText} onChange={(event) => setForm({ ...form, workTimeText: event.target.value })} /></label>
      <label>联系链接<input value={form.contactUrl} onChange={(event) => setForm({ ...form, contactUrl: event.target.value })} /></label>
      <label>状态<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as JobStatus })}>
        <option value="draft">草稿</option>
        <option value="pending">待审核</option>
        <option value="approved">已通过</option>
        <option value="rejected">已拒绝</option>
        <option value="removed">已移除</option>
      </select></label>
      <label className="checkbox-row"><input type="checkbox" checked={form.isRemote} onChange={(event) => setForm({ ...form, isRemote: event.target.checked })} />远程职位</label>
      <label>职位描述<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      <div className="drawer-actions">
        <button className="primary-button">{submitLabel}</button>
      </div>
    </form>
  );
}

function PageFrame({ title, error, children }: { title: string; error?: string; children: ReactNode }) {
  return (
    <div className="page">
      <header className="page-header">
        <h1>{title}</h1>
      </header>
      {error ? <div className="page-error"><AlertCircle size={16} />{error}</div> : null}
      {children}
    </div>
  );
}

function TableToolbar({ title, meta, action }: { title: string; meta?: string; action?: ReactNode }) {
  return (
    <div className="table-toolbar">
      <div>
        <h2>{title}</h2>
        {meta ? <span>{meta}</span> : null}
      </div>
      {action}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="drawer-layer">
      <button className="drawer-scrim" onClick={onClose} aria-label="关闭" />
      <aside className="drawer">
        <div className="drawer-header">
          <h2>{title}</h2>
          <button onClick={onClose}>关闭</button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function LoadingRow({ colSpan }: { colSpan: number }) {
  return <tr><td colSpan={colSpan} className="empty-cell">加载中</td></tr>;
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return <tr><td colSpan={colSpan} className="empty-cell">暂无数据</td></tr>;
}

export default App;
