'use client';

import React, { useState } from 'react';
import { IntelligenceHeader } from './intelligence-header';
import { IntelligenceScrapeShortcut } from './intelligence-scrape-shortcut';
import { IntelligenceInsightsPanel } from './intelligence-insights-panel';
import { IntelligenceOpportunitiesPanel } from './intelligence-opportunities-panel';
import { IntelligenceCadencePanel } from './intelligence-cadence-panel';
import { IntelligenceSummariesPanel } from './intelligence-summaries-panel';
import { IntelligencePlaybooksPanel } from './intelligence-playbooks-panel';
import { IntelligenceCopilotPanel } from './intelligence-copilot-panel';

export function IntelligenceRoot() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    console.log('Intelligence dashboard refreshed');
  };

  return (
    <div className="flex h-full flex-col gap-5 p-6 overflow-y-auto min-h-0 bg-background">
      {/* Top Header section */}
      <IntelligenceHeader onRefresh={handleRefresh} />

      {/* Two-Column Grid Layout */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* Left Column (scrape shortcut, automated insights, opportunities, cadence charts) */}
        <div className="flex flex-col gap-5 min-w-0">
          <IntelligenceScrapeShortcut onImportComplete={handleRefresh} />
          <IntelligenceInsightsPanel key={`insights-${refreshTrigger}`} />
          <IntelligenceOpportunitiesPanel key={`opportunities-${refreshTrigger}`} />
          <IntelligenceCadencePanel />
        </div>

        {/* Right Column (summaries scope, outreach playbooks, copilot interface) */}
        <div className="flex flex-col gap-5 min-w-0">
          <IntelligenceSummariesPanel key={`summaries-${refreshTrigger}`} />
          <IntelligencePlaybooksPanel key={`playbooks-${refreshTrigger}`} />
          <IntelligenceCopilotPanel key={`copilot-${refreshTrigger}`} />
        </div>
      </div>
    </div>
  );
}

export default IntelligenceRoot;

