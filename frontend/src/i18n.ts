export const SUPPORTED_LOCALES = [
  'en', 'zh', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'ar', 'hi',
] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_ADMIN_LOCALE: SupportedLocale = 'zh';

type MessageCatalog = Record<string, string>;

const catalogs: Partial<Record<SupportedLocale, MessageCatalog>> = {
  zh: {
    'nav.review': '审核队列',
    'nav.jobs': '职位管理',
    'nav.statistics': '数据统计',
    'nav.settings': '设置',
    'role.owner': '超级管理员',
    'role.operator': '运营管理员',
    'adminStatus.active': '启用',
    'adminStatus.disabled': '停用',
    'jobStatus.draft': '草稿',
    'jobStatus.pending': '待审核',
    'jobStatus.approved': '已通过',
    'jobStatus.rejected': '已拒绝',
    'jobStatus.removed': '已移除',
    'app.brand': 'JobTap 点职',
    'app.subtitle': '管理后台',
  },
  en: {
    'nav.review': 'Review Queue',
    'nav.jobs': 'Job Management',
    'nav.statistics': 'Statistics',
    'nav.settings': 'Settings',
    'role.owner': 'Owner',
    'role.operator': 'Operator',
    'adminStatus.active': 'Active',
    'adminStatus.disabled': 'Disabled',
    'jobStatus.draft': 'Draft',
    'jobStatus.pending': 'Pending',
    'jobStatus.approved': 'Approved',
    'jobStatus.rejected': 'Rejected',
    'jobStatus.removed': 'Removed',
    'app.brand': 'JobTap',
    'app.subtitle': 'Admin Console',
  },
};

export function t(locale: SupportedLocale, key: string): string {
  return catalogs[locale]?.[key] ?? catalogs[DEFAULT_ADMIN_LOCALE]?.[key] ?? key;
}
