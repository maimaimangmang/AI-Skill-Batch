'use client';

import { useEffect, useRef, useState } from 'react';

// Store browsing controls on their own history entry, never task inputs or files.
export function useHistorySnapshot<T>(key: string, value: T, restore: (saved: T) => void) {
  const apply = useRef(restore);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const saved = window.history.state?.[key];
    if (saved !== undefined) apply.current(saved);
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (ready) window.history.replaceState({ ...window.history.state, [key]: value }, '');
  }, [key, value, ready]);
  return ready;
}
