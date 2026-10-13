import type { Metadata } from "next";
import "./globals.css";
import "./studio-market.css";
import "./public.css";
import "./home.css";
import "./plush.css";
import { LanguageProvider } from '@/components/language-provider';
import './language.css';
import './favorites.css';
import { RetryDraftProvider } from '@/components/retry-draft-provider';
import { FavoritesProvider } from '@/components/favorites-provider';
import { FavoritesNotice } from '@/components/favorite-button';
export const metadata: Metadata = {
  metadataBase: new URL("https://loomskill.com"),
  title: "LoomSkill · AI 批处理工作台",
  description: "LoomSkill 是独立开发的电商 AI 批处理工作台。选择 Skill，填写表格，批量生成商品图片与营销文案，统一查看和下载结果。",
  icons: { icon: "/loomdesk-mark.svg" }
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body><LanguageProvider><FavoritesProvider><RetryDraftProvider>{children}</RetryDraftProvider><FavoritesNotice /></FavoritesProvider></LanguageProvider></body></html>;
}
