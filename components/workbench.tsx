'use client';
import { useI18n } from './language-provider';
import { useRouter } from 'next/navigation';
import { useRetryDraft } from './retry-draft-provider';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, FileText, KeyRound, Image as ImageIcon, Languages, ScanSearch, ListChecks, LoaderCircle, Play, RefreshCw, Search, ShieldCheck, Sparkles, Table2, Wallet, X } from 'lucide-react';
import type { Balance, InputRow, Listing, Quote, ResultRow, Schema } from '@/lib/types';
import { cellText, emptyRow, money, normalizeRows, schemaOf } from '@/lib/domain';
import { post, request, RequestError, type ApiRequestOptions } from '@/lib/client';
import { resolveDraftAssets, stageDraftAsset, type DraftAssets } from '@/lib/draft-assets';
import { listingModelLabel, MARKET_PAGE_SIZE, marketPageNumbers, createMarketPager, type MarketPage } from '@/lib/market';
import { isOfficialTemplate } from '@/lib/official';
import { skillPath, tasksPath, taskConnectionPath } from '@/lib/skill-links';
import { createMarketAuthorLoader } from '@/lib/market-authors';
import RunsView from './runs-view';
import Editor from './editor';
import { SkillWorkspaceHeader, SkillWorkspaceFooter } from './skill-workspace-shell';
import Results from './results';
import Modal from './modal';
import FeaturedWorkflows from './featured-workflows';
import WorkflowAuthor from './workflow-author';
import FavoriteButton from './favorite-button';
type View = 'market' | 'editor' | 'runs' | 'detail' | 'settings';
type Confirmation = { ticket: string; quote: Quote; balance?: Balance; expiresAt: number; name?: string; attempted?: boolean };
// Use cues from the public title only; this does not claim a model or capability.
function workflowIcon(title: string) {
  if (/视频|短剧|分镜/.test(title)) return { Icon: Play, tone: 'video' };
  if (/生图|套图|图片|海报|插画|配图|视觉/.test(title)) return { Icon: ImageIcon, tone: 'image' };
  if (/翻译/.test(title)) return { Icon: Languages, tone: 'text' };
  if (/审核|评审|检查/.test(title)) return { Icon: ListChecks, tone: 'review' };
  if (/洞察|研究|分析/.test(title)) return { Icon: ScanSearch, tone: 'review' };
  return { Icon: FileText, tone: 'text' };
}

export default function Workbench({ initialSkill, draftListing, canonicalSkill = false, initialView = 'market', initialRunId = '' }: { initialSkill?: string; draftListing?: Listing; canonicalSkill?: boolean; initialView?: 'market' | 'runs' | 'detail' | 'settings'; initialRunId?: string }) {
  const router = useRouter();
  const { stage: stageRetry, take: takeRetry, clear: clearRetry } = useRetryDraft();
  const [draftAccess, setDraftAccess] = useState(!!draftListing);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const resumeQuote = useRef(false);
  const draftAssets = useRef<DraftAssets>(new Map());
  const [targetSkill, setTargetSkill] = useState(initialSkill);
  const attemptedSkill = useRef('');
  const { t, skillText } = useI18n();
  const [ready, setReady] = useState(false); const [connected, setConnected] = useState(false);
  const [key, setKey] = useState(''); const [loginBusy, setLoginBusy] = useState(false); const [loginError, setLoginError] = useState('');
  const [view, setView] = useState<View>(draftListing ? 'editor' : initialView);
  const [balance, setBalance] = useState<Balance | null>(null); const [marketPages, setMarketPages] = useState<MarketPage[]>([]);
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [search, setSearch] = useState(''); const [query, setQuery] = useState('');
  const [marketPage, setMarketPage] = useState(0);
  const [marketRetry, setMarketRetry] = useState(0);
  const [marketCountError, setMarketCountError] = useState(false);
  // Hide this listing from this site's market and search without altering upstream listings.
  const listings = useMemo(() => (marketPages[marketPage]?.items || []).filter(
    item => item.id !== '01a12464-6c6a-70ed-ab08-56fd0478261b', // 归藏网页 PPT
  ), [marketPages, marketPage]);
  const scrollMarketAfterLoad = useRef(false);
  const [refresh, setRefresh] = useState(0);
  const [listing, setListing] = useState<Listing | null>(draftListing || null); const [schema, setSchema] = useState<Schema | null>(draftListing ? schemaOf(draftListing) : null); const [rows, setRows] = useState<InputRow[]>(draftListing ? Array.from({ length: 3 }, () => emptyRow(schemaOf(draftListing).fields)) : []);
  const [validation, setValidation] = useState<string[]>([]); const [busy, setBusy] = useState(false); const [confirmation, setConfirmation] = useState<Confirmation | null>(null); const [quoteError, setQuoteError] = useState('');
  const runId = initialRunId; const [pending, setPending] = useState<Confirmation[]>([]);
  const api = useCallback(async (path: string, options?: ApiRequestOptions) => {
    try { return await request(path, options); } catch (e) {
      if (e instanceof RequestError && e.status === 401) { clearRetry(); setConnected(false); setKey(''); setMarketPages([]); setMarketPage(0); setConfirmation(null); setBalance(null); setPending([]); setConnectionOpen(true); if (path === '/assets' || path === '/quote') resumeQuote.current = true; setLoginError(e.message); }
      throw e;
    }
  }, [clearRetry]);
  const editorApi = async (path: string, options?: ApiRequestOptions) => {
    if (!connected && path === '/assets' && options?.body instanceof File) {
      options.signal?.throwIfAborted();
      return { inputAssetId: stageDraftAsset(draftAssets.current, options.body) };
    }
    return api(path, options);
  };
  const marketPager = useMemo(() => createMarketPager(api, query), [api, query, refresh, connected]);
  const activeMarketPager = useRef(marketPager);
  const marketHasPages = marketPages.length > 0;
  const marketTotal = marketPager.totalCount;
  const marketPageCount = marketTotal == null ? Math.max(1, marketPages.length) : Math.max(1, Math.ceil(marketTotal / MARKET_PAGE_SIZE));
  const loadAuthors = useMemo(() => createMarketAuthorLoader(api), [api, connected, refresh]);
  const [authors, setAuthors] = useState<Record<string, string | null>>({});
  useEffect(() => { setAuthors({}); }, [loadAuthors]);
  useEffect(() => {
    if (!connected || view !== 'market' || !listings.length) return;
    const controller = new AbortController();
    void loadAuthors(listings, controller.signal, (id, name) => {
      if (!controller.signal.aborted) setAuthors(current => ({ ...current, [id]: name }));
    });
    return () => controller.abort();
  }, [connected, view, listings, loadAuthors]);
  useEffect(() => {
    let controller: AbortController;
    const checkSession = (changed = false) => {
      controller?.abort();
      controller = new AbortController();
      const { signal } = controller;
      if (changed) {
        // A connection from the favorites dialog must also update this editor.
        // Keep entered rows and local files, but discard account-specific state.
        setConfirmation(null); setBalance(null); setPending([]);
        for (const asset of draftAssets.current.values()) delete asset.uploadedId;
      }
      request('/session', { signal }).then(data => {
        if (signal.aborted) return;
        setConnected(data.connected);
        if (changed) setRefresh(value => value + 1);
      }).catch(e => { if (!signal.aborted) setLoginError(e.message); }).finally(() => { if (!signal.aborted) setReady(true); });
    };
    const changed = () => checkSession(true);
    checkSession();
    if (canonicalSkill) {
      window.addEventListener('loomskill-session-change', changed);
    }
    return () => { controller.abort(); window.removeEventListener('loomskill-session-change', changed); };
  }, [canonicalSkill]);
  useEffect(() => {
    if (!ready) return;
    if (!connected) {
      clearRetry();
      if (!draftAccess) {
        const destination = initialView === 'settings' ? '/settings' : tasksPath(initialRunId);
        window.location.replace(taskConnectionPath(destination));
        return;
      }
    }
    const title = canonicalSkill && draftListing ? t('{0} · AI 批量工作流 | LoomSkill', skillText(draftListing.displayName))
      : `${t(view === 'detail' ? '任务结果' : view === 'settings' ? '连接设置' : view === 'runs' ? '我的任务' : '工作流市场')} · LoomSkill`;
    document.title = title;
  }, [ready, connected, draftAccess, t, skillText, targetSkill, canonicalSkill, draftListing, view, initialView, initialRunId, clearRetry]);
  useEffect(() => {
    if (!ready || !connected || !canonicalSkill || !draftListing) return;
    const retryRows = takeRetry(draftListing.id);
    if (!retryRows) return;
    try {
      const shape = schemaOf(draftListing);
      setRows(retryRows.map(row => {
        const raw = JSON.parse(row.inputJson);
        return Object.fromEntries(shape.fields.map(field => [field.key, (raw.values || raw)[field.key] ?? field.default_value ?? '']));
      }));
      setValidation([]); setConfirmation(null);
    } catch { setError(t('任务输入恢复失败，请重新填写。')); }
  }, [ready, connected, canonicalSkill, draftListing, takeRetry, t]);
  useEffect(() => {
    if (!connected) { attemptedSkill.current = ''; return; }
    if (!ready || !targetSkill || (listing?.id === targetSkill && schema)) return;
    const attempt = targetSkill;
    if (attemptedSkill.current === attempt) return;
    attemptedSkill.current = attempt;
    void choose({ id: targetSkill, ...(isOfficialTemplate(targetSkill) ? { officialTemplateId: targetSkill } : {}) } as Listing);
  }, [ready, connected, targetSkill, listing, schema]);
  useEffect(() => { const timeout = setTimeout(() => { if (search !== query) searchMarket(search); }, 300); return () => clearTimeout(timeout); }, [search, query]);
  useEffect(() => {
    if (!connected) return; let active = true;
    api('/balance').then(data => { if (active) setBalance(data); }).catch(e => { if (active) setError(e.message); });
    api('/pending').then(data => { if (active) setPending(data.items.map((p: Confirmation) => ({ ...p, attempted: true }))); }).catch(() => {});
    return () => { active = false; };
  }, [api, connected, refresh]);
  useEffect(() => {
    if (!connected || view !== 'market') return;
    if (activeMarketPager.current !== marketPager) {
      activeMarketPager.current = marketPager;
      setMarketPages([]); setMarketCountError(false);
      if (marketPage !== 0) { setMarketPage(0); return; }
    }
    let active = true; const controller = new AbortController(); setLoading(true); setError('');
    marketPager.load(marketPage, controller.signal).then(() => {
      if (active) setMarketPages([...marketPager.pages]);
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [connected, view, marketPager, marketPage, marketRetry]);
  useEffect(() => {
    if (!connected || view !== 'market' || !marketHasPages || marketPager.totalCount != null) return;
    const controller = new AbortController(); setMarketCountError(false);
    marketPager.discoverTotal(controller.signal).then(() => {
      if (!controller.signal.aborted) setMarketPages([...marketPager.pages]);
    }).catch(() => { if (!controller.signal.aborted) setMarketCountError(true); });
    return () => controller.abort();
  }, [connected, view, marketPager, marketHasPages]);
  useEffect(() => {
    if (view === 'market' && !loading && listings.length && scrollMarketAfterLoad.current) {
      scrollMarketAfterLoad.current = false;
      document.getElementById('market-toolbar')?.scrollIntoView({ block: 'start' });
    }
  }, [view, loading, listings]);
  async function login(e: React.FormEvent) {
    e.preventDefault(); setLoginBusy(true); setLoginError('');
    try { const data = await request('/session', post({ apiKey: key })); setKey(''); setConnected(true); setBalance(data.balance); setConnectionOpen(false); for (const asset of draftAssets.current.values()) delete asset.uploadedId; setRefresh(r => r + 1); if (resumeQuote.current) { resumeQuote.current = false; await quote(true); } }
    catch (e) { setLoginError((e as Error).message); } finally { setLoginBusy(false); }
  }
  async function logout() {
    setError('');
    try { await request('/session', { method: 'DELETE' }); } catch (e) { setError((e as Error).message); return; }
    clearRetry(); window.location.assign(taskConnectionPath());
    setDraftAccess(false); setConnectionOpen(false); resumeQuote.current = false; draftAssets.current.clear(); setTargetSkill(undefined); setConnected(false); setKey(''); setMarketPages([]); setMarketPage(0); setRows([]); setListing(null); setBalance(null); setConfirmation(null); setPending([]); setView('market'); setError(''); setLoginError('');
  }
  function navigate(next: View) {
    window.location.assign(next === 'market' ? '/skills' : next === 'settings' ? '/settings' : tasksPath());
  }
  function openResult(id: string) {
    window.location.assign(tasksPath(id));
  }
  async function choose(item: Listing, retryRows?: ResultRow[]) {
    if (retryRows) { stageRetry(item.officialTemplateId || item.id, retryRows); router.push(skillPath(item.officialTemplateId || item.id)); }
    else window.location.assign(skillPath(item.id));
  }
  async function quote(authorized = false) {
    if (!listing || !schema) return;
    const normalized = normalizeRows(rows, schema.fields); setValidation(normalized.errors); if (normalized.errors.length) return;
    if (!connected && !authorized) { resumeQuote.current = true; setLoginError(''); setConnectionOpen(true); return; }
    setBusy(true); setError('');
    try {
      const resolved = await resolveDraftAssets(normalized.rows, schema.fields, draftAssets.current, file => api('/assets', { method: 'POST', body: file, headers: { 'Content-Type': 'application/octet-stream', 'X-Upload-Filename': encodeURIComponent(file.name), 'X-Upload-Type': file.type || 'application/octet-stream' } }));
      const result = await api('/quote', post({ listingId: listing.id, officialTemplateId: listing.officialTemplateId, rows: resolved })); setConfirmation({ ...result, name: listing.displayName }); setQuoteError(''); setBalance(result.balance); }
    catch (e) { setValidation([(e as Error).message]); } finally { setBusy(false); }
  }
  async function execute() {
    if (!confirmation) return; setBusy(true); setQuoteError(''); setConfirmation({ ...confirmation, attempted: true });
    try { const result = await api('/execute', post({ ticket: confirmation.ticket, confirm: true })); openResult(result.runId); setConfirmation(null); setPending(p => p.filter(x => x.ticket !== confirmation.ticket)); setRefresh(r => r + 1); }
    catch (e) { setQuoteError((e as Error).message); }
    finally { setBusy(false); }
  }
  function searchMarket(value: string) {
    setSearch(value); setQuery(value); setMarketPage(0); setMarketPages([]); setMarketCountError(false);
    // Submitting the same search also provides a retry after a request error.
    setRefresh(r => r + 1);
  }
  function goToMarketPage(page: number) {
    if (loading || page === marketPage || page < 0 || (marketTotal != null ? page >= marketPageCount : (!marketPages[page] && !(page === marketPages.length && marketPages.at(-1)?.nextPageToken)))) return;
    scrollMarketAfterLoad.current = true;
    setMarketPage(page);
  }
  if ((!ready && !draftListing) || (!connected && !draftAccess)) return <main className="boot"><img src="/loomdesk-mark.svg" alt="" /><LoaderCircle className="spin" /><p>{t("正在打开 LoomSkill…")}</p></main>;
  return <div className={`app-shell studio-app${view === 'market' ? ' studio-market' : ' studio-workspace'}${view === 'runs' ? ' studio-runs' : ''} studio-top-nav${canonicalSkill ? ' studio-skill-page' : ''}`}>
    <div className="main-shell"><SkillWorkspaceHeader connected={connected} ready={ready} busy={busy || loginBusy} api={api} activePage={view === 'runs' || view === 'detail' ? 'tasks' : undefined} onBack={canonicalSkill ? () => navigate('market') : undefined} onConnect={() => { resumeQuote.current = false; setLoginError(''); setConnectionOpen(true); }} />
    <main className="main-content">
      {!connected && draftAccess && <p className="notice">{t("可以先填写任务、导入表格和选择附件，预估费用时再连接。草稿仅保留在当前页面，关闭或刷新页面会清除。")}</p>}
      {error && <div className="error between" role="alert"><span>{t(error)}</span><button className="icon-button" aria-label={t("关闭提示")} onClick={() => setError('')}><X size={16} /></button></div>}
      {pending.length > 0 && view !== 'detail' && <div className="notice between"><span>{t("有 ")}{pending.length} {t(" 个提交尚未返回结果，可用原请求重试，避免重复下单。")}</span><button className="button small" onClick={() => { setConfirmation(pending[0]); setQuoteError(''); }}>{t("恢复提交")}</button></div>}
      {view === 'market' && <>
        <div className="page-heading market-heading"><div><h1>{t("找到工作流，")}<span className="market-heading-accent">{t("开始批量创作")}</span></h1><p>{t("选择 Skill → 填写批量任务 → 确认费用 → 下载结果")}</p></div></div>
        <FeaturedWorkflows demo={false} busy={loading} api={api} onChoose={choose} />
        <div className="market-toolbar" id="market-toolbar"><div className="market-tabs"><button className="selected" onClick={() => searchMarket('')}>{t("全部工作流")}</button></div><form className="search" onSubmit={e => { e.preventDefault(); searchMarket(search); }}><Search size={17} /><input aria-label={t("搜索工作流")} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("搜索名称或使用场景…")} />{search && <button type="button" aria-label={t("清除搜索")} className="icon-button" onClick={() => searchMarket('')}><X size={14} /></button>}</form><button className="icon-button refresh-button" aria-label={t("刷新市场")} onClick={() => searchMarket(query)}><RefreshCw size={18} /></button></div>
        {loading && !listings.length ? <div className="loading"><LoaderCircle className="spin" />{t("正在获取工作流…")}</div> : <div className="workflow-grid">{listings.map(item => { const { Icon, tone } = workflowIcon(item.displayName); const models = listingModelLabel(item); let count = 0; try { count = schemaOf(item).fields.filter(f => f.required).length; } catch {} return <article className="workflow-card" key={item.id}><div className="card-top"><span className={`workflow-icon workflow-icon-${tone}`}><Icon size={20} /></span><div className="card-title"><h2><a href={skillPath(item.id)} target="_blank" rel="noopener noreferrer">{skillText(item.displayName)}</a></h2><WorkflowAuthor name={item.creator?.nickname?.trim() || authors[item.id] || undefined} loading={!Object.hasOwn(authors, item.id)} unavailable={authors[item.id] === null} /></div><FavoriteButton skill={item} /></div><p>{skillText(item.description || '') || t("选择此工作流查看输入字段与填写说明。")}</p><div className="card-model-tags"><span className={`model-tag${models ? ' disclosed' : ''}`} title={models ? t("模型（作者说明）：{0}", skillText(models)) : t("公开资料暂未提供模型信息，不代表工作流未限制模型")}><Sparkles size={11} />{skillText(models) || t("暂无模型信息")}</span></div><div className="card-meta"><span><Table2 size={12} />{count} {t(" 个必填字段")}</span><span className="card-source">{t("LoomLoom 市场")}</span></div><div className="card-bottom"><div><strong>{t(money(item.taskFixedFeeT, item.currency))}</strong><span>{t("/ 任务调用费")}</span></div><button className="card-use" aria-label={t("使用 {0}", skillText(item.displayName))} disabled={loading || (!!item.executionAvailabilityStatus && item.executionAvailabilityStatus !== 'available')} onClick={() => choose(item)}>{t("使用")}<ArrowRight size={15} /></button></div></article>; })}</div>}
        {!loading && !error && !listings.length && <div className="empty"><Search size={32} /><h2>{query ? t("没有找到匹配的工作流") : t("市场暂时没有可用工作流")}</h2><p>{query ? t("试试换个关键词，或者查看全部工作流。") : t("稍后刷新即可重新获取。")}</p><button className="button" onClick={() => searchMarket('')}>{t("重新查看")}</button></div>}
        {!loading && error && !marketPages[marketPage] && <button className="button load-more" onClick={() => setMarketRetry(retry => retry + 1)}>{t("重试当前页")}</button>}
        <nav className="market-pagination" aria-label={t("工作流市场分页")}>
          <span className="pagination-summary" aria-live="polite">{loading ? t("正在读取市场…") : t("第 {0} 页{1} · 本页 {2} 项", marketPage + 1, marketTotal == null ? '' : t(" / 共 {0} 页", marketPageCount), listings.length)} {t(" · 每页 ")}{MARKET_PAGE_SIZE} {t(" 项")}{marketTotal == null && !loading && (marketCountError ? t(" · 页数暂未获取，刷新重试") : t(" · 正在读取页数…"))}</span>
          <div className="pagination-buttons"><button className="button small" disabled={loading || marketPage === 0} onClick={() => goToMarketPage(marketPage - 1)}>{t("上一页")}</button>
            {marketPageNumbers(marketPageCount, marketPage).map((page, index) => page === null ? <span className="pagination-ellipsis" key={`gap-${index}`} aria-hidden="true">…</span> : <button key={page} className={`button small page-number ${page === marketPage ? 'primary' : ''}`} aria-label={t("第 {0} 页", page + 1)} aria-current={page === marketPage ? 'page' : undefined} disabled={loading || page === marketPage} onClick={() => goToMarketPage(page)}>{page + 1}</button>)}
            <button className="button small" disabled={loading || !marketPages[marketPage]?.nextPageToken} onClick={() => goToMarketPage(marketPage + 1)}>{t("下一页")}</button></div>
        </nav>
        <div className="market-foot"><ShieldCheck size={14} />{t("提交前展示预估费用，确认后才执行。调用费之外的模型费用以实际用量为准。")}</div>
      </>}
      {view === 'editor' && listing && schema && <Editor showBackNavigation={!canonicalSkill} showBalance={canonicalSkill && connected} balance={balance} listing={listing} schema={schema} rows={rows} setRows={next => { setRows(next); setValidation([]); setConfirmation(null); }} demo={false} guest={!connected} api={editorApi} busy={busy || !ready} errors={validation} onBack={() => navigate('market')} onQuote={() => void quote()} />}
      <RunsView active={view === 'runs'} api={api} refreshKey={refresh} onNew={() => navigate('market')} onResult={openResult} />
      {view === 'detail' && <Results key={runId} runId={runId} demo={false} api={api} onBack={() => navigate('runs')} onRetry={async (listingId, failedRows, officialTemplateId) => { await choose({ id: listingId, officialTemplateId } as Listing, failedRows); }} />}
      {view === 'settings' && <><div className="page-heading"><div><div className="eyebrow">CONNECTION</div><h1>{t("连接设置")}</h1><p>{t("管理你的胜算云连接与工作空间。")}</p></div></div><section className="settings-card"><span className="settings-icon"><KeyRound size={25} /></span><h2>{t("胜算云已连接")}</h2><p>{t("你的 Key 仅用于调用胜算云 LoomLoom 服务。退出后会立即删除当前服务端会话。")}</p><div className="settings-rows"><div><span>{t("接入方式")}</span><strong>{t("个人 API Key")}</strong></div><div><span>{t("任务行数")}</span><strong>{t("按实际填写行数")}</strong></div><div><span>{t("会话有效期")}</span><strong>{t("12 小时")}</strong></div><div><span>{t("数据与结果")}</span><strong>{t("由胜算云账号隔离")}</strong></div><div><span>{t("可用余额")}</span><strong>{balance ? t(money(balance.availableBalanceT, balance.currency)) : t("暂未返回")}</strong></div></div><button className="button primary" onClick={logout}>{t("退出并更换 API Key")}<ArrowRight size={16} /></button><p className="subtle">{t("LoomSkill v0.1 · MIT · 独立开源客户端")}</p></section></>}
    </main><SkillWorkspaceFooter /></div>
    {connectionOpen && !connected && <Modal title={t(canonicalSkill && !resumeQuote.current ? "连接你的工作空间" : "连接后预估费用")} locked={loginBusy} onClose={() => { setConnectionOpen(false); resumeQuote.current = false; setKey(''); setLoginError(''); }}><form onSubmit={login}><div className="modal-body"><p>{t(canonicalSkill && !resumeQuote.current ? "连接后可查看余额，并继续填写和运行当前 Skill。" : "连接后预估所需的 Token 消耗。")}</p><label className="field-label">{t("胜算云 API Key")}<input required type="password" autoComplete="off" spellCheck={false} value={key} placeholder={t("输入你的 API Key")} onChange={e => setKey(e.target.value)} /></label><div className="login-help"><a href="https://www.shengsuanyun.com/?from=Zoey" target="_blank" rel="noopener noreferrer">{t("没有 Key？此链接注册领取 10 元 Token 额度")} ↗</a></div>{loginError && <p className="error" role="alert">{t(loginError)}</p>}<p className="privacy-note"><ShieldCheck size={16} />{t("Key 加密保存在服务器会话中，12 小时后过期；不会写入浏览器本地存储。")}</p></div><div className="modal-foot"><button type="button" className="button" disabled={loginBusy} onClick={() => { setConnectionOpen(false); resumeQuote.current = false; setKey(''); setLoginError(''); }}>{t("继续填写")}</button><button type="submit" className="button primary" disabled={loginBusy || !key.trim()}>{loginBusy ? <LoaderCircle size={16} className="spin" /> : <ArrowRight size={16} />}{t("连接并继续")}</button></div></form></Modal>}
    {confirmation && <Modal title={confirmation.attempted ? t("确认提交状态") : t("确认本次执行")} locked={busy} onClose={() => { setConfirmation(null); setRefresh(r => r + 1); }}><div className="modal-body"><div className="quote-title"><span className="quote-icon"><Wallet size={23} /></span><div><strong>{skillText(confirmation.name || listing?.displayName || '') || t("市场工作流")}</strong><p>{confirmation.quote.taskCount} {t(" 项任务 · ")}{t("使用你的胜算云余额")}</p></div></div><div className="quote-lines"><div><span>{t("创作者调用费")}</span><strong>{confirmation.quote.source === 'official' ? t("无技能调用费") : t(money(confirmation.quote.taskFixedFeeT != null && confirmation.quote.taskCount != null ? confirmation.quote.taskFixedFeeT * confirmation.quote.taskCount : undefined, confirmation.quote.currency))}</strong></div><div><span>{t("预计模型费用")}</span><strong>{confirmation.quote.estimatedExecutionCostT == null ? t("服务未单独返回") : t(money(confirmation.quote.estimatedExecutionCostT, confirmation.quote.currency))}</strong></div><div className="quote-total"><span>{t("预计预占金额")}</span><strong>{t(money(confirmation.quote.estimatedBuyerPayableT, confirmation.quote.currency))}</strong></div>{confirmation.balance && <div><span>{t("当前可用余额")}</span><strong>{t(money(confirmation.balance.availableBalanceT, confirmation.balance.currency))}</strong></div>}</div><p className="quote-note">{confirmation.quote.source === 'official' ? t("官方模板按模型实际用量结算，不收取技能调用费。运行失败或部分完成时，已产生的模型用量仍可能计费，未使用的预占金额按服务结算释放。") : t("下单时锁定当前可售工作流版本与价格，最终费用以实际结算为准。失败或取消的市场运行最终收费为零；部分失败或部分取消的运行可能仍处于待结算状态，以服务返回为准。")}</p>{confirmation.attempted && <p className="notice">{t("提交已尝试。重试将沿用原始数据与请求编号，避免重复下单；也可关闭弹窗，到我的任务核对。")}</p>}{quoteError && <p className="error" role="alert">{t(quoteError)}</p>}{confirmation.balance?.currency === confirmation.quote.currency && confirmation.balance?.availableBalanceT != null && confirmation.quote.estimatedBuyerPayableT != null && confirmation.balance.availableBalanceT < confirmation.quote.estimatedBuyerPayableT && <p className="error">{t("当前余额不足，请先在胜算云充值，再重新预估。")}</p>}</div><div className="modal-foot"><button className="button" disabled={busy} onClick={() => { setConfirmation(null); setRefresh(r => r + 1); }}>{confirmation.attempted ? t("稍后核对") : t("返回修改")}</button><button className="button primary" disabled={busy || (!confirmation.attempted && confirmation.balance?.currency === confirmation.quote.currency && confirmation.balance?.availableBalanceT != null && confirmation.quote.estimatedBuyerPayableT != null && confirmation.balance.availableBalanceT < confirmation.quote.estimatedBuyerPayableT)} onClick={execute}>{busy ? <LoaderCircle size={16} className="spin" /> : <Play size={16} />}{confirmation.attempted ? t("重试同一提交") : t("确认费用并执行")}</button></div></Modal>}
  </div>;
}
