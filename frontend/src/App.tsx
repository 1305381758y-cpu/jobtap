import { FormEvent, ReactNode, useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import {
  AdminPayload,
  AdminRole,
  AdminStatus,
  AdminUser,
  ApiError,
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
  rejectJob,
  removeJob,
  updateAdmin,
  updateJob,
  StatisticsItem,
} from './api';

type Page = 'review' | 'jobs' | 'statistics' | 'settings';
type Session = { token: string; email: string; role: AdminRole };

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
  status: 'pending',
};

const initialAdminForm: AdminPayload = {
  email: '',
  password: '',
  role: 'operator',
  status: 'active',
};

const roleLabel: Record<AdminRole, string> = {
  owner: '超级管理员',
  operator: '运营管理员',
};

const adminStatusLabel: Record<AdminStatus, string> = {
  active: '启用',
  disabled: '停用',
};

const jobStatusLabel: Record<JobStatus, string> = {
  draft: '草稿',
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  removed: '已移除',
};

function parseSession(token: string): Session | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { token, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
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

  if (!session) {
    return <LoginScreen onLogin={setSession} />;
  }

  return <AdminConsole session={session} onLogout={() => {
    localStorage.removeItem('jobtap_admin_token');
    setSession(null);
  }} />;
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
      </form>
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
            {loading ? <LoadingRow colSpan={7} /> : jobs.map((job) => (
              <tr key={job.id}>
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
                  <button onClick={() => void act('approve', job)}>通过</button>
                  <button className="danger-link" onClick={() => void act('reject', job)}>拒绝</button>
                </td>
              </tr>
            ))}
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

  const totals = items.reduce(
    (sum, item) => ({
      activeUsers: sum.activeUsers + item.activeUsers,
      detailViews: sum.detailViews + item.detailViews,
      contactClicks: sum.contactClicks + item.contactClicks,
    }),
    { activeUsers: 0, detailViews: 0, contactClicks: 0 },
  );
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
        <MetricCard label="活跃用户" value={totals.activeUsers.toLocaleString()} />
        <MetricCard label="详情浏览" value={totals.detailViews.toLocaleString()} />
        <MetricCard label="联系点击" value={totals.contactClicks.toLocaleString()} />
        <MetricCard label="平均联系点击率" value={`${(averageRate * 100).toFixed(1)}%`} />
      </div>
      <div className="panel">
        <TableToolbar title="统计明细" meta={`${items.length} 条`} />
        <table>
          <thead>
            <tr>
              <th>国家代码</th>
              <th>职位 ID</th>
              <th>活跃用户</th>
              <th>详情浏览</th>
              <th>联系点击</th>
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
