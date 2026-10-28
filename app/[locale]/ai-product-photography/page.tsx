import { ProductPhotographyPage } from '@/components/product-photography-page';
import { pageMetadata, jsonLd } from '@/lib/seo';
import { localizedPath } from '@/lib/locale';
import { translate, type Locale } from '@/lib/i18n';
import { SITE_URL } from '@/lib/public-skills';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return pageMetadata('AI 商品图生成：参考图复刻与批量制作教程 | LoomSkill', '用产品原图和风格参考图生成商品场景图。查看陶瓷杯真实案例、图片准备要求和批量制作步骤，先试跑一张，再用 Excel / CSV 扩展任务。', '/ai-product-photography', (await params).locale, '/examples/ecommerce-image-remix/result.png');
}

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const breadcrumb = { '@context':'https://schema.org', '@type':'BreadcrumbList', itemListElement:[
    { '@type':'ListItem', position:1, name:'LoomSkill', item:SITE_URL + localizedPath('/', locale) },
    { '@type':'ListItem', position:2, name:translate(locale, 'AI 商品图'), item:SITE_URL + localizedPath('/ai-product-photography', locale) },
  ] };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html:jsonLd(breadcrumb) }} /><ProductPhotographyPage /></>;
}
