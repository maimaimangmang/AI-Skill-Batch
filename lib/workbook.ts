import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { ApiError } from './server';

export function fileBuffer(content: unknown, maxBytes: number) {
  if (typeof content !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(content) || content.length > Math.ceil(maxBytes / 3) * 4 + 4) throw new ApiError('文件内容无效或超过大小限制。', 413);
  const buffer = Buffer.from(content, 'base64');
  if (!buffer.length || buffer.length > maxBytes) throw new ApiError('文件为空或超过大小限制。', 413);
  return buffer;
}
// Bound ZIP expansion before ExcelJS inflates any XML, including highly compressed workbooks.
export function checkWorkbookZip(buffer: Buffer) {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0 || end + 22 > buffer.length) throw new ApiError('不是有效的 XLSX 文件。');
  const count = buffer.readUInt16LE(end + 10); let cursor = buffer.readUInt32LE(end + 16); let size = 0;
  if (count > 2000 || count === 0) throw new ApiError('表格结构过大。');
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) throw new ApiError('表格压缩结构无效。');
    size += buffer.readUInt32LE(cursor + 24);
    if (size > 30 * 1024 * 1024) throw new ApiError('表格解压后过大，请精简后上传。');
    cursor += 46 + buffer.readUInt16LE(cursor + 28) + buffer.readUInt16LE(cursor + 30) + buffer.readUInt16LE(cursor + 32);
  }
}
type Sheet = { name: string; columns: string[]; rows: string[][] };
export async function parseWorkbook(filename: string, buffer: Buffer): Promise<Sheet[]> {
  let matrices: { name: string; data: string[][] }[] = [];
  if (/\.(csv|tsv)$/i.test(filename)) {
    const parsed = Papa.parse<string[]>(buffer.toString('utf8').replace(/^\uFEFF/, ''), { skipEmptyLines: 'greedy', delimiter: /\.tsv$/i.test(filename) ? '\t' : '' });
    if (parsed.errors.some(e => e.code !== 'UndetectableDelimiter')) throw new ApiError('CSV 格式有误，请检查引号和分隔符。');
    matrices = [{ name: '数据', data: parsed.data }];
  } else if (/\.xlsx$/i.test(filename)) {
    checkWorkbookZip(buffer);
    const workbook = new ExcelJS.Workbook();
    try { await workbook.xlsx.load(new Uint8Array(buffer) as never); } catch { throw new ApiError('无法读取 Excel，请保存为未加密的 .xlsx 文件。'); }
    if (workbook.worksheets.length > 20) throw new ApiError('工作表超过 20 个，请精简后上传。');
    matrices = workbook.worksheets.map(sheet => {
      if (sheet.rowCount > 2001 || sheet.columnCount > 100) throw new ApiError('导入文件最多 2000 行、100 列。');
      const data: string[][] = [];
      sheet.eachRow(row => {
        const cells = Array.from({ length: sheet.columnCount }, (_, i) => row.getCell(i + 1).text);
        if (cells.some(v => v.trim())) data.push(cells);
      });
      return { name: sheet.name, data };
    });
  } else throw new ApiError('请上传 .xlsx、UTF-8 编码的 .csv 或 .tsv 文件。');
  return matrices.filter(s => s.data.length).map(({ name, data }) => {
    if (data.length > 2001 || data.some(r => r.length > 100)) throw new ApiError('导入文件最多 2000 行、100 列。');
    const columns = data[0].map((v, i) => v.trim() || `未命名列 ${i + 1}`);
    return { name, columns, rows: data.slice(1) };
  });
}
