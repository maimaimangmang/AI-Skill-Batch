import { parseRunFilters, readRunsPage } from './runs';
import { officialListing } from './official';
import { MARKET_PAGE_SIZE } from './market';
import type { InputRow, Listing, Quote, ResultRow, Run } from './types';
const fields = [{ key: 'product', label: '产品 / 主题', value_type: 'string', required: true, description: '描述你的产品或需要处理的主题' }, { key: 'audience', label: '目标人群', value_type: 'string', required: true }, { key: 'tone', label: '表达风格', value_type: 'string', enum_values: ['自然亲切', '专业简洁', '轻松有趣'], default_value: '自然亲切' }];
export const demoListings: Listing[] = [
  ['demo-copy', '产品文案工作流', '从产品卖点到完整文案，为不同受众生成清晰、自然的产品介绍。', 2000000],
  ['demo-social', '社交内容创作助手', '把选题整理成标题与正文，让一周的内容一次准备好。', 1000000],
  ['demo-review', '产品需求评审', '梳理需求中的用户价值、逻辑缺口和实施风险，形成可执行的建议。', 3000000],
  ['demo-translate', '品牌内容翻译', '面向不同市场调整语气与表达，保持品牌信息一致。', 1000000],
  ['demo-research', '用户洞察整理', '把零散的访谈与反馈整理成主题、痛点和产品机会。', 2000000],
  ['demo-script', '短视频脚本助手', '从一句创意出发，组织开场、分镜和口播文案。', 3000000]
].map(([id, displayName, description, fee]) => ({ id: String(id), displayName: String(displayName), description: String(description), currency: 'CNY', creator: { nickname: 'LoomDesk（演示）' }, taskFixedFeeT: Number(fee), executionAvailabilityStatus: 'available', inputSchemaSnapshot: { fields, instructions: ['每行是一项独立任务。请尽量写清产品特点和目标人群。'], sample_rows: [{ product: '轻便随行咖啡杯，保温 6 小时', audience: '都市通勤人群', tone: '自然亲切' }] } }));
const demoOfficial = ['text-image-v1', 'text-v1'].map(id => {
  const image = id === 'text-image-v1'; const key = image ? '图片提示词' : '文本提示词';
  return officialListing({ templateId: id, version: 'demo', name: image ? '通用文生图' : '通用文本生成', description: '演示模板 · 输入和结果仅用于体验，不调用真实 AI。',
    fields: [{ key: 'prompt', label: key, type: 'string', required: true }, ...(image ? [{ key: 'ratio', label: '图片比例', type: 'enum', required: true, enumValues: ['1:1', '4:5', '16:9', '9:16'] }] : [])],
    columns: [{ fieldKey: 'prompt', headerLabel: key, order: 1 }, ...(image ? [{ fieldKey: 'ratio', headerLabel: '图片比例', order: 2 }] : [])],
    sampleRows: [{ values: { [key]: image ? '咖啡杯的电商产品展示图' : '为咖啡杯写一段产品介绍', ...(image ? { '图片比例': '1:1' } : {}) } }] });
});
const allDemoListings = [...demoListings, ...demoOfficial];
const balance = { availableBalanceT: 1285000000, currency: 'CNY' };
const runs: Run[] = [];
const results = new Map<string, ResultRow[]>();
const tickets = new Map<string, { listingId: string; rows: InputRow[]; quote: Quote; result?: unknown }>();
export async function demoRequest(path: string, options?: RequestInit): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 200));
  const body = typeof options?.body === 'string' ? JSON.parse(options.body) : {};
  if (path === '/session') return { connected: true };
  if (path === '/balance') return balance;
  if (path.startsWith('/market?') || path === '/market') {
    const params = new URLSearchParams(path.split('?')[1]); const q = params.get('keyword') || '';
    const offset = Math.max(0, Number.parseInt(params.get('pageToken') || '0', 10) || 0);
    const matches = demoListings.filter(l => (l.displayName + l.description).includes(q));
    return { items: matches.slice(offset, offset + MARKET_PAGE_SIZE), nextPageToken: offset + MARKET_PAGE_SIZE < matches.length ? String(offset + MARKET_PAGE_SIZE) : '' };
  }
  if (/^\/official\/[^/]+$/.test(path)) return demoOfficial.find(l => l.id === path.split('/')[2]);
  if (/^\/market\/[^/]+$/.test(path)) return demoListings.find(l => l.id === path.split('/')[2]);
  if (path === '/quote') {
    const ticket = crypto.randomUUID();
    const listing = allDemoListings.find(l => l.id === (body.officialTemplateId || body.listingId))!;
    const quote: Quote = { source: listing.officialTemplateId ? 'official' : undefined, currency: 'CNY', taskCount: body.rows.length, taskFixedFeeT: listing.taskFixedFeeT ?? 0, estimatedExecutionCostT: body.rows.length * 500000, estimatedBuyerPayableT: body.rows.length * ((listing.taskFixedFeeT ?? 0) + 500000) };
    tickets.set(ticket, { listingId: listing.id, rows: body.rows, quote });
    return { ticket, quote, balance, expiresAt: Date.now() + 300000 };
  }
  if (path === '/execute') {
    const job = tickets.get(body.ticket); if (!job) throw new Error('演示报价已失效，请重新预估。');
    if (job.result) return job.result;
    const listing = allDemoListings.find(l => l.id === job.listingId)!; const runId = `demo-${crypto.randomUUID()}`;
    runs.unshift({ runId, displayName: listing.displayName, status: 'completed', totalTasks: job.rows.length, completedTasks: job.rows.length, failedTasks: 0, createdAtUnix: Math.floor(Date.now() / 1000), ...(listing.officialTemplateId ? { templateKey: listing.id, actualCostT: 0, actualCost: { amount: '0', currency: 'CNY' } } : { market: { listingId: listing.id, skillName: listing.displayName, currency: 'CNY', finalBuyerPayableT: job.quote.estimatedBuyerPayableT } }) });
    results.set(runId, job.rows.map((row, i) => ({ rowIndex: i + 2, inputJson: JSON.stringify(row), status: 'completed', artifacts: [{ mimeType: 'text/plain', inlineText: listing.officialTemplateId ? `【演示结果 · 非 AI 实际生成】\n${row['图片提示词'] || row['文本提示词']}\n\n${listing.id === 'text-image-v1' ? '真实执行后会在这里显示生成图片，可预览与下载。' : '为日常生活添一份温度。轻巧随行的咖啡杯，陪你开启每一天。'}` : `【演示结果 · 非 AI 实际生成】\n${row.product}\n\n面向${row.audience}，以${row.tone}的风格介绍产品的使用场景与核心价值。\n\n连接自己的 API Key 后，这里会显示工作流的真实输出。` }] })));
    job.result = { runId }; return job.result;
  }
  if (path.startsWith('/runs?') || path === '/runs') {
    const params = new URLSearchParams(path.split('?')[1]);
    return readRunsPage(async page => {
      const matches = runs.filter(run => !page.get('status') || run.status === page.get('status'));
      const offset = Number(page.get('pageToken') || 0), size = Number(page.get('pageSize'));
      return { totalCount: matches.length, items: matches.slice(offset, offset + size), nextPageToken: offset + size < matches.length ? String(offset + size) : '' };
    }, parseRunFilters(params), params.get('pageToken') || '', options?.signal || undefined);
  }
  if (/^\/runs\/[^/]+\/results/.test(path)) return { items: results.get(path.split('/')[2]) || [] };
  if (/^\/runs\/[^/]+$/.test(path)) return { run: runs.find(r => r.runId === path.split('/')[2]) };
  if (path === '/pending') return { items: [] };
  throw new Error('演示模式不上传附件；连接 API Key 后可使用真实工作流。');
}
