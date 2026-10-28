'use client';

import Image from 'next/image';
import { ArrowRight, Check } from 'lucide-react';
import Link from './localized-link';
import { PublicShell } from './public-site';
import { useI18n } from './language-provider';

const preparation = [
  ['一张清晰的产品原图', '主体完整、细节清楚，尽量减少遮挡。不要用已经变形或过度修饰的图片作为产品依据。'],
  ['一张有权使用的风格参考图', '选择你想借鉴的光线、构图和氛围。参考图用于表达方向，不代表能逐像素还原。'],
  ['一句明确的画面要求', '写清保留什么、改变什么，例如保留陶瓷质感，换成暖光床头场景，不添加文案。'],
];
const questions = [
  ['不会写代码也能用吗？', '可以。Skill 是预先配置好的工作流，你在网页任务表里填写要求、选择图片即可。执行时需要连接胜算云 API Key，不需要编写代码。'],
  ['免费吗？费用付给谁？', '浏览案例和准备任务不触发生成。云端执行与模型调用由胜算云提供，按所选 Skill 的创作者调用费和模型用量计费。确认预估费用后才执行，最终以实际结算为准。'],
  ['商品外观会完全保留吗？', '不能保证。生成模型可能改变形状、商标、纹理或文字。先试跑一张，放大核对产品细节，再决定是否批量制作。'],
  ['可以直接作为亚马逊主图吗？', '场景图不等同于合规主图。请按平台和类目的图片要求检查背景、尺寸、文字及产品真实性；需要套图时可以选择亚马逊电商套图工作流。'],
];

export function ProductPhotographyPage() {
  const { t } = useI18n();
  return <PublicShell showHomeBack><main className="product-photo-page">
    <section className="public-section product-photo-hero">
      <div className="product-photo-copy">
        <span className="public-eyebrow">{t('为电商卖家与内容运营准备')}</span>
        <h1>{t('AI 商品图生成，')}<br /><em>{t('从你的产品原图开始')}</em></h1>
        <p>{t('上传产品原图和风格参考图，把想要的光线、背景与氛围变成商品场景图。先确认一张的效果，再用任务表批量制作。')}</p>
        <div className="public-actions"><Link className="public-button primary" href="/skills/ecommerce-image-remix">{t('试做一张商品图')}<ArrowRight size={18} /></Link><Link className="public-button" href="#product-photo-case">{t('看输入与成品')}</Link></div>
        <div className="public-benefits"><span><Check size={15} />{t('无需写代码')}</span><span><Check size={15} />{t('执行前确认费用')}</span></div>
        <p className="product-photo-note">{t('先浏览和填表，生成时再连接胜算云 API Key。')}</p>
      </div>
      <figure className="product-photo-result"><Image src="/examples/ecommerce-image-remix/result.png" alt={t('试跑成品：暖光床头场景中的陶瓷杯')} width={1024} height={1024} sizes="(max-width:760px) 100vw, 50vw" priority /><figcaption>{t('作者真实试跑 · GPT Image 2')}</figcaption></figure>
    </section>
    <section className="public-section batch-example-section" id="product-photo-case">
      <span className="public-eyebrow">{t('从输入到结果')}</span><h2>{t('一只陶瓷杯，如何变成暖光场景图')}</h2>
      <p>{t('这组图片来自电商图复刻工作流的作者试跑。参考图负责表达氛围，产品原图提供主体，文字补充材质和画面限制。')}</p>
      <div className="batch-example-inputs">{[
        { src:'/examples/ecommerce-image-remix/reference.png', label:'参考图' },
        { src:'/examples/ecommerce-image-remix/product.jpeg', label:'产品原图' },
        { src:'/examples/ecommerce-image-remix/result.png', label:'生成结果' },
      ].map(item => <figure key={item.src}><Image src={item.src} alt={t(item.label)} width={420} height={420} sizes="(max-width:760px) 90vw, 33vw" /><figcaption>{t(item.label)}</figcaption></figure>)}</div>
      <div className="product-photo-prompt"><h3>{t('这次试跑的画面要求')}</h3><blockquote>{t('保留参考图暖黄色灯光、床头木桌和温馨氛围，以产品原图中的陶瓷杯为主角，清理杂物，不加文案。杯子保持陶瓷质感，不要发光。')}</blockquote><p>{t('这是单次生成示例；换产品、参考图或模型后，效果也会变化。')}</p></div>
      <Link className="public-button" href="/skills/ecommerce-image-remix">{t('用我的产品试一张')}<ArrowRight size={16} /></Link>
    </section>
    <section className="public-section public-how"><h2>{t('开始前，准备好这三样')}</h2><div className="public-steps">{preparation.map(([title, text], index) => <article key={title}><span className="step-number">0{index + 1}</span><h3>{t(title)}</h3><p>{t(text)}</p></article>)}</div></section>
    <section className="public-section product-photo-next"><div><span className="public-eyebrow">{t('从一张到一批')}</span><h2>{t('效果确认后，再扩展到整批产品')}</h2><p>{t('每行准备一个产品的输入，沿用同一套风格要求。在线填写或导入 Excel / CSV，检查图片和字段对应关系，再校验费用并提交。')}</p><Link className="public-button" href="/batch-image-generation#spreadsheet-guide">{t('查看批量导入步骤')}<ArrowRight size={16} /></Link></div><div className="product-photo-check"><h3>{t('批量前，先检查这四项')}</h3><ul>{['产品形状、颜色和材质是否准确', '商标、包装文字和细节是否失真', '画面比例、裁切和留白是否合适', '预估费用是否在本次预算内'].map(item => <li key={item}><Check size={16} /><span>{t(item)}</span></li>)}</ul></div></section>
    <section className="public-section batch-faq"><h2>{t('AI 商品图常见问题')}</h2>{questions.map(([title, text]) => <details className="product-photo-faq" key={title}><summary>{t(title)}</summary><p>{t(text)}</p></details>)}</section>
    <section className="public-end"><h2>{t('从一个产品、一张图开始')}</h2><p>{t('打开任务表，先准备你的图片与要求。需要一整套商品图片，也可以选择电商套图工作流。')}</p><div className="public-actions"><Link className="public-button primary" href="/skills/ecommerce-image-remix">{t('试做一张商品图')}<ArrowRight size={18} /></Link><Link className="public-button" href="/skills/amazon-product-images">{t('查看亚马逊套图工作流')}</Link></div></section>
  </main></PublicShell>;
}
