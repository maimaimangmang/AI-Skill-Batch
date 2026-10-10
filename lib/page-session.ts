import { cookies } from 'next/headers';
import { ApiError, sessionFromToken } from './server';

// Validate the stored session, not just the presence of a cookie. Never pass
// the decrypted API key into a page or client component.
export async function hasPageSession(): Promise<boolean> {
  const token = (await cookies()).get('loomdesk_session')?.value;
  try {
    sessionFromToken(token);
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return false;
    throw error;
  }
}
