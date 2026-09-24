export class RequestError extends Error { constructor(message: string, public status: number) { super(message); } }
export type ApiRequestOptions = RequestInit & { onUploadProgress?: (percent: number | null) => void };
export async function request<T = any>(path: string, options?: ApiRequestOptions): Promise<T> {
  if (options?.onUploadProgress) return uploadRequest<T>(path, options);
  const response = await fetch(`/api${path}`, { ...options, headers: { ...(options?.body ? { 'Content-Type': 'application/json' } : {}), ...options?.headers }, cache: 'no-store' });
  const value = await response.json();
  if (!response.ok) throw new RequestError(value.error || '请求失败，请重试。', response.status);
  return value;
}
// Upload events measure browser → server transfer only; the response confirms storage.
function uploadRequest<T>(path: string, options: ApiRequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const signal = options.signal;
    const cleanup = () => signal?.removeEventListener('abort', abort);
    const fail = (error: Error) => { cleanup(); reject(error); };
    const abort = () => xhr.abort();
    if (signal?.aborted) { reject(new DOMException('已取消上传。', 'AbortError')); return; }
    xhr.open(options.method || 'POST', `/api${path}`);
    xhr.timeout = 120000;
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    headers.forEach((value, key) => xhr.setRequestHeader(key, value));
    xhr.upload.onprogress = event => options.onUploadProgress?.(event.lengthComputable && event.total > 0 ? Math.min(99, Math.floor(event.loaded / event.total * 100)) : null);
    xhr.upload.onload = () => options.onUploadProgress?.(100);
    xhr.onload = () => {
      cleanup();
      let value;
      try { value = JSON.parse(xhr.responseText); } catch {
        reject(new RequestError('上传服务返回异常，请重试。', xhr.status)); return;
      }
      if (xhr.status < 200 || xhr.status >= 300) { reject(new RequestError(value?.error || '上传失败，请重试。', xhr.status)); return; }
      resolve(value);
    };
    xhr.onerror = () => fail(new Error('上传连接中断，请检查网络后重试。'));
    xhr.ontimeout = () => fail(new Error('上传超时，请重试或选择较小的文件。'));
    xhr.onabort = () => fail(new DOMException('已取消上传，可重新选择文件。', 'AbortError'));
    signal?.addEventListener('abort', abort, { once: true });
    try { xhr.send(options.body as XMLHttpRequestBodyInit); } catch (error) { fail(error as Error); }
  });
}
export const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });
export async function base64(file: File): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('文件读取失败。')); reader.readAsDataURL(file); });
}
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.style.display = 'none'; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function download(path: string, filename: string) {
  const response = await fetch(`/api${path}`, { cache: 'no-store' });
  if (!response.ok) { const body = await response.json(); throw new Error(body.error || '下载失败。'); }
  saveBlob(await response.blob(), filename);
}
export async function exportSheet(columns: string[], rows: unknown[][], filename: string) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('LoomSkill');
  sheet.addRow(columns); rows.forEach(row => sheet.addRow(row.map(v => v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v)));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3463F3' } };
  sheet.columns.forEach(column => { column.width = 35; column.alignment = { vertical: 'top', wrapText: true }; });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  const buffer = await workbook.xlsx.writeBuffer(); saveBlob(new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}
