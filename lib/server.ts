import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { InputRow, Quote } from './types';

export class ApiError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const globalStore = globalThis as unknown as { loomDb?: DatabaseSync; loomKey?: Buffer };
function dataDir() {
  const dir = path.resolve(process.env.DATA_DIR || '.data');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}
function encryptionKey() {
  if (globalStore.loomKey) return globalStore.loomKey;
  let key = process.env.SESSION_ENCRYPTION_KEY;
  if (key && !/^[a-f\d]{64}$/i.test(key)) throw new ApiError('服务端 SESSION_ENCRYPTION_KEY 配置无效。', 503);
  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new ApiError('请先配置服务端会话加密密钥。', 503);
    const file = path.join(dataDir(), 'development.key');
    try { key = readFileSync(file, 'utf8'); } catch {
      key = randomBytes(32).toString('hex'); writeFileSync(file, key, { mode: 0o600, flag: 'wx' });
    }
  }
  return globalStore.loomKey = Buffer.from(key, 'hex');
}
export function seal(value: unknown) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}
export function unseal<T>(value: string): T {
  const data = Buffer.from(value, 'base64url'); const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8'));
}
export function db() {
  if (globalStore.loomDb) return globalStore.loomDb;
  const file = path.join(dataDir(), 'loomdesk.sqlite'); const d = new DatabaseSync(file); chmodSync(file, 0o600);
  d.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, secret TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS quotes (id TEXT PRIMARY KEY, session TEXT NOT NULL, payload TEXT NOT NULL, expires INTEGER NOT NULL, started INTEGER NOT NULL DEFAULT 0, result TEXT);
    CREATE TABLE IF NOT EXISTS limits (id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);`);
  return globalStore.loomDb = d;
}
export const digest = (s: string) => createHash('sha256').update(s).digest('hex');
export function limit(id: string, maximum = 60, windowMs = 60000) {
  const d = db(); const now = Date.now();
  d.prepare('DELETE FROM limits WHERE expires < ?').run(now);
  d.prepare('INSERT INTO limits VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET count = count + 1').run(id, now + windowMs);
  const row = d.prepare('SELECT count FROM limits WHERE id = ?').get(id) as { count: number };
  if (row.count > maximum) throw new ApiError('请求较频繁，请稍后重试。', 429);
}
export function createSession(apiKey: string) {
  const token = randomBytes(32).toString('base64url'); const d = db(); const now = Date.now();
  d.prepare('DELETE FROM sessions WHERE expires < ?').run(now);
  d.prepare('DELETE FROM quotes WHERE expires < ? AND started = 0').run(now);
  d.prepare('DELETE FROM quotes WHERE session NOT IN (SELECT id FROM sessions)').run();
  d.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(digest(token), seal(apiKey), now + 12 * 3600000);
  return token;
}
export function sessionFromToken(token?: string) {
  if (!token || token.length > 100) throw new ApiError('请先连接胜算云 API Key。', 401);
  const id = digest(token);
  const row = db().prepare('SELECT secret, expires FROM sessions WHERE id = ?').get(id) as { secret: string; expires: number } | undefined;
  if (!row || row.expires < Date.now()) throw new ApiError('连接已过期，请重新输入 API Key。', 401);
  try { return { id, apiKey: unseal<string>(row.secret) }; } catch { throw new ApiError('连接已失效，请重新接入。', 401); }
}
export function destroySession(id: string) {
  db().prepare('DELETE FROM quotes WHERE session = ?').run(id);
  db().prepare('DELETE FROM sessions WHERE id = ?').run(id);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  let expected: string;
  if (process.env.APP_ORIGIN) {
    try {
      const configured = new URL(process.env.APP_ORIGIN);
      if (!['http:', 'https:'].includes(configured.protocol) || configured.username || configured.password) throw new Error('Invalid origin');
      expected = configured.origin;
    } catch { throw new ApiError('服务端 APP_ORIGIN 配置无效，请联系部署者。', 503); }
  } else {
    if (process.env.NODE_ENV === 'production') throw new ApiError('请先配置服务端 APP_ORIGIN。', 503);
    // Next.js normalizes loopback request URLs to localhost. Host preserves the
    // browser's actual authority. Only accept explicit loopback hosts here;
    // production always uses APP_ORIGIN, never forwarded host headers.
    const host = request.headers.get('host');
    if (!host || !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host)) throw new ApiError('本地访问地址无效，请使用 localhost 或 127.0.0.1。', 403);
    try { expected = new URL(`${new URL(request.url).protocol}//${host}`).origin; }
    catch { throw new ApiError('本地访问地址无效。', 403); }
  }
  if (!origin || origin !== expected || request.headers.get('sec-fetch-site') === 'cross-site') throw new ApiError(`请求来源与工作台地址不一致，请通过 ${expected} 打开后重试。`, 403);
}
export async function jsonBody(request: Request, maximum = 1024 * 1024) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new ApiError('请求格式应为 JSON。', 415);
  if (Number(request.headers.get('content-length') || 0) > maximum) throw new ApiError('提交内容过大。', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError('缺少请求内容。');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > maximum) { await reader.cancel(); throw new ApiError('提交内容过大。', 413); } chunks.push(value); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new ApiError('请求 JSON 无效。'); }
}
export function baseUrl() {
  const url = new URL(process.env.LOOMLOOM_BASE_URL || 'https://loomloom.shengsuanyun.com');
  const localTest = process.env.LOOMDESK_TEST_MODE === '1' && ['127.0.0.1', 'localhost'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !localTest) || url.username || url.password || url.search || url.hash) throw new ApiError('LoomLoom 服务地址必须为 HTTPS。', 503);
  return url.href.replace(/\/$/, '');
}
export async function upstream(endpoint: string, apiKey?: string, body?: unknown, binary = false, signal?: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}/loom/v1/${endpoint}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000)
    });
  } catch { throw new ApiError('暂时无法连接 LoomLoom。若正在提交，请保留本页并使用原请求重试。', 502); }
  if (!response.ok) {
    let message = '';
    try { const data = await response.json(); message = String(data.error?.message || data.message || (typeof data.error === 'string' ? data.error : '')).slice(0, 600); } catch {}
    if (apiKey) message = message.split(apiKey).join('[已隐藏]');
    if (response.status === 401) throw new ApiError('API Key 无效或已过期，请重新连接。', 401);
    throw new ApiError(message || `LoomLoom 请求失败（${response.status}），请稍后重试。`, response.status);
  }
  if (binary) return response.arrayBuffer();
  try { return await response.json(); } catch { throw new ApiError('LoomLoom 返回了无法识别的数据。', 502); }
}
export type StoredQuote = { listingId: string; officialTemplateId?: string; rows: InputRow[]; quote: Quote; clientRequestId: string; name: string };
export function saveQuote(session: string, payload: Omit<StoredQuote, 'clientRequestId'>) {
  const id = randomUUID(); const expires = Date.now() + 5 * 60000;
  db().prepare('INSERT INTO quotes(id, session, payload, expires) VALUES (?, ?, ?, ?)').run(id, session, seal({ ...payload, clientRequestId: randomUUID() }), expires);
  return { ticket: id, expiresAt: expires };
}
export function getQuote(id: string, session: string) {
  const row = db().prepare('SELECT * FROM quotes WHERE id = ? AND session = ?').get(id, session) as { payload: string; expires: number; started: number; result?: string } | undefined;
  if (!row) throw new ApiError('费用确认已失效，请重新预估。', 409);
  if (!row.started && row.expires < Date.now()) throw new ApiError('报价已过期，请重新预估费用。', 409);
  return { ...row, payload: unseal<StoredQuote>(row.payload) };
}
export function quoteMatches(a: Quote, b: Quote) {
  return ['source', 'currency', 'estimatedBuyerPayableT', 'taskCount', 'taskFixedFeeT', 'listingVersionId', 'pricingRuleVersion'].every(k => a[k as keyof Quote] === b[k as keyof Quote]);
}
