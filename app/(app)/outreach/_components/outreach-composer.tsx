'use client';

import React from 'react';
import { ComposerStudioRoot } from '@/app/(app)/composer/_components/composer-studio-root';

export function OutreachComposer() {
  return (
    <div className="h-full w-full">
      <ComposerStudioRoot showSubNav={false} />
    </div>
  );
}

export default OutreachComposer;
