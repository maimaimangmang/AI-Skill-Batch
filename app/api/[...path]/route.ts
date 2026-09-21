import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { ApiError, createSession, db, destroySession, getQuote, jsonBody, limit, quoteMatches, sameOrigin, saveQuote, sessionFromToken, unseal, upstream, type StoredQuote } from '@/lib/server';
import { normalizeRows, schemaOf } from '@/lib/domain';
import { fileBuffer, parseWorkbook } from '@/lib/workbook';
import { isOfficialTemplate, officialListing, officialRows, officialQuote } from '@/lib/official';
import type { Listing, Quote } from '@/lib/types';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const cookie = 'loomdesk_session';
const identifier = /^[a-zA-Z0-9_-]{1,180}$/;
function id(value: string) { if (!identifier.test(value)) throw new ApiError('无效的记录编号。'); return encodeURIComponent(value); }
function officialId(value: string) { if (!isOfficialTemplate(value)) throw new ApiError('暂不支持这个官方模板。', 404); return id(value); }
async function getOfficial(template: string, key: string) {
  const schema = await upstream(`officialTemplates/${officialId(template)}/schema`, key);
  if (schema.templateId !== template) throw new ApiError('模板编号不一致。', 502);
  return officialListing(schema);
}
async function precheckOfficial(template: string, rows: Record<string, unknown>[], key: string, version?: string): Promise<Quote> {
  const body = { rows: officialRows(rows) };
  const validation = await upstream(`officialTemplates/${officialId(template)}:validateRows`, key, body);
  if (validation.valid !== true) {
    const errors = [...(validation.fileErrors || []), ...(validation.rowErrors || []).map((e: { rowIndex: number; fieldKey: string; error: string }) => `第 ${e.rowIndex} 行 ${e.fieldKey}：${e.error}`)];
    throw new ApiError(errors.join('；') || '模板输入校验未通过。');
  }
  const precheck = await upstream(`officialTemplates/${officialId(template)}:precheckRows`, key, body);
  if (precheck.balanceCheck?.isSufficient === false) throw new ApiError('当前余额不足，请充值后重新预估。', 409);
  try { return officialQuote(precheck, rows.length, version); } catch (e) { throw new ApiError((e as Error).message, 502); }
}
function json(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } }); }
function publicListing(value: Listing): Listing {
  return { id: value.id, displayName: value.displayName, description: value.description, currency: value.currency, taskFixedFeeT: value.taskFixedFeeT, taskFixedFee: value.taskFixedFee, inputSchemaSnapshot: value.inputSchemaSnapshot, listingVersionId: value.listingVersionId, saleStatus: value.saleStatus, executionAvailabilityStatus: value.executionAvailabilityStatus, creator: value.creator };
}
function query(request: NextRequest, keys: string[], defaults: Record<string, string> = {}) {
  const params = new URLSearchParams(defaults);
  for (const key of keys) { const value = request.nextUrl.searchParams.get(key); if (value && value.length < 2000) params.set(key, value); }
  return `?${params.toString()}`;
}
async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params; const route = path.join('/'); const method = request.method;
    if (!['GET', 'HEAD'].includes(method)) sameOrigin(request);
    if (route === 'session' && method === 'POST') {
      // Do not trust client-provided forwarded IPs for the global authentication admission limit.
      limit('login-global', 120, 60000);
      const body = await jsonBody(request, 8192); const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
      if (!apiKey || apiKey.length > 2048 || /\s/.test(apiKey)) throw new ApiError('请输入完整、有效的 API Key。');
      const balance = await upstream('users/me/balance', apiKey);
      try { destroySession(sessionFromToken(request.cookies.get(cookie)?.value).id); } catch {}
      const token = createSession(apiKey); const response = json({ connected: true, balance });
      response.cookies.set(cookie, token, { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false'), path: '/', maxAge: 12 * 3600 });
      return response;
    }
    if (route === 'session' && method === 'GET') {
      try { sessionFromToken(request.cookies.get(cookie)?.value); return json({ connected: true }); } catch (error) { if (error instanceof ApiError && error.status === 401) return json({ connected: false }); throw error; }
    }
    if (route === 'session' && method === 'DELETE') {
      try { destroySession(sessionFromToken(request.cookies.get(cookie)?.value).id); } catch {}
      const response = json({ connected: false }); response.cookies.set(cookie, '', { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 0 }); return response;
    }
    const session = sessionFromToken(request.cookies.get(cookie)?.value); limit(session.id, 180);
    const key = session.apiKey;
    if (method === 'GET') {
      if (route === 'pending') {
        const records = db().prepare('SELECT id, payload, expires FROM quotes WHERE session = ? AND started = 1 AND result IS NULL').all(session.id) as { id: string; payload: string; expires: number }[];
        return json({ items: records.map(r => { const p = unseal<StoredQuote>(r.payload); return { ticket: r.id, listingId: p.listingId, rows: p.rows, quote: p.quote, name: p.name, expiresAt: r.expires }; }) });
      }
      if (path[0] === 'official' && path.length === 2) return json(await getOfficial(path[1], key));
      if (path[0] === 'official' && path.length === 3 && path[2] === 'workbook') {
        const data = await upstream(`officialTemplates/${officialId(path[1])}/workbook`, key, undefined, true);
        return new Response(data, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="loomdesk-input.xlsx"', 'Cache-Control': 'no-store' } });
      }
      if (route === 'balance') return json(await upstream('users/me/balance', key));
      if (route === 'market') {
        const data = await upstream(`marketListings${query(request, ['keyword', 'pageToken'], { pageSize: '60' })}`, key);
        return json({ items: data.items.map(publicListing), nextPageToken: data.nextPageToken });
      }
      if (path[0] === 'market' && path.length === 2) return json(publicListing(await upstream(`marketListings/${id(path[1])}`, key)));
      if (path[0] === 'market' && path.length === 3 && path[2] === 'workbook') {
        const data = await upstream(`marketListings/${id(path[1])}/workbook`, key, undefined, true);
        return new Response(data, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="loomdesk-input.xlsx"', 'Cache-Control': 'no-store' } });
      }
      if (route === 'runs') return json(await upstream(`users/me/runs${query(request, ['status', 'pageToken'], { pageSize: '50' })}`, key));
      if (path[0] === 'runs' && path.length === 2) return json(await upstream(`users/me/runs/${id(path[1])}`, key));
      if (path[0] === 'runs' && path.length === 3 && path[2] === 'results') return json(await upstream(`users/me/runs/${id(path[1])}/resultRows${query(request, ['pageToken'], { pageSize: '200' })}`, key));
      if (path[0] === 'runs' && path.length === 3 && path[2] === 'workbook') {
        const data = await upstream(`users/me/runs/${id(path[1])}/resultWorkbook`, key, undefined, true);
        return new Response(data, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="loomdesk-results.xlsx"', 'Cache-Control': 'no-store' } });
      }
    }
    if (method === 'POST' && route === 'import') {
      const body = await jsonBody(request, 7 * 1024 * 1024);
      if (typeof body.filename !== 'string') throw new ApiError('文件名无效。');
      return json({ sheets: await parseWorkbook(body.filename, fileBuffer(body.content, 5 * 1024 * 1024)) });
    }
    if (method === 'POST' && route === 'assets') {
      limit(`${session.id}:upload`, 30);
      const body = await jsonBody(request, 14 * 1024 * 1024);
      const buffer = fileBuffer(body.content, 10 * 1024 * 1024);
      if (typeof body.filename !== 'string' || body.filename.length > 255 || typeof body.contentType !== 'string') throw new ApiError('附件信息无效。');
      return json(await upstream('inputAssets:upload', key, { filename: body.filename, contentType: body.contentType, content: buffer.toString('base64') }));
    }
    if (method === 'POST' && route === 'quote') {
      limit(`${session.id}:quote`, 20);
      const body = await jsonBody(request);
      if (body.officialTemplateId != null) {
        const templateId = officialId(String(body.officialTemplateId));
        const listing = await getOfficial(templateId, key);
        const { rows, errors } = normalizeRows(body.rows, schemaOf(listing).fields);
        if (errors.length) throw new ApiError(errors.join('；'));
        const quote = await precheckOfficial(templateId, rows, key, listing.listingVersionId);
        const balance = await upstream('users/me/balance', key);
        return json({ ...saveQuote(session.id, { listingId: templateId, officialTemplateId: templateId, rows, quote, name: listing.displayName }), quote, balance });
      }
      const listingId = id(String(body.listingId));
      const listing: Listing = await upstream(`marketListings/${listingId}`, key);
      if (listing.executionAvailabilityStatus && listing.executionAvailabilityStatus !== 'available') throw new ApiError('这个工作流当前不可执行。', 409);
      const { rows, errors } = normalizeRows(body.rows, schemaOf(listing).fields);
      if (errors.length) throw new ApiError(errors.join('；'));
      const quote: Quote = await upstream(`marketListings/${listingId}:quote`, key, { inputRows: rows });
      if (quote.estimatedBuyerPayableT == null || !Number.isSafeInteger(quote.estimatedBuyerPayableT) || quote.estimatedBuyerPayableT < 0 || !quote.currency) throw new ApiError('服务未返回完整金额或币种，暂不能确认执行。', 502);
      if (quote.taskCount !== rows.length) throw new ApiError('报价任务数与表格不一致，请检查工作流输入。', 409);
      const balance = await upstream('users/me/balance', key);
      return json({ ...saveQuote(session.id, { listingId, rows, quote, name: listing.displayName }), quote, balance });
    }
    if (method === 'POST' && route === 'execute') {
      const body = await jsonBody(request, 4096);
      if (body.confirm !== true || typeof body.ticket !== 'string') throw new ApiError('请先预估费用并确认执行。');
      const stored = getQuote(body.ticket, session.id); const payload = stored.payload;
      if (stored.result) return json(JSON.parse(stored.result));
      if (!stored.started) {
        const latest: Quote = payload.officialTemplateId
          ? await precheckOfficial(payload.officialTemplateId, payload.rows, key, (await getOfficial(payload.officialTemplateId, key)).listingVersionId)
          : await upstream(`marketListings/${id(payload.listingId)}:quote`, key, { inputRows: payload.rows });
        if (!quoteMatches(payload.quote, latest)) throw new ApiError('工作流版本或报价已变化，请返回表格重新预估并确认。', 409);
        db().prepare('UPDATE quotes SET started = 1 WHERE id = ? AND session = ?').run(body.ticket, session.id);
      }
      // Identical retries retain both original payload and idempotency key, including after timeouts/restarts.
      const result = payload.officialTemplateId
        ? await upstream(`officialTemplates/${officialId(payload.officialTemplateId)}:runRows`, key, { rows: officialRows(payload.rows), clientRequestId: payload.clientRequestId, expectedEstimatedCostT: payload.quote.estimatedBuyerPayableT, expectedPricingRevision: payload.quote.pricingRuleVersion })
        : await upstream(`marketListings/${id(payload.listingId)}:execute`, key, { inputRows: payload.rows, clientRequestId: payload.clientRequestId, confirm: true });
      if (!result.runId) throw new ApiError('服务尚未返回任务编号，请使用原请求重试或前往历史任务核对。', 502);
      db().prepare('UPDATE quotes SET result = ? WHERE id = ? AND session = ?').run(JSON.stringify(result), body.ticket, session.id);
      return json(result);
    }
    throw new ApiError('接口不存在。', 404);
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    const requestId = randomUUID();
    // Deliberately omit request bodies, upstream payloads and credentials from logs.
    console.error('LoomDesk request failed', requestId, error instanceof Error ? error.name : 'UnknownError');
    return json({ error: `请求未完成，请稍后重试。错误编号：${requestId}` }, 500);
  }
}
export { handle as GET, handle as POST, handle as DELETE };
