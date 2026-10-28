import type { Metadata } from 'next';
import type { Locale } from './i18n';
import { translate } from './i18n';
import { localizedPath } from './locale';
import { SITE_URL } from './public-skills';
export function pageMetadata(title: string, description: string, path: string, locale:Locale = 'zh-CN', image = '/share-image'): Metadata {
  const url = SITE_URL + localizedPath(path, locale);
  const localizedTitle = translate(locale,title), localizedDescription = translate(locale,description);
  return { title:localizedTitle, description:localizedDescription,
    alternates: { canonical:url, languages:{'zh-CN':SITE_URL+localizedPath(path,'zh-CN'), en:SITE_URL+localizedPath(path,'en'), 'x-default':SITE_URL+localizedPath(path,'zh-CN')} },
    openGraph: { type:'website', title:localizedTitle, description:localizedDescription, url, siteName:'LoomSkill', locale:locale === 'en' ? 'en_US' : 'zh_CN', images:[{url:SITE_URL+image,alt:localizedTitle}] },
    twitter:{card:'summary_large_image',title:localizedTitle,description:localizedDescription,images:[SITE_URL+image]} };
}
export function jsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, '\\u003c'); }
