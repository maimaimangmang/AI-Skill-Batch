'use server';
import { revalidatePath } from 'next/cache';

// Refresh only the public catalog; no session or execution data is involved.
export async function refreshPublicCatalog() {
  revalidatePath('/skills', 'page');
}
