'use client';
import { useI18n } from './language-provider';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronRight, CircleHelp, FileText, FlaskConical, Grid2X2, KeyRound, Image as ImageIcon, Languages, ScanSearch, ListChecks, LoaderCircle, LogOut, Menu, PanelLeftClose, Play, RefreshCw, Search, Settings2, ShieldCheck, Sparkles, Table2, Wallet, X } from 'lucide-react';
import type { Balance, InputRow, Listing, Quote, ResultRow, Schema } from '@/lib/types';
import { cellText, emptyRow, money, normalizeRows, schemaOf } from '@/lib/domain';
import { post, request, RequestError } from '@/lib/client';
import { demoRequest } from '@/lib/demo';
import { listingModelLabel, MARKET_PAGE_SIZE, marketPageNumbers, createMarketPager, type MarketPage } from '@/lib/market';
import { workflowPath } from '@/lib/official';
import { createMarketAuthorLoader } from '@/lib/market-authors';
import RunsView from './runs-view';
import Editor from './editor';
import Results from './results';
import Modal from './modal';
import FeaturedWorkflows from './featured-workflows';
import SidebarCommunity, { SidebarResources } from './sidebar-community';
import WorkflowAuthor from './workflow-author';
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

export default function Workbench() {
  const { t } = useI18n();
  const [ready, setReady] = useState(false); const [connected, setConnected] = useState(false); const [demo, setDemo] = useState(false);
  const [key, setKey] = useState(''); const [loginBusy, setLoginBusy] = useState(false); const [loginError, setLoginError] = useState('');
  const [view, setView] = useState<View>('market'); const [mobileNav, setMobileNav] = useState(false);
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
  const [listing, setListing] = useState<Listing | null>(null); const [schema, setSchema] = useState<Schema | null>(null); const [rows, setRows] = useState<InputRow[]>([]);
  const [validation, setValidation] = useState<string[]>([]); const [busy, setBusy] = useState(false); const [confirmation, setConfirmation] = useState<Confirmation | null>(null); const [quoteError, setQuoteError] = useState('');
  const [runId, setRunId] = useState(''); const [pending, setPending] = useState<Confirmation[]>([]);
  const api = useCallback(async (path: string, options?: RequestInit) => {
    if (demo) return demoRequest(path, options);
    try { return await request(path, options); } catch (e) {
      if (e instanceof RequestError && e.status === 401) { setConnected(false); setKey(''); setMarketPages([]); setMarketPage(0); setConfirmation(null); setRows([]); setListing(null); setBalance(null); setPending([]); setLoginError(e.message); }
      throw e;
    }
  }, [demo]);
  const marketPager = useMemo(() => createMarketPager(api, query), [api, query, refresh, connected]);
  const activeMarketPager = useRef(marketPager);
  const marketHasPages = marketPages.length > 0;
  const marketTotal = marketPager.totalCount;
  const marketPageCount = marketTotal == null ? Math.max(1, marketPages.length) : Math.max(1, Math.ceil(marketTotal / MARKET_PAGE_SIZE));
  const loadAuthors = useMemo(() => createMarketAuthorLoader(api), [api, connected, refresh]);
  const [authors, setAuthors] = useState<Record<string, string | null>>({});
  useEffect(() => { setAuthors({}); }, [loadAuthors]);
  useEffect(() => {
    if (!connected || demo || view !== 'market' || !listings.length) return;
    const controller = new AbortController();
    void loadAuthors(listings, controller.signal, (id, name) => {
      if (!controller.signal.aborted) setAuthors(current => ({ ...current, [id]: name }));
    });
    return () => controller.abort();
  }, [connected, demo, view, listings, loadAuthors]);
  useEffect(() => {
    let active = true;
    if (new URLSearchParams(window.location.search).get('demo') === '1') { setDemo(true); setConnected(true); setReady(true); return; }
    request('/session').then(data => { if (active) setConnected(data.connected); }).catch(e => { if (active) setLoginError(e.message); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const target = !connected ? '/login' : demo ? '/?demo=1' : '/';
    if (window.location.pathname + window.location.search !== target) {
      window.history.replaceState(null, '', target);
    }
    document.title = connected ? t("LoomSkill · AI 批处理工作台") : t("登录 · LoomSkill");
  }, [ready, connected, demo, t]);
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
    try { const data = await request('/session', post({ apiKey: key })); setKey(''); setDemo(false); setConnected(true); setBalance(data.balance); setView('market'); setRefresh(r => r + 1); }
    catch (e) { setLoginError((e as Error).message); } finally { setLoginBusy(false); }
  }
  function enterDemo() { setDemo(true); setConnected(true); setView('market'); setKey(''); setError(''); }
  async function logout() {
    setError('');
    if (!demo) { try { await request('/session', { method: 'DELETE' }); } catch (e) { setError((e as Error).message); return; } }
    setConnected(false); setDemo(false); setKey(''); setMarketPages([]); setMarketPage(0); setRows([]); setListing(null); setBalance(null); setConfirmation(null); setPending([]); setView('market'); setError(''); setLoginError('');
  }
  function navigate(next: View) { setView(next); setMobileNav(false); setError(''); }
  async function choose(item: Listing, retryRows?: ResultRow[]) {
    setLoading(true); setError('');
    try {
      const fresh: Listing = await api(workflowPath(item)); const shape = schemaOf(fresh);
      let initial = [emptyRow(shape.fields), emptyRow(shape.fields), emptyRow(shape.fields)];
      if (retryRows) {
        initial = retryRows.map(r => { const raw = JSON.parse(r.inputJson); return Object.fromEntries(shape.fields.map(f => [f.key, (raw.values || raw)[f.key] ?? f.default_value ?? ''])); });
      }
      setListing(fresh); setSchema(shape); setRows(initial); setValidation([]); setView('editor'); setConfirmation(null);
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }
  async function quote() {
    if (!listing || !schema) return;
    const normalized = normalizeRows(rows, schema.fields); setValidation(normalized.errors); if (normalized.errors.length) return;
    setBusy(true); setError('');
    try { const result = await api('/quote', post({ listingId: listing.id, officialTemplateId: listing.officialTemplateId, rows: normalized.rows })); setConfirmation({ ...result, name: listing.displayName }); setQuoteError(''); setBalance(result.balance); }
    catch (e) { setValidation([(e as Error).message]); } finally { setBusy(false); }
  }
  async function execute() {
    if (!confirmation) return; setBusy(true); setQuoteError(''); setConfirmation({ ...confirmation, attempted: true });
    try { const result = await api('/execute', post({ ticket: confirmation.ticket, confirm: true })); setRunId(result.runId); setView('detail'); setConfirmation(null); setPending(p => p.filter(x => x.ticket !== confirmation.ticket)); setRefresh(r => r + 1); }
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
  if (!ready) return <main className="boot"><img src="/loomdesk-mark.svg" alt="" /><LoaderCircle className="spin" /><p>{t("正在打开 LoomSkill…")}</p></main>;
  if (!connected) return <main className="login-page"><div className="login-story"><a className="brand" href="/"><img src="/loomdesk-mark-light.svg" alt="" />LoomSkill<span>WORKSPACE</span></a><div className="login-brand-tagline">{t("全国首创，Skill 并行批处理")}</div><div className="login-story-content"><div className="eyebrow">{t("AI BATCH STUDIO · 电商批处理")}</div><h1>{t("AI批量生成，")}<br />{t("从一张表开始")}</h1><p>{t("主图、详情图、营销文案，选好 Skill，填表批量生成。")}<br />{t("多任务并行，减少逐张等待。")}</p><div className="login-grid" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <div key={i}><span>{String(i + 1).padStart(2, '0')}</span><i /><Check size={17} /></div>)}</div><div className="login-caption"><Table2 size={17} />{t("批量调用 Skill · 统一查看与下载结果")}</div></div><span className="login-footer">{t("LoomSkill · 电商 AI 批处理工作台")}</span></div><div className="login-form-side"><form className="login-form" onSubmit={login}><h2>{t("连接你的工作空间")}</h2><p>{t("由胜算云提供多模型调用和结算服务。")}</p><label className="field-label">{t("胜算云 API Key")}<input required type="password" autoComplete="off" spellCheck={false} value={key} placeholder={t("输入你的 API Key")} onChange={e => setKey(e.target.value)} /></label><div className="login-help"><div><span>{t("还没有 API Key？")}</span><a href="https://www.shengsuanyun.com/?from=Zoey" target="_blank" rel="noopener noreferrer">{t("注册领取体验额度")}<ArrowRight size={13} /></a></div><p>{t("通过此链接注册，可领取 ")}<strong>{t("10 元")}</strong>{t("体验额度。")}</p></div>{loginError && <p className="error" role="alert">{t(loginError)}</p>}<button className="button primary full" disabled={loginBusy || !key.trim()}>{loginBusy ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}{t("连接工作台")}</button><p className="privacy-note"><ShieldCheck size={16} />{t("Key 加密保存在服务器会话中，12 小时后过期；不会写入浏览器本地存储。")}</p><div className="or"><span />{t("或者")}<span /></div><button className="button full" type="button" onClick={enterDemo}><FlaskConical size={17} />{t("先体验演示")}</button><small className="demo-explainer">{t("使用示例数据，不提交真实任务、不产生费用。")}</small></form></div></main>;
  const current = view === 'editor' ? 'market' : view === 'detail' ? 'runs' : view;
  return <div className={`app-shell studio-app${view === 'market' ? ' studio-market' : ' studio-workspace'}`}>
    {mobileNav && <button aria-label={t("关闭导航")} className="nav-scrim" onClick={() => setMobileNav(false)} />}
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}><a className="brand" href={demo ? '/?demo=1' : '/'}><img src="/loomdesk-mark.svg" alt="" />LoomSkill</a><button className="mobile-close icon-button" aria-label={t("收起导航")} onClick={() => setMobileNav(false)}><PanelLeftClose size={18} /></button><nav>{([{ id: 'market', name: t("工作流市场"), Icon: Grid2X2 }, { id: 'runs', name: t("我的任务"), Icon: ListChecks }, { id: 'settings', name: t("连接设置"), Icon: Settings2 }] as const).map(({ id, name, Icon }) => <button key={id} className={current === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={19} />{name}{current === id && <ChevronRight size={15} />}</button>)}</nav><div className="sidebar-bottom"><SidebarResources /><div className="sidebar-session"><div className="balance-card"><span><Wallet size={15} />{demo ? t("演示余额") : t("可用余额")}</span><strong>{balance ? t(money(balance.availableBalanceT, balance.currency)) : t("读取中…")}</strong><small>{demo ? t("仅供演示，不产生费用") : <>{t("费用由")}<a className="billing-provider-link" href="https://www.shengsuanyun.com/?from=Zoey" target="_blank" rel="noopener noreferrer" title={t("打开胜算云（新窗口）")}>{t("胜算云")}</a>{t("直接结算")}</>}</small></div><div className="account"><span className={`account-dot${demo ? ' demo' : ''}`} aria-hidden="true" /><div><strong>{demo ? t("演示空间") : t("API Key 已连接")}</strong><small>{demo ? t("示例数据") : t("独立会话 · 安全连接")}</small></div><button className="icon-button" aria-label={demo ? t("退出演示") : t("退出连接")} onClick={logout}><LogOut size={17} /></button></div></div><SidebarCommunity /></div></aside>
    <div className="main-shell"><div className="mobile-navigation"><button className="icon-button" aria-label={t("展开导航")} aria-expanded={mobileNav} onClick={() => setMobileNav(true)}><Menu size={20} />{t("菜单")}</button></div>
    {demo && <div className="demo-banner"><span><FlaskConical size={16} /><strong>{t("演示模式")}</strong> {t(" 当前内容为示例数据，运行不会调用真实 AI。")}</span><button onClick={logout}>{t("连接真实账号")}<ArrowRight size={14} /></button></div>}
    <main className="main-content">
      {error && <div className="error between" role="alert"><span>{t(error)}</span><button className="icon-button" aria-label={t("关闭提示")} onClick={() => setError('')}><X size={16} /></button></div>}
      {pending.length > 0 && view !== 'detail' && <div className="notice between"><span>{t("有 ")}{pending.length} {t(" 个提交尚未返回结果，可用原请求重试，避免重复下单。")}</span><button className="button small" onClick={() => { setConfirmation(pending[0]); setQuoteError(''); }}>{t("恢复提交")}</button></div>}
      {view === 'market' && <>
        <div className="page-heading market-heading"><div><h1>{t("找到工作流，")}<span className="market-heading-accent">{t("开始批量创作。")}</span></h1><p>{t("选择 Skill → 填写批量任务 → 确认费用 → 下载结果")}</p></div></div>
        <FeaturedWorkflows demo={demo} busy={loading} api={api} onChoose={choose} />
        <div className="market-toolbar" id="market-toolbar"><div className="market-tabs"><button className="selected" onClick={() => searchMarket('')}>{t("全部工作流")}</button></div><form className="search" onSubmit={e => { e.preventDefault(); searchMarket(search); }}><Search size={17} /><input aria-label={t("搜索工作流")} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("搜索名称或使用场景…")} />{search && <button type="button" aria-label={t("清除搜索")} className="icon-button" onClick={() => searchMarket('')}><X size={14} /></button>}</form><button className="icon-button refresh-button" aria-label={t("刷新市场")} onClick={() => searchMarket(query)}><RefreshCw size={18} /></button></div>
        {loading && !listings.length ? <div className="loading"><LoaderCircle className="spin" />{t("正在获取工作流…")}</div> : <div className="workflow-grid">{listings.map(item => { const { Icon, tone } = workflowIcon(item.displayName); const models = listingModelLabel(item); let count = 0; try { count = schemaOf(item).fields.filter(f => f.required).length; } catch {} return <article className="workflow-card" key={item.id}><div className="card-top"><span className={`workflow-icon workflow-icon-${tone}`}><Icon size={20} /></span><div className="card-title"><h2>{item.displayName}</h2><WorkflowAuthor name={item.creator?.nickname?.trim() || authors[item.id] || undefined} loading={!demo && !Object.hasOwn(authors, item.id)} unavailable={authors[item.id] === null} /></div></div><p>{item.description || t("选择此工作流查看输入字段与填写说明。")}</p><div className="card-model-tags"><span className={`model-tag${models ? ' disclosed' : ''}`} title={models ? t("模型（作者说明）：{0}", models) : t("公开资料暂未提供模型信息，不代表工作流未限制模型")}><Sparkles size={11} />{models || t("暂无模型信息")}</span></div><div className="card-meta"><span><Table2 size={12} />{count} {t(" 个必填字段")}</span><span className="card-source">{demo ? t("演示工作流") : t("LoomLoom 市场")}</span></div><div className="card-bottom"><div><strong>{t(money(item.taskFixedFeeT, item.currency))}</strong><span>{t("/ 任务调用费")}</span></div><button className="card-use" aria-label={t("使用 {0}", item.displayName)} disabled={loading || (!!item.executionAvailabilityStatus && item.executionAvailabilityStatus !== 'available')} onClick={() => choose(item)}>{t("使用")}<ArrowRight size={15} /></button></div></article>; })}</div>}
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
      {view === 'editor' && listing && schema && <Editor listing={listing} schema={schema} rows={rows} setRows={next => { setRows(next); setValidation([]); setConfirmation(null); }} demo={demo} api={api} busy={busy} errors={validation} onBack={() => navigate('market')} onQuote={quote} />}
      <RunsView active={view === 'runs'} api={api} refreshKey={refresh} onNew={() => navigate('market')} onResult={id => { setRunId(id); navigate('detail'); }} />
      {view === 'detail' && <Results key={runId} runId={runId} demo={demo} api={api} onBack={() => navigate('runs')} onRetry={async (listingId, failedRows, officialTemplateId) => { await choose({ id: listingId, officialTemplateId } as Listing, failedRows); }} />}
      {view === 'settings' && <><div className="page-heading"><div><div className="eyebrow">CONNECTION</div><h1>{t("连接设置")}</h1><p>{t("管理你的胜算云连接与工作空间。")}</p></div></div><section className="settings-card"><span className="settings-icon"><KeyRound size={25} /></span><h2>{demo ? t("当前为演示模式") : t("胜算云已连接")}</h2><p>{demo ? t("连接自己的 API Key，即可浏览真实市场并提交任务。") : t("你的 Key 仅用于调用胜算云 LoomLoom 服务。退出后会立即删除当前服务端会话。")}</p><div className="settings-rows"><div><span>{t("接入方式")}</span><strong>{demo ? t("演示数据") : t("个人 API Key")}</strong></div><div><span>{t("任务行数")}</span><strong>{t("按实际填写行数")}</strong></div><div><span>{t("会话有效期")}</span><strong>{t("12 小时")}</strong></div><div><span>{t("数据与结果")}</span><strong>{t("由胜算云账号隔离")}</strong></div><div><span>{t("可用余额")}</span><strong>{balance ? t(money(balance.availableBalanceT, balance.currency)) : t("暂未返回")}</strong></div></div><button className="button primary" onClick={logout}>{demo ? t("连接真实账号") : t("退出并更换 API Key")}<ArrowRight size={16} /></button><p className="subtle">{t("LoomSkill v0.1 · MIT · 独立开源客户端")}</p></section></>}
    </main><footer className="app-footer"><span>LoomSkill</span><span>{t("让重复的工作，有更简单的做法。")}</span><span>{t("独立开发 · 非胜算云官方产品")}</span></footer></div>
    {confirmation && <Modal title={confirmation.attempted ? t("确认提交状态") : t("确认本次执行")} locked={busy} onClose={() => { setConfirmation(null); setRefresh(r => r + 1); }}><div className="modal-body"><div className="quote-title"><span className="quote-icon"><Wallet size={23} /></span><div><strong>{confirmation.name || listing?.displayName || t("市场工作流")}</strong><p>{confirmation.quote.taskCount} {t(" 项任务 · ")}{demo ? t("演示执行，不产生费用") : t("使用你的胜算云余额")}</p></div></div><div className="quote-lines"><div><span>{t("创作者调用费")}</span><strong>{confirmation.quote.source === 'official' ? t("无技能调用费") : t(money(confirmation.quote.taskFixedFeeT != null && confirmation.quote.taskCount != null ? confirmation.quote.taskFixedFeeT * confirmation.quote.taskCount : undefined, confirmation.quote.currency))}</strong></div><div><span>{t("预计模型费用")}</span><strong>{confirmation.quote.estimatedExecutionCostT == null ? t("服务未单独返回") : t(money(confirmation.quote.estimatedExecutionCostT, confirmation.quote.currency))}</strong></div><div className="quote-total"><span>{t("预计预占金额")}</span><strong>{t(money(confirmation.quote.estimatedBuyerPayableT, confirmation.quote.currency))}</strong></div>{confirmation.balance && <div><span>{t("当前可用余额")}</span><strong>{t(money(confirmation.balance.availableBalanceT, confirmation.balance.currency))}</strong></div>}</div><p className="quote-note">{confirmation.quote.source === 'official' ? t("官方模板按模型实际用量结算，不收取技能调用费。运行失败或部分完成时，已产生的模型用量仍可能计费，未使用的预占金额按服务结算释放。") : t("下单时锁定当前可售工作流版本与价格，最终费用以实际结算为准。失败或取消的市场运行最终收费为零；部分失败或部分取消的运行可能仍处于待结算状态，以服务返回为准。")}</p>{confirmation.attempted && <p className="notice">{t("提交已尝试。重试将沿用原始数据与请求编号，避免重复下单；也可关闭弹窗，到我的任务核对。")}</p>}{quoteError && <p className="error" role="alert">{t(quoteError)}</p>}{confirmation.balance?.currency === confirmation.quote.currency && confirmation.balance?.availableBalanceT != null && confirmation.quote.estimatedBuyerPayableT != null && confirmation.balance.availableBalanceT < confirmation.quote.estimatedBuyerPayableT && <p className="error">{t("当前余额不足，请先在胜算云充值，再重新预估。")}</p>}</div><div className="modal-foot"><button className="button" disabled={busy} onClick={() => { setConfirmation(null); setRefresh(r => r + 1); }}>{confirmation.attempted ? t("稍后核对") : t("返回修改")}</button><button className="button primary" disabled={busy || (!confirmation.attempted && confirmation.balance?.currency === confirmation.quote.currency && confirmation.balance?.availableBalanceT != null && confirmation.quote.estimatedBuyerPayableT != null && confirmation.balance.availableBalanceT < confirmation.quote.estimatedBuyerPayableT)} onClick={execute}>{busy ? <LoaderCircle size={16} className="spin" /> : <Play size={16} />}{confirmation.attempted ? t("重试同一提交") : demo ? t("确认演示执行") : t("确认费用并执行")}</button></div></Modal>}
  </div>;
}
