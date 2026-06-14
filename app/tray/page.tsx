'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Loader2, 
  CheckSquare, 
  Square, 
  ExternalLink, 
  Sparkles, 
  Clock, 
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface TrayTask {
  id: string;
  title: string;
  completed: number;
  category: string;
}

export default function TrayPage() {
  const [scrapingStatus, setScrapingStatus] = useState({ status: 'idle', niche: '', city: '' });
  const [lastScrapeTime, setLastScrapeTime] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TrayTask[]>([]);
  const [isScrapingLocal, setIsScrapingLocal] = useState(false);
  const [scrapingSuccessMsg, setScrapingSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isElectron = typeof window !== 'undefined' && (window as any).electron;

  // 1. Initial loads and event subscriptions
  useEffect(() => {
    if (!isElectron) return;
    const electron = (window as any).electron;

    // Load initial tasks and last scrape time
    loadSettingsAndTasks();

    // Subscribe to background scraper status changes
    if (electron.onScrapingStatusChanged) {
      const unsubscribe = electron.onScrapingStatusChanged((statusData: any) => {
        setScrapingStatus(statusData);
        if (statusData.status === 'idle') {
          setIsScrapingLocal(false);
          // Reload settings to get the updated last_scrape_at time
          loadSettingsAndTasks();
        } else if (statusData.status === 'running') {
          setIsScrapingLocal(true);
          setScrapingSuccessMsg(null);
        }
      });
      return unsubscribe;
    }
  }, [isElectron]);

  const loadSettingsAndTasks = async () => {
    if (!isElectron) return;
    const electron = (window as any).electron;

    try {
      // Get settings (last_scrape_at)
      const setting = await electron.dbGet("SELECT last_scrape_at FROM settings ORDER BY updated_at DESC LIMIT 1");
      if (setting && setting.last_scrape_at) {
        const dateObj = new Date(setting.last_scrape_at);
        setLastScrapeTime(dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + ' le ' + dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
      } else {
        setLastScrapeTime(null);
      }

      // Get 3 uncompleted tasks
      const rows = await electron.dbAll("SELECT id, title, completed, category FROM tasks WHERE completed = 0 ORDER BY created_at DESC LIMIT 3");
      setTasks(rows || []);
    } catch (err) {
      console.error("Failed to load local DB data in Tray popover:", err);
    }
  };

  // 2. Trigger background scraping
  const handleTriggerScraping = async () => {
    if (!isElectron || isScrapingLocal) return;
    const electron = (window as any).electron;
    setIsScrapingLocal(true);
    setScrapingSuccessMsg(null);
    setErrorMessage(null);

    try {
      const result = await electron.triggerBackgroundScrapeOnDemand();
      if (result && result.success) {
        if (result.addedCount > 0) {
          setScrapingSuccessMsg(`${result.addedCount} nouveaux prospects trouvés !`);
        } else {
          setScrapingSuccessMsg("Aucun nouveau prospect trouvé (déjà à jour).");
        }
      } else if (result && result.error) {
        setErrorMessage(result.error);
      } else {
        setErrorMessage("Le scraper n'a pas pu démarrer (aucun mot-clé/ville dans les paramètres).");
      }
    } catch (err) {
      console.error("Failed to trigger on-demand scraping:", err);
      setErrorMessage("Erreur technique de communication.");
    } finally {
      setIsScrapingLocal(false);
      loadSettingsAndTasks();
    }
  };

  // 3. Toggle task completion
  const handleToggleTask = async (taskId: string, currentCompleted: number) => {
    if (!isElectron) return;
    const electron = (window as any).electron;

    const nextCompleted = currentCompleted === 1 ? 0 : 1;
    const nowIso = new Date().toISOString();

    try {
      await electron.dbRun(
        "UPDATE tasks SET completed = ?, sync_status = 'pending_update', updated_at = ? WHERE id = ?",
        [nextCompleted, nowIso, taskId]
      );
      // Optimistic state update
      setTasks(prev => prev.filter(t => t.id !== taskId));
      
      // Trigger synchronization
      electron.triggerSync();
    } catch (err) {
      console.error("Failed to toggle task in Tray:", err);
    }
  };

  // 4. Open main app window
  const handleOpenMainApp = () => {
    if (isElectron) {
      (window as any).electron.openMainWindow();
    }
  };

  return (
    <div className="w-full h-screen bg-[#1c1c1e]/95 backdrop-blur-lg border border-white/10 rounded-xl flex flex-col font-sans text-white select-none overflow-hidden p-4">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#059669]/20 border border-[#059669]/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#10b981]" />
          </div>
          <span className="text-sm font-extrabold tracking-tight">Minerva OS Widget</span>
        </div>
        <button 
          onClick={handleOpenMainApp}
          className="text-[10px] font-bold text-white/50 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded border border-white/10 transition-all cursor-pointer"
        >
          <span>Ouvrir l'App</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pt-4">
        
        {/* Scraper Status Panel */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Prospection Autonome</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isScrapingLocal || scrapingStatus.status === 'running' ? 'bg-[#10b981] animate-pulse' : 'bg-white/30'}`} />
              <span className="text-[10px] font-bold">
                {isScrapingLocal || scrapingStatus.status === 'running' ? 'En cours' : 'En attente'}
              </span>
            </div>
          </div>

          {(isScrapingLocal || scrapingStatus.status === 'running') ? (
            <div className="space-y-1 bg-white/5 p-2 rounded border border-white/5">
              <p className="text-xs font-semibold flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-[#10b981] animate-spin" />
                <span>Recherche active de leads...</span>
              </p>
              {scrapingStatus.niche && (
                <p className="text-[10px] text-white/60 pl-5">
                  Niche : {scrapingStatus.niche} · Ville : {scrapingStatus.city}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-white/80">Le scraper automatique dort paisiblement.</p>
              {lastScrapeTime ? (
                <p className="text-[10px] text-white/50 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-white/40" />
                  <span>Dernière recherche : {lastScrapeTime}</span>
                </p>
              ) : (
                <p className="text-[10px] text-white/50 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-white/40" />
                  <span>Aucune recherche passée.</span>
                </p>
              )}
            </div>
          )}

          {/* Action Trigger Button */}
          <button
            onClick={handleTriggerScraping}
            disabled={isScrapingLocal || scrapingStatus.status === 'running'}
            className={`w-full h-8.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              isScrapingLocal || scrapingStatus.status === 'running'
                ? 'bg-white/5 text-white/30 border border-white/5'
                : 'bg-[#059669] text-white hover:bg-[#047857] border border-[#047857] shadow-sm'
            }`}
          >
            {isScrapingLocal || scrapingStatus.status === 'running' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Prospection en cours...</span>
              </>
            ) : (
              <>
                <Play className="w-3 w-3 fill-current" />
                <span>Lancer un audit maintenant</span>
              </>
            )}
          </button>

          {/* Status feedback alerts */}
          {scrapingSuccessMsg && (
            <div className="flex items-center gap-1.5 text-[10px] text-[#10b981] bg-[#10b981]/10 px-2 py-1 rounded border border-[#10b981]/20">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold">{scrapingSuccessMsg}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/20">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Urgent Tasks Checklist */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">Tâches à faire aujourd'hui</span>
          <div className="space-y-1.5">
            {tasks.length === 0 ? (
              <div className="py-6 text-center text-xs text-white/40 bg-white/5 border border-white/5 rounded-lg font-medium">
                Toutes vos tâches sont terminées ! 🎉
              </div>
            ) : (
              tasks.map((task) => (
                <div 
                  key={task.id}
                  onClick={() => handleToggleTask(task.id, task.completed)}
                  className="flex items-start gap-2.5 p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all"
                >
                  <button className="text-white/60 hover:text-white shrink-0 mt-0.5">
                    {task.completed === 1 ? (
                      <CheckSquare className="w-4 h-4 text-[#10b981]" />
                    ) : (
                      <Square className="w-4 h-4 text-white/40" />
                    )}
                  </button>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-xs font-bold truncate leading-normal text-white/95">
                      {task.title}
                    </span>
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider mt-0.5">
                      {task.category}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Footer shortcut hints */}
      <div className="mt-4 pt-2.5 border-t border-white/10 flex items-center justify-between text-[9px] text-white/40 font-semibold">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>Focalisé sur vos priorités locales</span>
        </span>
        <span>Minerva v{isElectron ? "2.2.3" : "WEB"}</span>
      </div>
    </div>
  );
}
