import { ImageResponse } from 'next/og';
export const dynamic = 'force-static';
export function GET() {
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#252c52', color: '#fff', padding: '80px' }}><div style={{ display: 'flex', color: '#bcb0ff', fontSize: 36 }}>LoomSkill / AI BATCH STUDIO</div><div style={{ display: 'flex', fontSize: 82, marginTop: 34, lineHeight: 1.1 }}>One table.<br />Many possibilities.</div><div style={{ display: 'flex', fontSize: 28, marginTop: 40, color: '#d5d8ee' }}>Explore AI workflows. Generate in batches.</div></div>, { width: 1200, height: 630 });
}
