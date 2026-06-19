'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import { toPng, toJpeg } from 'html-to-image';
import { 
  X, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Palette, 
  Maximize2, 
  RefreshCw, 
  Check, 
  Building2, 
  Users, 
  Target, 
  DollarSign, 
  TrendingUp, 
  Sparkle
} from 'lucide-react';

interface TodayAestheticCanvasProps {
  onClose: () => void;
}

type AspectRatio = '1:1' | '16:9' | '9:16';
type ThemeStyle = 'cream' | 'emerald' | 'charcoal';

export function TodayAestheticCanvas({ onClose }: TodayAestheticCanvasProps) {
  const { leads, user } = useReach();
  const canvasRef = useRef<HTMLDivElement>(null);

  const downloadImage = async (format: 'png' | 'jpeg') => {
    if (!canvasRef.current) return;
    try {
      const fn = format === 'png' ? toPng : toJpeg;
      const dataUrl = await fn(canvasRef.current, {
        quality: 0.95,
        pixelRatio: 2, // high quality
      });
      const link = document.createElement('a');
      link.download = `minerva-dashboard-${displayAgencyName.toLowerCase().replace(/\s+/g, '-') || 'stats'}.${format}`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error generating image:", err);
      alert("Erreur lors de la génération de l'image. Veuillez réessayer.");
    }
  };

  const handleShareNative = async () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = await toPng(canvasRef.current, { pixelRatio: 2 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'minerva-dashboard.png', { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Performance ${displayAgencyName}`,
          text: `Aperçu de mes statistiques générées sur Minerva Reach !`,
        });
      } else {
        alert("Votre navigateur ne prend pas en charge le partage de fichiers natif. Téléchargez l'image pour la publier manuellement.");
      }
    } catch (err) {
      console.error("Error during native share:", err);
      alert("Impossible de lancer le partage. Téléchargez l'image à la place.");
    }
  };

  const sharePlatform = (platform: 'linkedin' | 'facebook' | 'instagram') => {
    const appUrl = 'https://minerva-os-lite-desktop.vercel.app';
    if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(appUrl)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}`, '_blank');
    } else if (platform === 'instagram') {
      alert("Instagram ne supporte pas l'import d'image directe depuis les sites web. Veuillez télécharger l'image (format Carré ou Story conseillé) et la publier directement depuis l'application Instagram !");
    }
  };
  const [dataMode, setDataMode] = useState<'real' | 'mock'>('mock');
  const [ratio, setRatio] = useState<AspectRatio>('1:1');
  const [theme, setTheme] = useState<ThemeStyle>('cream');
  const [hideControls, setHideControls] = useState(false);
  const [showToast, setShowToast] = useState(true);

  // Real stats computation
  const realTotalLeads = leads.length;
  const realWonLeads = leads.filter(l => l.status === 'Won').length;
  const realConversionRate = realTotalLeads > 0 ? ((realWonLeads / realTotalLeads) * 100).toFixed(1) : '0';
  const realRevenue = leads
    .filter(l => l.status === 'Won')
    .reduce((acc, curr) => acc + (curr.dealAmount || 0), 0);

  // Mock states (pre-populated with high-end premium mock values)
  const [mockAgencyName, setMockAgencyName] = useState('Uprising Creative');
  const [mockLeads, setMockLeads] = useState('482');
  const [mockWonLeads, setMockWonLeads] = useState('146');
  const [mockConversionRate, setMockConversionRate] = useState('30.3');
  const [mockRevenue, setMockRevenue] = useState('$164,500');

  // Real database setting for agency/company name
  const [dbAgencyName, setDbAgencyName] = useState('');

  useEffect(() => {
    const fetchDbSettings = async () => {
      if (!user) return;
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('settings')
          .select('company_name')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.company_name) {
          setDbAgencyName(data.company_name);
        }
      } catch (err) {
        console.error("Failed to load company name in aesthetic mode:", err);
      }
    };
    fetchDbSettings();
  }, [user]);

  // Escape key handler to exit or toggle controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (hideControls) {
          setHideControls(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    // Auto hide toast after 4 seconds
    const timer = setTimeout(() => {
      setShowToast(false);
    }, 4000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [hideControls, onClose]);

  // Values to display depending on real vs mock
  const displayAgencyName = dataMode === 'real' 
    ? (dbAgencyName || 'Minerva Reach Studio') 
    : mockAgencyName;

  const displayLeads = dataMode === 'real' 
    ? String(realTotalLeads) 
    : mockLeads;

  const displayWonLeads = dataMode === 'real' 
    ? String(realWonLeads) 
    : mockWonLeads;

  const displayConversionRate = dataMode === 'real' 
    ? `${realConversionRate}%` 
    : `${mockConversionRate}%`;

  const displayRevenue = dataMode === 'real' 
    ? (realRevenue > 0 ? `$${realRevenue.toLocaleString('fr-CA')}` : '$0') 
    : mockRevenue;

  // Formatting current date (e.g. "JUN 19, 2026")
  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }).toUpperCase();

  // Define theme classes
  const themeClasses = {
    cream: {
      canvasBg: 'bg-[#fafaf8]',
      cardBg: 'bg-[#fafaf8]',
      textPrimary: 'text-[#1c1917]',
      textSecondary: 'text-[#78716c]',
      border: 'border-[#e7e5e4]',
      accentText: 'text-[#047857]',
      accentBg: 'bg-[#e6f4ea]',
      gridDot: 'opacity-25',
      gridStyle: {
        backgroundImage: 'radial-gradient(circle, #78716c 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }
    },
    emerald: {
      canvasBg: 'bg-[#f4fbf7]',
      cardBg: 'bg-[#ffffff]',
      textPrimary: 'text-[#022c22]',
      textSecondary: 'text-[#065f46]',
      border: 'border-[#a7f3d0]/30',
      accentText: 'text-[#10b981]',
      accentBg: 'bg-[#10b981]/10',
      gridDot: 'opacity-10',
      gridStyle: {
        backgroundImage: 'linear-gradient(to right, #10b981 1px, transparent 1px), linear-gradient(to bottom, #10b981 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }
    },
    charcoal: {
      canvasBg: 'bg-[#0f0f0e]',
      cardBg: 'bg-[#141413]',
      textPrimary: 'text-[#f5f5f4]',
      textSecondary: 'text-[#a8a29e]',
      border: 'border-[#292524]',
      accentText: 'text-[#10b981]',
      accentBg: 'bg-[#10b981]/15',
      gridDot: 'opacity-15',
      gridStyle: {
        backgroundImage: 'radial-gradient(circle, #a8a29e 1.2px, transparent 1.2px)',
        backgroundSize: '28px 28px',
      }
    }
  }[theme];

  return (
    <div className="fixed inset-0 z-[9999] flex bg-[#0c0c0b] text-[#fafaf9] overflow-hidden select-none font-sans">
      
      {/* 1. Left settings panel (can be hidden) */}
      <div className={`w-80 border-r border-[#1f1f1d] bg-[#121210] flex flex-col transition-all duration-300 shrink-0 ${hideControls ? '-ml-80' : 'ml-0'}`}>
        <div className="p-4 border-b border-[#1f1f1d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-[#10b981]" />
            <span className="font-bold text-xs tracking-wider uppercase">Paramètres Esthétiques</span>
          </div>
          <button 
            onClick={onClose}
            className="h-7 w-7 rounded-md hover:bg-[#1f1f1d] flex items-center justify-center text-stone-400 hover:text-white transition-colors cursor-pointer border-0 bg-transparent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-left">
          {/* Style selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-wider uppercase text-stone-400">Palette de Styles</label>
            <div className="grid grid-cols-3 gap-2">
              {(['cream', 'emerald', 'charcoal'] as ThemeStyle[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`py-2 px-1 text-[10px] font-bold rounded-lg border uppercase transition-all cursor-pointer ${
                    theme === t 
                      ? 'border-[#10b981] bg-[#10b981]/10 text-white' 
                      : 'border-[#1f1f1d] bg-[#171715] text-stone-400 hover:border-stone-700'
                  }`}
                >
                  {t === 'cream' ? 'Crème' : t === 'emerald' ? 'Émeraude' : 'Sombre'}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-wider uppercase text-stone-400">Format d'Affichage</label>
            <div className="grid grid-cols-3 gap-2">
              {(['1:1', '16:9', '9:16'] as AspectRatio[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRatio(r)}
                  className={`py-2 px-1 text-[10px] font-bold rounded-lg border uppercase transition-all cursor-pointer ${
                    ratio === r 
                      ? 'border-[#10b981] bg-[#10b981]/10 text-white' 
                      : 'border-[#1f1f1d] bg-[#171715] text-stone-400 hover:border-stone-700'
                  }`}
                >
                  {r === '1:1' ? 'Carré (1:1)' : r === '16:9' ? 'Paysage' : 'Story'}
                </button>
              ))}
            </div>
          </div>

          {/* Source Data Mode */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-wider uppercase text-stone-400">Données Source</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDataMode('real')}
                className={`py-2 text-[10px] font-bold rounded-lg border uppercase transition-all cursor-pointer ${
                  dataMode === 'real' 
                    ? 'border-[#10b981] bg-[#10b981]/10 text-white' 
                    : 'border-[#1f1f1d] bg-[#171715] text-stone-400 hover:border-stone-700'
                }`}
              >
                Réelles (DB)
              </button>
              <button
                onClick={() => setDataMode('mock')}
                className={`py-2 text-[10px] font-bold rounded-lg border uppercase transition-all cursor-pointer ${
                  dataMode === 'mock' 
                    ? 'border-[#10b981] bg-[#10b981]/10 text-white' 
                    : 'border-[#1f1f1d] bg-[#171715] text-stone-400 hover:border-stone-700'
                }`}
              >
                Mock / LARP
              </button>
            </div>
          </div>

          {/* Mock Parameters Form */}
          {dataMode === 'mock' && (
            <div className="space-y-3.5 pt-3 border-t border-[#1f1f1d]">
              <div className="space-y-1">
                <label className="text-[9px] font-bold tracking-wider uppercase text-stone-500">Nom de l'Agence</label>
                <input 
                  type="text" 
                  value={mockAgencyName}
                  onChange={(e) => setMockAgencyName(e.target.value)}
                  className="w-full text-xs bg-[#171715] border border-[#1f1f1d] rounded px-2.5 py-1.5 focus:border-[#10b981] focus:outline-hidden text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold tracking-wider uppercase text-stone-500">Total Leads</label>
                  <input 
                    type="text" 
                    value={mockLeads}
                    onChange={(e) => setMockLeads(e.target.value)}
                    className="w-full text-xs bg-[#171715] border border-[#1f1f1d] rounded px-2.5 py-1.5 focus:border-[#10b981] focus:outline-hidden text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold tracking-wider uppercase text-stone-500">Leads Won</label>
                  <input 
                    type="text" 
                    value={mockWonLeads}
                    onChange={(e) => setMockWonLeads(e.target.value)}
                    className="w-full text-xs bg-[#171715] border border-[#1f1f1d] rounded px-2.5 py-1.5 focus:border-[#10b981] focus:outline-hidden text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold tracking-wider uppercase text-stone-500">Taux de Conversion (%)</label>
                <input 
                  type="text" 
                  value={mockConversionRate}
                  onChange={(e) => setMockConversionRate(e.target.value)}
                  className="w-full text-xs bg-[#171715] border border-[#1f1f1d] rounded px-2.5 py-1.5 focus:border-[#10b981] focus:outline-hidden text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold tracking-wider uppercase text-stone-500">Chiffre d'Affaires / ARR</label>
                <input 
                  type="text" 
                  value={mockRevenue}
                  onChange={(e) => setMockRevenue(e.target.value)}
                  className="w-full text-xs bg-[#171715] border border-[#1f1f1d] rounded px-2.5 py-1.5 focus:border-[#10b981] focus:outline-hidden text-white"
                />
              </div>
            </div>
          )}

          {/* Download & Share Actions */}
          <div className="space-y-2.5 pt-3.5 border-t border-[#1f1f1d]">
            <label className="text-[10px] font-bold tracking-wider uppercase text-stone-400 block mb-1">Télécharger & Partager</label>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => downloadImage('png')}
                className="py-2 text-[10px] font-bold bg-[#171715] hover:bg-[#1f1f1d] border border-[#1f1f1d] hover:border-stone-700 text-white rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <span>Image PNG</span>
              </button>
              <button
                type="button"
                onClick={() => downloadImage('jpeg')}
                className="py-2 text-[10px] font-bold bg-[#171715] hover:bg-[#1f1f1d] border border-[#1f1f1d] hover:border-stone-700 text-white rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <span>Image JPEG</span>
              </button>
            </div>

            {/* Social Share Buttons */}
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={handleShareNative}
                className="w-full py-2 bg-[#10b981] hover:bg-[#059669] text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-0"
              >
                Partager l'image (Natif)
              </button>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => sharePlatform('linkedin')}
                  className="py-1.5 text-[9px] font-bold bg-[#171715] hover:bg-[#1f1f1d] border border-[#1f1f1d] text-stone-300 rounded hover:text-white cursor-pointer transition-colors"
                >
                  LinkedIn
                </button>
                <button
                  type="button"
                  onClick={() => sharePlatform('facebook')}
                  className="py-1.5 text-[9px] font-bold bg-[#171715] hover:bg-[#1f1f1d] border border-[#1f1f1d] text-stone-300 rounded hover:text-white cursor-pointer transition-colors"
                >
                  Facebook
                </button>
                <button
                  type="button"
                  onClick={() => sharePlatform('instagram')}
                  className="py-1.5 text-[9px] font-bold bg-[#171715] hover:bg-[#1f1f1d] border border-[#1f1f1d] text-stone-300 rounded hover:text-white cursor-pointer transition-colors"
                >
                  Instagram
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#1f1f1d] space-y-2">
          <button
            onClick={() => setHideControls(true)}
            className="w-full py-2 bg-stone-850 hover:bg-stone-800 text-stone-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-0"
          >
            <EyeOff className="h-4 w-4" />
            Masquer l'interface
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-0"
          >
            Quitter le mode
          </button>
        </div>
      </div>

      {/* 2. Main viewport representing the workspace to take screenshots */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-6 bg-[#090909] overflow-auto">
        
        {/* Floating show controls button (visible only when controls are hidden) */}
        {hideControls && (
          <button
            onClick={() => setHideControls(false)}
            title="Afficher les contrôles"
            className="absolute top-4 left-4 z-[10000] p-2 bg-[#171715]/80 hover:bg-[#1c1c1a] border border-[#2c2c28] rounded-xl hover:text-white text-stone-400 transition-colors shadow-lg cursor-pointer"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}

        {/* Temporary toast instructions */}
        {showToast && (
          <div className="absolute top-6 px-4 py-2 bg-[#121210] border border-[#1f1f1d] rounded-full shadow-lg text-[10px] tracking-wider uppercase font-bold text-stone-300 flex items-center gap-2 animate-bounce">
            <Sparkle className="h-3 w-3 text-[#10b981]" />
            <span>Prenez une capture d'écran (Cmd+Shift+4 / Win+Shift+S)</span>
          </div>
        )}

        {/* The design canvas representing the social card */}
        <div 
          ref={canvasRef}
          id="aesthetic-dashboard-card"
          style={themeClasses.gridStyle}
          className={`relative border flex flex-col justify-between p-7 sm:p-10 select-text transition-all duration-300 ${themeClasses.canvasBg} ${themeClasses.border} ${
            ratio === '1:1' 
              ? 'aspect-square w-full max-w-[560px] rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.15)]' 
              : ratio === '16:9' 
                ? 'aspect-[16/9] w-full max-w-[760px] rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.15)]' 
                : 'h-[640px] w-[360px] rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.15)]'
          }`}
        >
          {/* Hairline grid dot overlay */}
          <div className={`pointer-events-none absolute inset-0 z-0 ${themeClasses.gridDot}`} />

          {/* Crosshair decorators for industrial design aesthetic */}
          <div className={`absolute top-3 left-3 text-[10px] font-mono leading-none ${themeClasses.textSecondary}`}>+</div>
          <div className={`absolute top-3 right-3 text-[10px] font-mono leading-none ${themeClasses.textSecondary}`}>+</div>
          <div className={`absolute bottom-3 left-3 text-[10px] font-mono leading-none ${themeClasses.textSecondary}`}>+</div>
          <div className={`absolute bottom-3 right-3 text-[10px] font-mono leading-none ${themeClasses.textSecondary}`}>+</div>

          {/* Canvas Header */}
          <div className="relative z-10 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold tracking-[0.25em] uppercase font-mono ${themeClasses.textSecondary}`}>
                  {displayAgencyName}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              </div>
              <h2 className={`text-base font-extrabold tracking-tight uppercase font-sans ${themeClasses.textPrimary}`}>
                Minerva Reach Engine
              </h2>
            </div>
            <div className="text-right">
              <span className={`text-[9px] font-bold tracking-wider font-mono px-2 py-0.5 rounded ${themeClasses.accentText} ${themeClasses.accentBg}`}>
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Canvas Body (Stats Grid) */}
          <div className="relative z-10 my-auto py-4">
            <div className={`grid gap-4 ${
              ratio === '16:9' 
                ? 'grid-cols-4' 
                : ratio === '9:16'
                  ? 'grid-cols-1 gap-3.5'
                  : 'grid-cols-2'
            }`}>
              
              {/* Stat card 1: Total Leads */}
              <div className={`border p-4 rounded-xl flex flex-col justify-between ${themeClasses.cardBg} ${themeClasses.border}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold tracking-wider uppercase ${themeClasses.textSecondary}`}>Acquisition leads</span>
                  <Users className={`h-3.5 w-3.5 ${themeClasses.textSecondary}`} />
                </div>
                <div className="mt-2.5">
                  <span className={`text-3xl font-extrabold tracking-tight font-sans ${themeClasses.textPrimary}`}>{displayLeads}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span className={`text-[8.5px] font-bold tracking-wide uppercase ${themeClasses.accentText}`}>Active Sync</span>
                  </div>
                </div>
              </div>

              {/* Stat card 2: Won Leads */}
              <div className={`border p-4 rounded-xl flex flex-col justify-between ${themeClasses.cardBg} ${themeClasses.border}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold tracking-wider uppercase ${themeClasses.textSecondary}`}>Deals gagnés</span>
                  <Target className={`h-3.5 w-3.5 ${themeClasses.textSecondary}`} />
                </div>
                <div className="mt-2.5">
                  <span className={`text-3xl font-extrabold tracking-tight font-sans ${themeClasses.textPrimary}`}>{displayWonLeads}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span className={`text-[8.5px] font-bold tracking-wide uppercase ${themeClasses.accentText}`}>Target hit</span>
                  </div>
                </div>
              </div>

              {/* Stat card 3: Conversion Rate */}
              <div className={`border p-4 rounded-xl flex flex-col justify-between ${themeClasses.cardBg} ${themeClasses.border}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold tracking-wider uppercase ${themeClasses.textSecondary}`}>Taux conversion</span>
                  <TrendingUp className={`h-3.5 w-3.5 ${themeClasses.textSecondary}`} />
                </div>
                <div className="mt-2.5">
                  <span className={`text-3xl font-extrabold tracking-tight font-sans ${themeClasses.textPrimary}`}>{displayConversionRate}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span className={`text-[8.5px] font-bold tracking-wide uppercase ${themeClasses.accentText}`}>High engagement</span>
                  </div>
                </div>
              </div>

              {/* Stat card 4: Revenue */}
              <div className={`border p-4 rounded-xl flex flex-col justify-between ${themeClasses.cardBg} ${themeClasses.border}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold tracking-wider uppercase ${themeClasses.textSecondary}`}>Chiffre d'Affaires</span>
                  <DollarSign className={`h-3.5 w-3.5 ${themeClasses.textSecondary}`} />
                </div>
                <div className="mt-2.5">
                  <span className={`text-3xl font-extrabold tracking-tight font-sans ${themeClasses.textPrimary}`}>{displayRevenue}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span className={`text-[8.5px] font-bold tracking-wide uppercase ${themeClasses.accentText}`}>Total ARR</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Canvas Footer */}
          <div className="relative z-10 flex items-center justify-between border-t border-dashed pt-4 mt-2">
            <span className={`text-[8.5px] font-bold tracking-wider uppercase font-mono ${themeClasses.textSecondary}`}>
              MINERVA OS • OUTREACH METRIC ENGINE v2.0
            </span>
            <span className={`text-[8.5px] font-bold tracking-widest font-mono uppercase ${themeClasses.textSecondary}`}>
              [ST-RT-89240]
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}
