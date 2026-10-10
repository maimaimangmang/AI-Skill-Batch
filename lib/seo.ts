import type { Metadata } from 'next';
import { SITE_URL } from './public-skills';
export function pageMetadata(title: string, description: string, path: string, image = '/share-image'): Metadata {
  return { title, description, alternates: { canonical: SITE_URL + path },
    openGraph: { type: 'website', title, description, url: SITE_URL + path, siteName: 'LoomSkill', locale: 'zh_CN', images: [{ url: SITE_URL + image, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [SITE_URL + image] } };
}
export function jsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, '\\u003c'); }
