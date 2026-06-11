'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  PenSquare, 
  Search, 
  Folder, 
  Sparkles, 
  Plug, 
  ChevronDown,
  Globe,
  CheckCircle2,
  Lock,
  PanelLeftClose,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  GoogleCalendarIcon, 
  GoogleDriveIcon, 
  SharePointIcon, 
  ZoomIcon, 
  TeamsIcon, 
  GoogleMeetIcon, 
  MinervaIcon
} from '@/components/icons';
import { 
  getFolders, 
  getProjects, 
  getConnectedIntegrations, 
  connectIntegration 
} from '@/lib/onboarding-store';

interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  owner: string;
  email: string;
  accEmail: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  status: string;
  assets: string;
  access: string;
  description: string;
}

export default function IntegrationsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [availableSearchQuery, setAvailableSearchQuery] = useState('');

  // Store-backed states
  const [folders, setFolders] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);

  // Selection state for connect modal
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationItem | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  useEffect(() => {
    const syncStore = () => {
      setFolders(getFolders());
      setProjects(getProjects());
      setConnectedIds(getConnectedIntegrations());
    };
    syncStore();
    window.addEventListener('minerva_store_update', syncStore);
    return () => window.removeEventListener('minerva_store_update', syncStore);
  }, []);

  const handleBackToWorkspace = () => {
    router.push('/today');
  };

  // Define all possible integrations inside the component or as a config
  const ALL_INTEGRATIONS: IntegrationItem[] = [
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      category: 'calendar',
      owner: 'Alex Smith',
      email: 'alexsmith@minerva-os-lite.com',
      accEmail: 'alexsmith.mobbin@gmail.com',
      icon: GoogleCalendarIcon,
      status: 'Active',
      assets: '—',
      access: 'Private',
      description: 'Synchronise your Google Calendar to extract context from upcoming events and schedules.'
    },
    {
      id: 'demo-website-1',
      name: 'Demo - Why AI Will Save the ...',
      category: 'website',
      owner: 'Alex Smith',
      email: 'alexsmith@minerva-os-lite.com',
      accEmail: 'This is a demo website integration',
      icon: () => (
        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-[#26251e]" />
        </div>
      ),
      status: 'Active',
      assets: '1',
      access: 'Entire workspace',
      description: 'Why AI Will Save the World — Article page analysis and content parsing.'
    },
    {
      id: 'demo-website-2',
      name: 'Demo - NVIDIA Announces Fi...',
      category: 'website',
      owner: 'Alex Smith',
      email: 'alexsmith@minerva-os-lite.com',
      accEmail: 'This is a demo website integration',
      icon: () => (
        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-[#26251e]" />
        </div>
      ),
      status: 'Active',
      assets: '1',
      access: 'Entire workspace',
      description: 'NVIDIA Announces Financial Results — Parsing dynamic charts and financial data.'
    },
    {
      id: 'meeting-recorder',
      name: 'Meeting recorder',
      category: 'meeting',
      owner: 'Alex Smith',
      email: 'alexsmith@minerva-os-lite.com',
      accEmail: 'alexsmith.meetings@minerva-os.com',
      icon: () => (
        <div className="flex items-center gap-1.5 py-1">
          <GoogleCalendarIcon size={16} />
          <ZoomIcon size={16} />
          <TeamsIcon size={16} />
          <GoogleMeetIcon size={16} />
        </div>
      ),
      status: 'Active',
      assets: '—',
      access: 'Private',
      description: 'Record, transcribe, and unlock knowledge from your meetings in Google Meet, Zoom, or Microsoft Teams.'
    },
    {
      id: 'sharepoint',
      name: 'Microsoft SharePoint',
      category: 'document',
      owner: 'Alex Smith',
      email: 'alexsmith@minerva-os-lite.com',
      accEmail: 'alexsmith.sharepoint@minerva-os.com',
      icon: SharePointIcon,
      status: 'Active',
      assets: '—',
      access: 'Private',
      description: 'Find and access all of your SharePoint content. Limited to your 1,000 most recent files in the Free tier.'
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      category: 'document',
      owner: 'Alex Smith',
      email: 'alexsmith@minerva-os-lite.com',
      accEmail: 'alexsmith.drive@gmail.com',
      icon: GoogleDriveIcon,
      status: 'Active',
      assets: '—',
      access: 'Private',
      description: 'Ask your docs, sheets, presentations, and files anything. Limited to your 1,000 most recent files in the Free tier.'
    },
    {
      id: 'website',
      name: 'Website',
      category: 'website',
      owner: 'Alex Smith',
      email: 'alexsmith@minerva-os-lite.com',
      accEmail: 'https://minerva-os-lite.com',
      icon: () => <Globe className="w-[18px] h-[18px] text-[#7a7a76]" />,
      status: 'Active',
      assets: '100 pages limit',
      access: 'Entire workspace',
      description: 'Update to enterprise to index more pages. Limited to 100 pages'
    }
  ];

  // Filtering connected integrations
  const connectedIntegrations = ALL_INTEGRATIONS.filter(item => 
    connectedIds.includes(item.id) &&
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtering available integrations
  const availableIntegrations = ALL_INTEGRATIONS.filter(item => 
    !connectedIds.includes(item.id) &&
    item.name.toLowerCase().includes(availableSearchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#26251e] font-sans selection:bg-[#f54e00]/10">
      
      {/* Minerva OS Lite Sidebar Layout */}
      <aside className="hidden lg:flex flex-col border-r border-[#e5e5e0] bg-[#f4f4f3] w-[240px] shrink-0">
        
        {/* Sidebar Brand Header */}
        <div className="flex h-12 items-center border-b border-[#e5e5e0] px-4 justify-between">
          <div className="flex items-center gap-2 font-sans font-semibold text-sm tracking-tight text-[#26251e]">
            <MinervaIcon size={20} className="shrink-0" />
            <div 
              onClick={handleBackToWorkspace}
              className="flex items-center gap-1.5 cursor-pointer hover:bg-[#e5e5e2] px-1.5 py-0.5 rounded transition-colors"
            >
              <span className="font-semibold text-sm text-[#26251e]">Minerva OS Lite</span>
              <ChevronDown className="h-3 w-3 text-[#7a7a76]" />
            </div>
          </div>
          <button 
            onClick={handleBackToWorkspace}
            className="h-7 w-7 flex items-center justify-center rounded text-[#7a7a76] hover:bg-[#e5e5e2] hover:text-[#26251e] transition-colors"
            title="Return to Workspace"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-4">
          <nav className="space-y-[2px] px-3">
            <Link 
              href="/prospecting" 
              className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-semibold text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e] rounded-md transition-all"
            >
              <PenSquare className="h-4 w-4 shrink-0 text-[#555552]" />
              <span>Prospecter</span>
            </Link>
            <Link 
              href="/leads" 
              className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-semibold text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e] rounded-md transition-all"
            >
              <Search className="h-4 w-4 shrink-0 text-[#555552]" />
              <span>Search</span>
            </Link>
            <Link 
              href="/library" 
              className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-semibold text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e] rounded-md transition-all"
            >
              <Folder className="h-4 w-4 shrink-0 text-[#555552]" />
              <span>Library</span>
            </Link>
            <Link 
              href="/leads" 
              className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-semibold text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e] rounded-md transition-all"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-[#555552]" />
              <span>Agents</span>
            </Link>
            <Link 
              href="/integrations" 
              className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-semibold text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e] rounded-md transition-all"
            >
              <Plug className="h-4 w-4 shrink-0 text-[#555552]" />
              <span>Integrations</span>
            </Link>
          </nav>

          {/* Folders Section */}
          <div className="px-3 space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider text-left">
              Folders
            </div>
            
            <div className="space-y-[2px]">
              {folders.map(folder => (
                <Link 
                  key={folder}
                  href="/library" 
                  className="flex items-center gap-2.5 px-2.5 py-1 text-xs text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e] rounded-md transition-colors"
                >
                  <Folder className="h-3.5 w-3.5 text-[#7a7a76] shrink-0" />
                  <span className="truncate">{folder}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Projects Section */}
          <div className="px-3 space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider text-left">
              Projects
            </div>
            
            <div className="space-y-[2px]">
              {projects.map(proj => (
                <div 
                  key={proj}
                  className="flex items-center gap-2.5 px-2.5 py-1 text-xs text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e] rounded-md transition-colors truncate"
                >
                  <Folder className="h-3.5 w-3.5 text-[#7a7a76] shrink-0" />
                  <span className="truncate">{proj}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-[#e5e5e0] bg-[#f4f4f3] py-3 px-3 space-y-3">
          
          {/* Upgrade progress circular details card */}
          <div className="p-3 bg-[#e5e5e2]/30 border border-[#e5e5e0] rounded-xl flex items-start gap-2.5 relative overflow-hidden">
            {/* Emerald green circle to match brand */}
            <div className="relative shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center rounded-full border border-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="space-y-2 flex-1 z-10 text-left">
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-[#26251e] leading-snug">
                  7 meetings and 20 messages left this month
                </p>
                <p className="text-[9px] text-[#7a7a76]">
                  Upgrade for unlimited use
                </p>
              </div>
              <Button 
                size="sm" 
                className="w-full h-7 bg-[#181717] hover:bg-[#2c2b2b] text-white rounded-md text-[10px] font-bold"
              >
                Upgrade
              </Button>
            </div>
          </div>

          {/* Settings row */}
          <div className="flex items-center justify-between">
            <Link
              href="/settings"
              className="flex items-center gap-2.5 text-xs font-semibold text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 px-2 py-1.5 rounded-md transition-colors flex-1"
            >
              {/* Notification emerald dot next to settings */}
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-bold">Settings</span>
            </Link>
            <button className="h-7 w-7 flex items-center justify-center rounded text-[#7a7a76] hover:bg-[#e5e5e2]">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-between relative overflow-hidden bg-white">
        
        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-8 space-y-10">
            
            {/* Connected Integrations Section */}
            <div className="space-y-5">
              
              {/* Header */}
              <div className="space-y-1">
                <h1 className="text-xl font-bold tracking-tight text-[#26251e] text-left">Connected integrations</h1>
                <p className="text-xs text-[#7a7a76] text-left">Manage your connected data sources</p>
              </div>

              {/* Filters row */}
              <div className="flex flex-wrap items-center gap-2 pb-2">
                
                {/* Search */}
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#7a7a76]" />
                  <Input 
                    placeholder="Search integrations"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8.5 pl-8.5 text-xs bg-white border-[#e5e5e0] focus-visible:ring-1 focus-visible:ring-[#059669] rounded-md"
                  />
                </div>

                {/* Dropdowns */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8.5 text-xs font-medium px-3 border-[#e5e5e0] text-[#555552] hover:text-[#26251e] rounded-md flex items-center gap-1.5"
                >
                  <span>All</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#7a7a76]" />
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8.5 text-xs font-medium px-3 border-[#e5e5e0] text-[#555552] hover:text-[#26251e] rounded-md flex items-center gap-1.5"
                >
                  <span>Any owner</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#7a7a76]" />
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8.5 text-xs font-medium px-3 border-[#e5e5e0] text-[#555552] hover:text-[#26251e] rounded-md flex items-center gap-1.5"
                >
                  <span>All apps</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#7a7a76]" />
                </Button>

              </div>

              {/* Connected Integrations Table */}
              <div className="border border-[#e5e5e0] rounded-xl overflow-hidden shadow-xs bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f4f4f3]/40 border-b border-[#e5e5e0] text-[#7a7a76] font-semibold">
                      <th className="py-2.5 px-4 font-bold flex items-center gap-1 cursor-pointer hover:text-[#26251e]">
                        <span>Name</span>
                        <ChevronDown className="h-3 w-3" />
                      </th>
                      <th className="py-2.5 px-4 font-bold">Connection status</th>
                      <th className="py-2.5 px-4 font-bold">Assets</th>
                      <th className="py-2.5 px-4 font-bold flex items-center gap-1 cursor-pointer hover:text-[#26251e]">
                        <span>Access</span>
                        <ChevronDown className="h-3 w-3" />
                      </th>
                      <th className="py-2.5 px-4 font-bold">Added by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e0]">
                    {connectedIntegrations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-[#7a7a76]">
                          No connected integrations yet. Use the available ones below to connect.
                        </td>
                      </tr>
                    ) : (
                      connectedIntegrations.map((item) => {
                        const IconComponent = item.icon;
                        return (
                          <tr key={item.id} className="hover:bg-[#f4f4f3]/10 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <IconComponent size={28} className="shrink-0" />
                                <div className="flex flex-col text-left">
                                  <span className="font-semibold text-sm text-[#26251e]">{item.name}</span>
                                  <span className="text-[10px] text-[#7a7a76]">{item.accEmail}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="font-medium text-[#26251e]">{item.status}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-[#7a7a76] font-medium text-left">{item.assets}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1 bg-[#f4f4f3] px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#555552] w-fit">
                                {item.access === 'Private' ? <Lock className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5 text-[#7a7a76]" />}
                                <span>{item.access}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-col text-left">
                                <span className="font-semibold text-[#26251e]">{item.owner}</span>
                                <span className="text-[10px] text-[#7a7a76]">{item.email}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* Available Integrations Section */}
            <div className="space-y-5">
              
              {/* Header */}
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-[#26251e] text-left">Available integrations</h2>
                <p className="text-xs text-[#7a7a76] text-left">Browse and connect your data sources</p>
              </div>

              {/* Search Available integrations */}
              <div className="relative w-64 pb-2">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#7a7a76]" />
                <Input 
                  placeholder="Search integrations"
                  value={availableSearchQuery}
                  onChange={(e) => setAvailableSearchQuery(e.target.value)}
                  className="h-8.5 pl-8.5 text-xs bg-white border-[#e5e5e0] focus-visible:ring-1 focus-visible:ring-[#059669] rounded-md"
                />
              </div>

              {/* Grid of Available Integrations cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableIntegrations.length === 0 ? (
                  <div className="col-span-2 py-8 text-center text-xs text-[#7a7a76]">
                    All available integrations are already connected.
                  </div>
                ) : (
                  availableIntegrations.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => {
                          setSelectedIntegration(item);
                          setShowConnectModal(true);
                        }}
                        className="p-5 border border-[#e5e5e0] hover:border-[#7a7a76] bg-[#f4f4f3]/10 hover:bg-[#f4f4f3]/20 transition-all rounded-xl flex flex-col justify-between h-[160px] shadow-2xs group cursor-pointer"
                      >
                        <div className="space-y-2">
                          <div className="pb-1 text-left">
                            <IconComponent size={20} className="text-[#7a7a76]" />
                          </div>
                          <h3 className="font-bold text-sm text-[#26251e] text-left">{item.name}</h3>
                          <p className="text-[11px] text-[#7a7a76] leading-relaxed text-left">
                            {item.description}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider group-hover:text-[#26251e] transition-colors mt-2 text-left">
                          View
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* Connect Integration Modal Overlay */}
      {showConnectModal && selectedIntegration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-[#e6e5e0] rounded-xl p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#26251e] text-left">Connecter {selectedIntegration.name}</h3>
              <p className="text-xs text-[#7a7a76] text-left">Voulez-vous connecter cette intégration à votre espace de travail Minerva OS Lite ?</p>
            </div>
            <div className="flex justify-end gap-2 text-xs pt-1">
              <Button 
                variant="ghost"
                onClick={() => {
                  setSelectedIntegration(null);
                  setShowConnectModal(false);
                }}
                className="h-8 text-[#555552]"
              >
                Annuler
              </Button>
              <Button 
                onClick={() => {
                  connectIntegration(selectedIntegration.id);
                  setSelectedIntegration(null);
                  setShowConnectModal(false);
                }}
                className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold"
              >
                Confirmer la connexion
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
