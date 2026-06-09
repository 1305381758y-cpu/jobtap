const BLOCKED_PROTOCOLS = new Set([
  'javascript:', 'data:', 'vbscript:', 'file:', 'content:', 'about:', 'ftp:',
]);

export function validateContactLink(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return '请输入联系链接';
  if (/[\u0000-\u001F\u007F\s]/.test(trimmed)) {
    return '联系链接不能包含空白或控制字符';
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return '请输入有效的 URL 或 URI';
  }

  if (BLOCKED_PROTOCOLS.has(parsed.protocol)) {
    return '联系链接协议不被允许';
  }

  const scheme = parsed.protocol.slice(0, -1).toLowerCase();

  if (scheme === 'http' || scheme === 'https') {
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return '联系链接必须包含域名';
    }
  } else if (scheme === 'mailto' || scheme === 'tel' || scheme === 'sms') {
    const ssp = trimmed.slice(trimmed.indexOf(':') + 1);
    if (!ssp || ssp.length === 0) {
      return '联系链接协议内容不能为空';
    }
  } else {
    const ssp = trimmed.slice(trimmed.indexOf(':') + 1);
    if (!ssp || ssp.length === 0) {
      return '联系链接协议内容不能为空';
    }
  }

  return null;
}
