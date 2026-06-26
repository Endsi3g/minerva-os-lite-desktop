'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  Monitor,
  Cpu,
  HardDrive,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileDown,
  Activity,
  Bell,
  Smartphone
} from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SystemDiagnostics {
  platform: string;
  arch: string;
  nodeVersion: string;
  chromeVersion: string;
  electronVersion: string;
  totalMemory: string;
  freeMemory: string;
  usedMemory: string;
  cpus: string;
  cpuCount: number;
  uptime: string;
  appVersion: string;
}

export default function DownloadPage() {
  const { t } = useLanguage();
  const [isElectron, setIsElectron] = useState(false);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloaded' | 'error'>('idle');
  const [updateErrorMsg, setUpdateErrorMsg] = useState('');
  const [newVersion, setNewVersion] = useState('');

  // 1. Detect environment & load diagnostics if in Electron
  useEffect(() => {
    const checkEnv = async () => {
      const electronObj = typeof window !== 'undefined' && (window as any).electron;
      if (electronObj) {
        setIsElectron(true);
        try {
          const stats = await electronObj.getDiagnostics();
          setDiagnostics(stats);
        } catch (err) {
          console.error("Failed to fetch native diagnostics:", err);
        }
      }
    };
    checkEnv();
  }, []);

  // 2. Listen to auto-updater status from the main process if in Electron
  useEffect(() => {
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj && electronObj.onUpdateStatus) {
      const unsubscribe = electronObj.onUpdateStatus((status: any, details?: string) => {
        setUpdateStatus(status);
        if (status === 'error' && details) {
          setUpdateErrorMsg(details);
        } else if (status === 'available' && details) {
          setNewVersion(details);
        } else if (status === 'downloaded' && details) {
          setNewVersion(details);
        }
      });
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  const handleCheckUpdates = () => {
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj && electronObj.triggerUpdateCheck) {
      setUpdateStatus('checking');
      setUpdateErrorMsg('');
      electronObj.triggerUpdateCheck();
    }
  };

  const getUpdateStatusContent = () => {
    switch (updateStatus) {
      case 'checking':
        return (
          <div className="flex items-center gap-2 text-amber-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-xs font-semibold">{t('download.status_checking')}</span>
          </div>
        );
      case 'available':
        return (
          <div className="flex items-center gap-2 text-blue-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs font-semibold">
              {t('download.status_available')} {newVersion ? `(${newVersion})` : ''}
            </span>
          </div>
        );
      case 'not-available':
        return (
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-semibold">{t('download.status_not_available')}</span>
          </div>
        );
      case 'downloaded':
        return (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-xs font-bold">{t('download.status_downloaded')}</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col gap-1 text-red-600">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-semibold">{t('download.status_error')}</span>
            </div>
            {updateErrorMsg && <p className="text-[10px] text-red-500 font-mono pl-6">{updateErrorMsg}</p>}
          </div>
        );
      default:
        return (
          <span className="text-xs text-muted-foreground font-medium">
            Version {diagnostics?.appVersion || '0.0.1'}
          </span>
        );
    }
  };

  // Render native Electron console
  if (isElectron) {
    return (
      <div className="h-full overflow-y-auto bg-white">
        <div className="w-full p-3 sm:p-4 md:p-8 space-y-8 text-[#26251e] font-sans selection:bg-[#10b981]/10 text-left">
          
          {/* Header */}
          <div className="space-y-1.5 border-b border-[#e5e5e0] pb-5">
            <h1 className="text-xl font-bold text-[#26251e] flex items-center gap-2">
              <Monitor className="h-5.5 w-5.5 text-[#059669]" />
              <span>{t('download.system_title')}</span>
            </h1>
            <p className="text-xs text-[#7a7a76]">
              {t('download.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Updates card */}
            <Card className="border border-border bg-card md:col-span-1 shadow-xs h-fit">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4 text-[#059669]" />
                  <span>{t('download.update_title')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="min-h-12 flex items-center">
                  {getUpdateStatusContent()}
                </div>
                
                <Button 
                  onClick={handleCheckUpdates}
                  disabled={updateStatus === 'checking'}
                  className="w-full h-8.5 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white rounded-md"
                >
                  {t('download.btn_check_updates')}
                </Button>
              </CardContent>
            </Card>

            {/* Hardware Diagnostics Card */}
            <Card className="border border-border bg-card md:col-span-2 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-[#059669]" />
                  <span>{t('download.diagnostics_title')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {diagnostics ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {t('download.diag_platform')}
                      </span>
                      <p className="text-xs font-semibold">{diagnostics.platform} ({diagnostics.arch})</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {t('download.diag_version')}
                      </span>
                      <p className="text-xs font-mono font-semibold">v{diagnostics.appVersion}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {t('download.diag_memory')}
                      </span>
                      <p className="text-xs font-semibold">
                        {diagnostics.usedMemory} / {diagnostics.totalMemory}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {t('download.diag_uptime')}
                      </span>
                      <p className="text-xs font-semibold">{diagnostics.uptime}</p>
                    </div>

                    <div className="space-y-1 sm:col-span-2 border-t border-[#e5e5e0]/60 pt-3 mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {t('download.diag_cpus')}
                      </span>
                      <p className="text-xs font-semibold leading-relaxed">
                        {diagnostics.cpus} ({diagnostics.cpuCount} Cores)
                      </p>
                    </div>

                    <div className="space-y-1 sm:col-span-2 border-t border-[#e5e5e0]/60 pt-3 text-[10px] text-muted-foreground space-y-1">
                      <p>Node.js : <span className="font-mono font-bold text-foreground">{diagnostics.nodeVersion}</span></p>
                      <p>Chromium : <span className="font-mono font-bold text-foreground">{diagnostics.chromeVersion}</span></p>
                      <p>Electron : <span className="font-mono font-bold text-foreground">{diagnostics.electronVersion}</span></p>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center text-xs text-muted-foreground">
                    Chargement des diagnostics matériels...
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    );
  }

  // Render Web view installer downloads page
  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="w-full p-3 sm:p-4 md:p-8 space-y-8 text-[#26251e] font-sans selection:bg-[#10b981]/10 text-left">
        
        {/* Header Section */}
        <div className="space-y-1.5 border-b border-[#e5e5e0] pb-5">
          <h1 className="text-xl font-bold text-[#26251e] flex items-center gap-2">
            <Download className="h-5.5 w-5.5 text-primary" />
            <span>{t('download.title')}</span>
          </h1>
          <p className="text-xs text-[#7a7a76]">
            {t('download.web_section_title')}
          </p>
        </div>

        {/* Dynamic Download Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* macOS Card */}
          <Card className="border border-[#e5e5e0] bg-white rounded-xl shadow-xs p-6 flex flex-col justify-between min-h-[220px] transition-all hover:border-[#7a7a76]">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#fdfdfc] border border-[#e5e5e0] flex items-center justify-center shadow-2xs">
                  <Monitor className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#26251e]">
                    {t('download.mac_title')}
                  </h3>
                  <span className="inline-flex items-center bg-primary/5 px-2 py-0.5 rounded text-[9px] font-bold text-primary border border-primary/10 mt-0.5">
                    Apple Silicon / Intel
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#7a7a76] leading-relaxed">
                {t('download.mac_desc')}
              </p>
            </div>
            
            <div className="pt-6">
              <Button 
                asChild
                className="w-full h-9 text-xs font-bold bg-[#26251e] text-white hover:bg-black rounded-lg gap-2 cursor-pointer"
              >
                <a href="https://github.com/Endsi3g/minerva-os-lite-desktop/releases/download/v0.0.1/Minerva.OS.Reach.Lite-0.0.1.dmg" download>
                  <FileDown className="h-4 w-4" />
                  <span>{t('download.btn_download')}</span>
                </a>
              </Button>
            </div>
          </Card>

          {/* Windows Card */}
          <Card className="border border-[#e5e5e0] bg-white rounded-xl shadow-xs p-6 flex flex-col justify-between min-h-[220px] transition-all hover:border-[#7a7a76]">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#fdfdfc] border border-[#e5e5e0] flex items-center justify-center shadow-2xs">
                  <Monitor className="h-5 w-5 text-[#3b82f6]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#26251e]">
                    {t('download.win_title')}
                  </h3>
                  <span className="inline-flex items-center bg-[#3b82f6]/5 px-2 py-0.5 rounded text-[9px] font-bold text-[#3b82f6] border border-[#3b82f6]/10 mt-0.5">
                    Windows x64
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#7a7a76] leading-relaxed">
                {t('download.win_desc')}
              </p>
            </div>
            
            <div className="pt-6">
              <Button 
                asChild
                className="w-full h-9 text-xs font-bold bg-[#26251e] text-white hover:bg-black rounded-lg gap-2 cursor-pointer"
              >
                <a href="https://github.com/Endsi3g/minerva-os-lite-desktop/releases/download/v0.0.1/Minerva.OS.Reach.Lite.Setup.0.0.1.exe" download>
                  <FileDown className="h-4 w-4" />
                  <span>{t('download.btn_download')}</span>
                </a>
              </Button>
            </div>
          </Card>

          {/* Android Card */}
          <Card className="border border-[#e5e5e0] bg-white rounded-xl shadow-xs p-6 flex flex-col justify-between min-h-[220px] transition-all hover:border-[#7a7a76]">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#fdfdfc] border border-[#e5e5e0] flex items-center justify-center shadow-2xs">
                  <Smartphone className="h-5 w-5 text-[#34a853]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#26251e]">
                    {t('download.android_title')}
                  </h3>
                  <span className="inline-flex items-center bg-[#34a853]/5 px-2 py-0.5 rounded text-[9px] font-bold text-[#34a853] border border-[#34a853]/10 mt-0.5">
                    Google Play
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#7a7a76] leading-relaxed">
                {t('download.android_desc')}
              </p>
            </div>

            <div className="pt-6">
              <Button
                disabled
                className="w-full h-9 text-xs font-bold bg-[#f0f0ed] text-[#a3a39c] rounded-lg gap-2 cursor-not-allowed hover:bg-[#f0f0ed]"
              >
                <FileDown className="h-4 w-4" />
                <span>{t('download.btn_coming_soon')}</span>
              </Button>
            </div>
          </Card>

          {/* iOS Card */}
          <Card className="border border-[#e5e5e0] bg-white rounded-xl shadow-xs p-6 flex flex-col justify-between min-h-[220px] transition-all hover:border-[#7a7a76]">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#fdfdfc] border border-[#e5e5e0] flex items-center justify-center shadow-2xs">
                  <Smartphone className="h-5 w-5 text-[#26251e]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#26251e]">
                    {t('download.ios_title')}
                  </h3>
                  <span className="inline-flex items-center bg-[#26251e]/5 px-2 py-0.5 rounded text-[9px] font-bold text-[#26251e] border border-[#26251e]/10 mt-0.5">
                    App Store
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#7a7a76] leading-relaxed">
                {t('download.ios_desc')}
              </p>
            </div>

            <div className="pt-6">
              <Button
                disabled
                className="w-full h-9 text-xs font-bold bg-[#f0f0ed] text-[#a3a39c] rounded-lg gap-2 cursor-not-allowed hover:bg-[#f0f0ed]"
              >
                <FileDown className="h-4 w-4" />
                <span>{t('download.btn_coming_soon')}</span>
              </Button>
            </div>
          </Card>

        </div>

        {/* Benefits Section */}
        <div className="space-y-4 pt-4 border-t border-[#e5e5e0]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76] flex items-center gap-1">
            <HelpCircle className="h-4 w-4" />
            <span>{t('download.why_native_title')}</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <HardDrive className="h-3 w-3 text-emerald-600" />
                </div>
                <h4 className="text-xs font-bold text-[#26251e]">
                  {t('download.feature_export_title')}
                </h4>
              </div>
              <p className="text-[11px] text-[#7a7a76] leading-relaxed">
                {t('download.feature_export_desc')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <Activity className="h-3 w-3 text-emerald-600" />
                </div>
                <h4 className="text-xs font-bold text-[#26251e]">
                  {t('download.feature_scraping_title')}
                </h4>
              </div>
              <p className="text-[11px] text-[#7a7a76] leading-relaxed">
                {t('download.feature_scraping_desc')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <Bell className="h-3 w-3 text-emerald-600" />
                </div>
                <h4 className="text-xs font-bold text-[#26251e]">
                  {t('download.feature_notifications_title')}
                </h4>
              </div>
              <p className="text-[11px] text-[#7a7a76] leading-relaxed">
                {t('download.feature_notifications_desc')}
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
