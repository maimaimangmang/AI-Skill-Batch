export type FeaturedWorkflow = {
  listingId?: string;
  officialTemplateId?: string;
  url: string;
  title: string;
  reason: string;
  category: string;
  cover: 'commerce' | 'image' | 'text' | 'video';
  hot?: boolean;
  authorName: string;
  // Public reference fee for demo only; authenticated prices come from the API.
  referenceFee?: { amountT: number; currency: string; checkedAt: string };
};

// Author snapshots verified on public detail pages on 2026-09-21; live listing data takes precedence.
// Fixed owner selection. IDs and URLs verified against the public market.
// Official templates use their own execution API inside the workbench.
export const featuredWorkflows: FeaturedWorkflow[] = [
  { listingId: '019fc6b4-8d10-7517-882d-fcb27bcbe42e', url: 'https://www.shengsuanyun.com/zh/loomloom/market/skills/019fc6b4-8d10-7517-882d-fcb27bcbe42e', title: 'Angel亚马逊电商套图生成器', reason: '上传商品白底图和商品信息，生成 8 张亚马逊风格电商套图。', category: '电商套图', cover: 'commerce', hot: true, authorName: 'user_rnrcjy', referenceFee: { amountT: 1000000, currency: 'CNY', checkedAt: '2026-09-21' } },
  { officialTemplateId: 'text-image-v1', url: 'https://www.shengsuanyun.com/zh/loomloom/market/templates/text-image-v1', title: '通用文生图', reason: '输入提示词，批量生成插画、场景图和视觉素材。', category: '图片生成', cover: 'image', authorName: 'LoomLoom 官方' },
  { officialTemplateId: 'text-v1', url: 'https://www.shengsuanyun.com/zh/loomloom/market/templates/text-v1', title: '通用文本生成', reason: '批量生成文案、产品描述、摘要与扩写内容。', category: '文本生成', cover: 'text', authorName: 'LoomLoom 官方' },
  { listingId: '01a0c2dc-bf56-7e1b-a86f-ff148ab9ec66', url: 'https://www.shengsuanyun.com/zh/loomloom/market/skills/01a0c2dc-bf56-7e1b-a86f-ff148ab9ec66', title: '电商SKU白底图防漂移生成器', reason: '上传商品参考图，生成白底 SKU 图，保持商品结构、颜色与配件数量。', category: 'SKU 白底图', cover: 'image', authorName: 'user_ryugdo', referenceFee: { amountT: 69900000, currency: 'CNY', checkedAt: '2026-09-21' } },
];
