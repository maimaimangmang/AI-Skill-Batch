import { notFound } from 'next/navigation';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}) { return { title:(await params).locale === 'en' ? 'Page not found · LoomSkill' : '页面未找到 · LoomSkill', robots:{index:false,follow:true} }; }
export default function Page(){notFound();}
