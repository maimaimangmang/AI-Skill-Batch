import Link from 'next/link';
import { PublicShell } from '@/components/public-site';
export default function NotFound() { return <PublicShell><main className="public-empty"><span className="public-eyebrow">404</span><h1>没有找到这个页面</h1><p>这个 Skill 可能已下架，或链接有误。</p><Link className="public-button primary" href="/skills">浏览可用 Skill</Link></main></PublicShell>; }
