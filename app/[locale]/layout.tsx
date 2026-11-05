import { isLocale } from '@/lib/locale';
import { notFound } from 'next/navigation';
import type { Metadata } from "next";
import "@/app/globals.css";
import "@/app/studio-market.css";
import "@/app/public.css";
import "@/app/home.css";
import "@/app/plush.css";
import { LanguageProvider } from '@/components/language-provider';
import '@/app/language.css';
import '@/app/favorites.css';
import '@/app/skill-workspace.css';
import '@/app/account-menu.css';
import '@/app/app-select.css';
import '@/app/palette.css';
import '@/app/workflow-panels.css';
import '@/app/mobile.css';
import { RetryDraftProvider } from '@/components/retry-draft-provider';
import { FavoritesProvider } from '@/components/favorites-provider';
import { FavoritesNotice } from '@/components/favorite-button';
import BackToTop from '@/components/back-to-top';
const baseMetadata: Metadata = {
  metadataBase: new URL("https://loomskill.com"),
  title: "LoomSkill · AI 批处理工作台",
  description: "LoomSkill 是 AI Skill 批处理平台。在线填表或导入 Excel / CSV，批量生成商品图片、视觉素材与营销文案，执行前确认费用，统一查看和下载结果。",
  icons: { icon: "/loomdesk-mark.svg" }
};
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return locale === 'en' ? { ...baseMetadata, title: 'LoomSkill · AI Batch Workspace', description: 'Run AI Skills in batches with LoomSkill. Fill in a table or import Excel / CSV, review estimated costs, and view and download your results.' } : baseMetadata;
}
export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale:string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <html lang={locale}><body><LanguageProvider initialLocale={locale}><FavoritesProvider><RetryDraftProvider>{children}</RetryDraftProvider><FavoritesNotice /><BackToTop /></FavoritesProvider></LanguageProvider></body></html>;
}
