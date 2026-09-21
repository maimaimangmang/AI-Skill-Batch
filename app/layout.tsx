import type { Metadata } from "next";
import "./globals.css";
import "./studio-market.css";
export const metadata: Metadata = {
  title: "LoomDesk · AI 批处理工作台",
  description: "LoomDesk 是独立开发的电商 AI 批处理工作台。选择 Skill，填写表格，批量生成商品图片与营销文案，统一查看和下载结果。",
  icons: { icon: "/loomdesk-mark.svg" }
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
