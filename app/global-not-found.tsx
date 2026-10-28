import Link from 'next/link';
export const metadata = { title:'Page not found · LoomSkill', robots:{index:false,follow:true} };
export default function GlobalNotFound(){return <html lang="en"><body><main><h1>404 · Page not found</h1><Link href="/en">Back to LoomSkill</Link></main></body></html>}
