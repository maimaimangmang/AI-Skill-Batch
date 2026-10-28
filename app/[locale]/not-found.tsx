import type { Metadata } from 'next';
import { MissingPage } from '@/components/missing-page';

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function NotFound() { return <MissingPage />; }
