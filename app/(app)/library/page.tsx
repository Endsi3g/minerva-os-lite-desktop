'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Folder as FolderIcon, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  FileCode, 
  Upload, 
  Search, 
  SlidersHorizontal, 
  LayoutGrid, 
  List, 
  ArrowUpDown,
  Lock,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getFolders, addFolder } from '@/lib/onboarding-store';

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<'All' | 'Shared' | 'Private'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [folders, setFolders] = useState<string[]>([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    const syncStore = () => {
      setFolders(getFolders());
    };
    syncStore();
    window.addEventListener('minerva_store_update', syncStore);
    return () => window.removeEventListener('minerva_store_update', syncStore);
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-6xl mx-auto p-8 space-y-8 text-[#26251e] font-sans selection:bg-[#f54e00]/10">
        
        {/* Header Section */}
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-[#26251e]">Library</h1>
          <p className="text-xs text-[#7a7a76]">
            View recent files from chats & manage files in your folders. <a href="#" className="text-[#059669] hover:underline">Learn more</a>
          </p>
        </div>

        {/* Create new file Row */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">Create new file</h2>
            <a href="#" className="text-xs text-[#7a7a76] hover:text-[#26251e] flex items-center gap-1 transition-colors">
              <span>All templates</span>
              <ChevronDown className="h-3 w-3 -rotate-90" />
            </a>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            
            {/* Blank File Card */}
            <div className="flex flex-col gap-2">
              <div className="aspect-[4/3] border border-dashed border-[#e5e5e0] hover:border-[#7a7a76] rounded-lg bg-[#f4f4f3]/40 flex flex-col items-center justify-center cursor-pointer transition-all">
                <Plus className="h-5 w-5 text-[#7a7a76] stroke-[2.5]" />
              </div>
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-semibold text-[#26251e]">Blank file</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#7a7a76]" />
              </div>
            </div>

            {/* ASMobbin Presentation Template Card */}
            <div className="flex flex-col gap-2">
              <div className="aspect-[4/3] border border-[#e5e5e0] hover:border-[#7a7a76] rounded-lg bg-white p-4 flex flex-col justify-between cursor-pointer transition-all relative overflow-hidden text-[#26251e] border-solid shadow-xs">
                <div className="space-y-1 z-10">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#059669]">Presentation</div>
                  <h3 className="font-bold text-xs leading-snug">Making Presentation Stick</h3>
                </div>
                <div className="text-[8px] opacity-80 z-10">A guide by Chip Heath & Dan Heath</div>
                {/* Tiny graphical circle overlay */}
                <div className="absolute -bottom-8 -right-8 h-20 w-20 rounded-full bg-[#059669]/10" />
              </div>
              <div className="text-xs px-1">
                <div className="font-semibold text-[#26251e] truncate">ASMobbin Template</div>
                <div className="text-[10px] text-[#7a7a76]">Presentation</div>
              </div>
            </div>

            {/* ASMobbin Brochure Template Card */}
            <div className="flex flex-col gap-2">
              <div className="aspect-[4/3] border border-[#e5e5e0] hover:border-[#7a7a76] rounded-lg bg-white p-3 flex flex-col justify-between cursor-pointer transition-all shadow-xs relative overflow-hidden">
                <div className="flex gap-2.5 h-full">
                  <div className="w-1.5 bg-[#10b981] rounded-xs" />
                  <div className="flex-1 space-y-1">
                    <div className="text-[7px] text-[#7a7a76] font-mono">Product Brochure</div>
                    <div className="h-2 w-16 bg-[#26251e]/20 rounded-xs" />
                    <div className="h-1.5 w-12 bg-[#26251e]/10 rounded-xs" />
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      <div className="h-8 bg-[#f4f4f3] rounded-xs" />
                      <div className="h-8 bg-[#f4f4f3] rounded-xs" />
                    </div>
                  </div>
                </div>
                <div className="absolute right-2 top-2 h-4 w-4 bg-[#10b981] rounded-xs flex items-center justify-center text-[8px] font-bold text-white">W</div>
              </div>
              <div className="text-xs px-1">
                <div className="font-semibold text-[#26251e] truncate">ASMobbin Brochure</div>
                <div className="text-[10px] text-[#7a7a76]">Document</div>
              </div>
            </div>

            {/* ASMobbin Health App Document Card */}
            <div className="flex flex-col gap-2">
              <div className="aspect-[4/3] border border-[#e5e5e0] hover:border-[#7a7a76] rounded-lg bg-white p-3 flex flex-col justify-between cursor-pointer transition-all shadow-xs relative overflow-hidden">
                <div className="space-y-1.5">
                  <div className="h-1.5 w-16 bg-[#059669]/30 rounded-xs" />
                  <div className="h-2 w-24 bg-[#26251e]/20 rounded-xs" />
                  <div className="space-y-1">
                    <div className="h-1 w-full bg-[#26251e]/10 rounded-xs" />
                    <div className="h-1 w-full bg-[#26251e]/10 rounded-xs" />
                    <div className="h-1 w-4/5 bg-[#26251e]/10 rounded-xs" />
                  </div>
                </div>
                <div className="absolute right-2 bottom-2 h-4 w-4 bg-[#059669] rounded-xs flex items-center justify-center text-[7px] font-bold text-white">PDF</div>
              </div>
              <div className="text-xs px-1">
                <div className="font-semibold text-[#26251e] truncate">ASMobbin Health Ap...</div>
                <div className="text-[10px] text-[#7a7a76]">Document</div>
              </div>
            </div>

            {/* Add Template Card */}
            <div className="flex flex-col gap-2">
              <div className="aspect-[4/3] border border-dashed border-[#e5e5e0] hover:border-[#7a7a76] rounded-lg bg-[#f4f4f3]/20 flex flex-col items-center justify-center cursor-pointer transition-all">
                <Upload className="h-4 w-4 text-[#7a7a76] mb-1 stroke-[2]" />
                <span className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider">Add template</span>
              </div>
            </div>

          </div>
        </div>

        {/* Folders Section */}
        <div className="space-y-4">
          <div className="border-b border-[#e5e5e0] pb-2 flex justify-between items-end">
            
            {/* Filter pills */}
            <div className="flex gap-2">
              {(['All', 'Shared', 'Private'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                    activeTab === tab
                      ? "bg-[#26251e] text-white"
                      : "text-[#555552] hover:bg-[#e5e5e2]/60"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Right Tools */}
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-[#7a7a76] hover:text-[#26251e]">
                <ArrowUpDown className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-[#7a7a76] hover:text-[#26251e]">
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-[#7a7a76] hover:text-[#26251e]">
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button 
                onClick={() => setShowNewFolderModal(true)}
                size="sm" 
                className="h-7 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white flex items-center gap-1 rounded px-2.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create folder</span>
              </Button>
            </div>

          </div>

          {/* Folders Table */}
          {activeTab !== 'Shared' && (
            <div className="border border-[#e5e5e0] rounded-lg overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f4f4f3]/60 border-b border-[#e5e5e0] text-[#7a7a76] font-semibold">
                    <th className="py-2.5 px-4 w-6">
                      <input type="checkbox" className="rounded border-[#e5e5e0]" />
                    </th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Visibility</th>
                    <th className="py-2.5 px-3">Files</th>
                    <th className="py-2.5 px-3 text-right pr-6">Last updated at</th>
                  </tr>
                </thead>
                <tbody>
                  {folders.map((folder, index) => (
                    <tr key={folder} className="hover:bg-[#f4f4f3]/25 transition-colors">
                      <td className="py-3.5 px-4">
                        <input type="checkbox" className="rounded border-[#e5e5e0]" />
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-[#26251e] flex items-center gap-2">
                        <FolderIcon className="h-4 w-4 text-[#10b981] fill-[#10b981]/20" />
                        <span>{folder}</span>
                      </td>
                      <td className="py-3.5 px-3 text-[#7a7a76]">
                        <span className="inline-flex items-center gap-1 bg-[#f4f4f3] px-2 py-0.5 rounded text-[10px] font-semibold text-[#555552]">
                          <Lock className="h-2.5 w-2.5" />
                          Private
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-[#7a7a76]">0 files</td>
                      <td className="py-3.5 px-3 text-right text-[#7a7a76] pr-6">
                        {index === 0 ? '23 seconds ago' : 'Just now'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent files Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">Recent files</h2>
            
            <div className="flex items-center gap-3">
              {/* Search input */}
              <div className="relative w-44">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-[#7a7a76]" />
                <Input 
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7.5 pl-7 text-xs bg-white border-[#e5e5e0] focus-visible:ring-1 focus-visible:ring-[#059669]"
                />
              </div>

              {/* View/Sort tools */}
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7.5 text-xs font-semibold px-2 border-[#e5e5e0] flex items-center gap-1">
                  <SlidersHorizontal className="h-3 w-3 text-[#7a7a76]" />
                  <span>Filter</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-7.5 w-7.5 text-[#7a7a76] hover:text-[#26251e]">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7.5 w-7.5 text-[#7a7a76] hover:text-[#26251e]">
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7.5 w-7.5 text-[#7a7a76] hover:text-[#26251e]">
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Files Grid with Rich Previews */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            
            {/* File 1: Spreadsheet report */}
            <div className="border border-[#e5e5e0] hover:border-[#7a7a76] rounded-lg overflow-hidden bg-white shadow-xs flex flex-col group cursor-pointer transition-all">
              <div className="aspect-[4/3] bg-[#f4f4f3]/40 border-b border-[#e5e5e0] p-3 flex flex-col justify-between overflow-hidden">
                {/* Visual miniature mockup of a table */}
                <div className="space-y-1 bg-white border border-[#e5e5e0] rounded-xs p-1.5 text-[6px] text-[#7a7a76] font-mono select-none overflow-hidden">
                  <div className="grid grid-cols-3 border-b border-[#e5e5e0] pb-0.5 text-[5px] font-bold text-[#26251e]">
                    <span>Criterion</span>
                    <span>Rating</span>
                    <span>Comments</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-[#e5e5e0]/50 py-0.5">
                    <span className="truncate">Performance</span>
                    <span className="text-emerald-600">★★★★★</span>
                    <span className="truncate">Excellent load speed</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-[#e5e5e0]/50 py-0.5">
                    <span className="truncate">SEO Mobile</span>
                    <span className="text-amber-500">★★★☆☆</span>
                    <span className="truncate">Needs improvement</span>
                  </div>
                  <div className="grid grid-cols-3 py-0.5">
                    <span className="truncate">Security</span>
                    <span className="text-emerald-600">★★★★☆</span>
                    <span className="truncate">SSL check success</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[#555552] font-semibold">
                  <FileSpreadsheet className="h-4 w-4 text-[#107c41] shrink-0" />
                  <span className="truncate">as_mobbin_onboarding_report.xlsx</span>
                </div>
              </div>
              <div className="p-3 space-y-1">
                <div className="text-[10px] text-[#7a7a76]">33 minutes ago</div>
                <div className="text-xs font-semibold text-[#059669] hover:underline flex items-center gap-1 truncate">
                  <span>Onboarding rating report</span>
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                </div>
              </div>
            </div>

            {/* File 2: Radar Chart Image */}
            <div className="border border-[#e5e5e0] hover:border-[#7a7a76] rounded-lg overflow-hidden bg-white shadow-xs flex flex-col group cursor-pointer transition-all">
              <div className="aspect-[4/3] bg-[#f4f4f3]/40 border-b border-[#e5e5e0] p-3 flex flex-col justify-between overflow-hidden">
                {/* SVG Radar Chart Preview Mockup */}
                <div className="flex-1 flex items-center justify-center p-2">
                  <svg className="w-20 h-20 overflow-visible text-[#7a7a76]" viewBox="0 0 100 100">
                    {/* Nested Pentagons */}
                    <polygon points="50,10 90,40 75,85 25,85 10,40" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.3" />
                    <polygon points="50,25 80,47 69,80 31,80 20,47" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.3" />
                    <polygon points="50,40 70,55 62,75 38,75 30,55" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.3" />
                    {/* Spider Axis */}
                    <line x1="50" y1="50" x2="50" y2="10" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" opacity="0.4" />
                    <line x1="50" y1="50" x2="90" y2="40" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" opacity="0.4" />
                    <line x1="50" y1="50" x2="75" y2="85" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" opacity="0.4" />
                    <line x1="50" y1="50" x2="25" y2="85" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" opacity="0.4" />
                    <line x1="50" y1="50" x2="10" y2="40" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" opacity="0.4" />
                    {/* Colored Radar Data Area */}
                    <polygon points="50,20 85,42 65,75 35,80 18,45" fill="#f54e00" fillOpacity="0.15" stroke="#f54e00" strokeWidth="1.2" />
                  </svg>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[#555552] font-semibold">
                  <ImageIcon className="h-4 w-4 text-[#10b981] shrink-0" />
                  <span className="truncate">radar_chart.png</span>
                </div>
              </div>
              <div className="p-3 space-y-1">
                <div className="text-[10px] text-[#7a7a76]">54 minutes ago</div>
                <div className="text-xs font-semibold text-[#059669] hover:underline flex items-center gap-1 truncate">
                  <span>UX case study charts</span>
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                </div>
              </div>
            </div>

            {/* File 3: Funnel Chart Image */}
            <div className="border border-[#e5e5e0] hover:border-[#7a7a76] rounded-lg overflow-hidden bg-white shadow-xs flex flex-col group cursor-pointer transition-all">
              <div className="aspect-[4/3] bg-[#f4f4f3]/40 border-b border-[#e5e5e0] p-3 flex flex-col justify-between overflow-hidden">
                {/* Funnel chart preview in CSS/SVG */}
                <div className="flex-1 flex flex-col justify-center items-center gap-1.5 px-4">
                  <div className="bg-[#059669]/90 h-3 w-full rounded-sm text-[5px] text-white flex items-center justify-center font-semibold">100% Leads Scraped</div>
                  <div className="bg-[#059669]/70 h-3 w-4/5 rounded-sm text-[5px] text-white flex items-center justify-center font-semibold">80% With Email</div>
                  <div className="bg-[#059669]/50 h-3 w-3/5 rounded-sm text-[5px] text-white flex items-center justify-center font-semibold">60% Contacted</div>
                  <div className="bg-[#059669]/30 h-3 w-2/5 rounded-sm text-[5px] text-white flex items-center justify-center font-semibold">20% Won</div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[#555552] font-semibold">
                  <ImageIcon className="h-4 w-4 text-[#10b981] shrink-0" />
                  <span className="truncate">funnel_chart.png</span>
                </div>
              </div>
              <div className="p-3 space-y-1">
                <div className="text-[10px] text-[#7a7a76]">54 minutes ago</div>
                <div className="text-xs font-semibold text-[#059669] hover:underline flex items-center gap-1 truncate">
                  <span>UX case study charts</span>
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                </div>
              </div>
            </div>

            {/* File 4: CSV raw text preview */}
            <div className="border border-[#e5e5e0] hover:border-[#7a7a76] rounded-lg overflow-hidden bg-white shadow-xs flex flex-col group cursor-pointer transition-all">
              <div className="aspect-[4/3] bg-[#f4f4f3]/40 border-b border-[#e5e5e0] p-3 flex flex-col justify-between overflow-hidden">
                {/* Visual miniature code text */}
                <div className="flex-1 bg-white border border-[#e5e5e0] rounded-xs p-1.5 font-mono text-[5px] text-[#7a7a76] select-none leading-relaxed overflow-hidden">
                  <div>Handle,Title,Body (HTML),Vendor,Product Category</div>
                  <div>tshirt-1,Example T-Shirt,&lt;p&gt;Best shirt,&quot;Acme&quot;,Apparel</div>
                  <div>pants-2,Example Pants,&lt;p&gt;Sleek denim,&quot;Acme&quot;,Apparel</div>
                  <div>hat-3,Example Hat,&lt;p&gt;Snapback caps,&quot;Acme&quot;,Accessory</div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[#555552] font-semibold">
                  <FileCode className="h-4 w-4 text-[#10b981] shrink-0" />
                  <span className="truncate">product_template.csv</span>
                </div>
              </div>
              <div className="p-3 space-y-1">
                <div className="text-[10px] text-[#7a7a76]">1 hour ago</div>
                <div className="text-xs font-semibold text-[#059669] hover:underline flex items-center gap-1 truncate">
                  <span>Design review doc</span>
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* New Folder Modal Overlay */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-[#e6e5e0] rounded-xl p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#26251e] text-left">Nouveau Dossier</h3>
              <p className="text-xs text-[#7a7a76] text-left">Créez un nouveau dossier dans votre bibliothèque.</p>
            </div>
            <input 
              type="text" 
              placeholder="Nom du dossier"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (newFolderName.trim()) {
                    addFolder(newFolderName.trim());
                    setNewFolderName('');
                    setShowNewFolderModal(false);
                  }
                }
              }}
            />
            <div className="flex justify-end gap-2 text-xs pt-1">
              <Button 
                variant="ghost"
                onClick={() => {
                  setNewFolderName('');
                  setShowNewFolderModal(false);
                }}
                className="h-8 text-[#555552]"
              >
                Annuler
              </Button>
              <Button 
                onClick={() => {
                  if (newFolderName.trim()) {
                    addFolder(newFolderName.trim());
                    setNewFolderName('');
                    setShowNewFolderModal(false);
                  }
                }}
                className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold"
              >
                Créer le dossier
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
