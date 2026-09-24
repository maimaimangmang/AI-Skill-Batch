export class RequestError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function request<T = any>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, headers: { ...(options?.body ? { 'Content-Type': 'application/json' } : {}), ...options?.headers }, cache: 'no-store' });
  const value = await response.json();
  if (!response.ok) throw new RequestError(value.error || '请求失败，请重试。', response.status);
  return value;
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
