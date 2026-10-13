import type { Metadata } from "next";
import "./globals.css";
import "./studio-market.css";
import "./public.css";
import "./home.css";
import "./plush.css";
import { LanguageProvider } from '@/components/language-provider';
import './language.css';
import './favorites.css';
import './skill-workspace.css';
import './account-menu.css';
import { RetryDraftProvider } from '@/components/retry-draft-provider';
import { FavoritesProvider } from '@/components/favorites-provider';
import { FavoritesNotice } from '@/components/favorite-button';
export const metadata: Metadata = {
  metadataBase: new URL("https://loomskill.com"),
  title: "LoomSkill · AI 批处理工作台",
  description: "LoomSkill 是 AI Skill 批处理平台。在线填表或导入 Excel / CSV，批量生成商品图片、视觉素材与营销文案，执行前确认费用，统一查看和下载结果。",
  icons: { icon: "/loomdesk-mark.svg" }
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body><LanguageProvider><FavoritesProvider><RetryDraftProvider>{children}</RetryDraftProvider><FavoritesNotice /></FavoritesProvider></LanguageProvider></body></html>;
}
