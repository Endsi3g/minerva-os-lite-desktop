'use client';

import { useEffect } from 'react';

// Warns the user before they close the tab / navigate away via the browser
// (refresh, close, external link) while a form has unsaved changes. Does not
// catch in-app route changes — pair with an explicit confirm in onClick
// handlers for internal navigation if needed.
export function useUnsavedChangesGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requires returnValue to be set; the string itself is ignored
      // by modern browsers in favor of a generic built-in message.
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}
