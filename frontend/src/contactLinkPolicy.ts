const BLOCKED_PROTOCOLS = new Set([
  'javascript:', 'data:', 'vbscript:', 'file:', 'content:', 'about:', 'ftp:',
]);

export function validateContactLink(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
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
    const ssp = url.slice(url.indexOf(':') + 1);
    if (!ssp || ssp.length === 0) {
      return '联系链接协议内容不能为空';
    }
  } else {
    const ssp = url.slice(url.indexOf(':') + 1);
    if (!ssp || ssp.length === 0) {
      return '联系链接协议内容不能为空';
    }
  }

  return null;
}
