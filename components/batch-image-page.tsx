'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { PublicShell } from './public-site';
import { useI18n } from './language-provider';

const workflows = [
  { title: '按提示词批量生成图片', description: '每行填写一组提示词，适合插画、场景图和视觉素材。具体模型与可选参数以任务表为准。', href: '/skills/text-to-image', link: '使用通用文生图' },
  { title: '参考风格，批量制作商品图', description: '准备参考图、产品原图与画面要求，用电商图复刻 Skill 生成商品场景图。不同产品可分行填写。', href: '/skills/ecommerce-image-remix', link: '使用电商图复刻' },
  { title: '生成亚马逊电商套图', description: '提供商品白底图和商品信息，使用专门的套图 Skill 制作电商图片。先查看输入要求和生成说明。', href: '/skills/amazon-product-images', link: '查看电商套图 Skill' },
];
const steps = [
  { title: '选择生图 Skill', text: '根据任务选择通用文生图、商品图复刻或电商套图，先查看输入字段和公开示例。' },
  { title: '在线填表或导入 Excel / CSV', text: '每行对应一项任务，按当前 Skill 的字段填写提示词、产品信息或图片。先用少量任务确认效果，再扩展到整批。' },
  { title: '确认费用并批量执行', text: '连接胜算云 API Key，校验任务并查看预估费用，确认后执行。在“我的任务”查看进度、结果与下载文件。' },
];
const questions = [
  { title: '批量生图可以导入 Excel 或 CSV 吗？', text: '可以。打开 Skill 的任务表后导入 Excel / CSV，并按该 Skill 的字段要求整理每行数据；也可以直接在线填写。' },
  { title: '批量生图怎样收费？', text: '费用由所选 Skill 的创作者调用费和模型用量费构成。执行前可查看预估费用，最终金额以实际结算为准。浏览与填写任务表不会直接执行任务。' },
  { title: '每行任务会生成几张图片？', text: '取决于所选 Skill 和参数。通用文生图、商品图复刻与电商套图的输出不同，请先查看各自的生成说明。' },
  { title: 'LoomSkill 只能批量生成图片吗？', text: 'LoomSkill 是 Skill 批处理平台，也可以运行文案创作等工作流。你可以在 Skill 目录中选择其他任务类型。' },
];

export function BatchImagePage() {
  const { t } = useI18n();
  return <PublicShell><main className="batch-image-page">
    <section className="public-section" id="image-workflows">
      <div className="public-section-heading"><div><h1>{t('选择适合你的批量生图场景')}</h1><p>{t('同一张任务表，按行准备输入；不同图片需求，选择对应 Skill。')}</p></div></div>
      <div className="public-cards">{workflows.map(item => <article className="public-card" key={item.href}><h2><Link href={item.href}>{t(item.title)}</Link></h2><p>{t(item.description)}</p><div className="public-card-bottom"><Link href={item.href}>{t(item.link)}<ArrowRight size={16} /></Link></div></article>)}</div>
    </section>
    <section className="public-section public-how"><h2>{t('如何用 Excel / CSV 批量生成图片')}</h2><div className="public-steps">{steps.map((step, i) => <article key={step.title}><span className="step-number">0{i + 1}</span><h3>{t(step.title)}</h3><p>{t(step.text)}</p></article>)}</div></section>
    <section className="public-section batch-example-section"><h2>{t('商品图示例：参考图 + 产品原图 → 生图结果')}</h2><p>{t('这是作者使用电商图复刻 Skill 的真实试跑。生成效果会随输入和模型变化。')}</p><div className="batch-example-inputs">{[
      { src: '/examples/ecommerce-image-remix/reference.png', label: '参考图' },
      { src: '/examples/ecommerce-image-remix/product.jpeg', label: '产品原图' },
      { src: '/examples/ecommerce-image-remix/result.png', label: '试跑成品：暖光床头场景中的陶瓷杯' },
    ].map(image => <figure key={image.src}><Image src={image.src} alt={t(image.label)} width={420} height={420} /><figcaption>{t(image.label)}</figcaption></figure>)}</div><Link className="public-button" href="/skills/ecommerce-image-remix">{t('查看案例与输入要求')}<ArrowRight size={16} /></Link></section>
    <section className="public-section batch-faq"><h2>{t('批量生图常见问题')}</h2>{questions.map(item => <div className="public-detail-section" key={item.title}><h3>{t(item.title)}</h3><p>{t(item.text)}</p></div>)}</section>
    <section className="public-end"><h2>{t('让下一批图片，从任务表开始')}</h2><p>{t('也需要文案或其他批处理？继续探索完整的 Skill 目录。')}</p><Link className="public-button primary" href="/skills">{t('浏览全部 Skill')}<ArrowRight size={18} /></Link></section>
  </main></PublicShell>;
}
