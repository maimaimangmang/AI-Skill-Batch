import { BatchImagePage } from '@/components/batch-image-page';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'AI 批量生图工具：Excel / CSV 生成商品图与插画 | LoomSkill',
  '用 LoomSkill 在线填表或导入 Excel / CSV，批量生成商品图、亚马逊电商套图与插画。查看真实生图案例，选择图片 Skill，确认预估费用后执行并统一下载结果。',
  '/batch-image-generation',
);

export default function Page() { return <BatchImagePage />; }
