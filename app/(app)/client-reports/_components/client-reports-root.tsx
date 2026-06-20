"use client";

import React, { useState, useEffect } from "react";
import { useReach } from "@/lib/reach-context";
import { createClient } from "@/lib/supabase/client";
import {
  Trophy,
  Users,
  Percent,
  TrendingUp,
  Award,
  ChevronRight,
  Shield,
  Briefcase,
  X,
  Target,
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  BarChart2,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardItem {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  revenue: number;
  efficiency: number; // Conversion rate %
  skills: { name: string; level: number }[];
  projects: string[];
}

export function ClientReportsRoot() {
  const { user: currentUser, leads, workspacesList } = useReach();
  const [activeTab, setActiveTab] = useState<"members" | "everyone">("members");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    fullName: string;
    companyName: string;
    avatarBase64?: string | null;
  } | null>(null);
  const [selectedUser, setSelectedUser] = useState<LeaderboardItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const supabase = createClient();

  // Fetch team members & current user profile
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current user settings
        if (currentUser?.id) {
          const { data: settings } = await supabase
            .from("settings")
            .select("full_name, company_name, avatar_base64")
            .eq("user_id", currentUser.id)
            .maybeSingle();

          if (settings) {
            setCurrentUserProfile({
              fullName: settings.full_name || currentUser.email?.split("@")[0] || "Moi",
              companyName: settings.company_name || "",
              avatarBase64: settings.avatar_base64,
            });
          }
        }

        // Fetch workspace team members
        const res = await fetch("/api/team/members");
        if (res.ok) {
          const data = await res.json();
          setTeamMembers(data.members || []);
        }
      } catch (err) {
        console.error("Error fetching leaderboard data:", err);
      }
    };
    fetchData();
  }, [currentUser]);

  // Division calculator based on won leads
  const getDivision = (won: number) => {
    if (won >= 31) return { name: "Platine", style: "from-blue-400 to-indigo-600 text-white border-blue-300 shadow-[0_0_12px_rgba(99,102,241,0.2)]", badge: "Platine ✨" };
    if (won >= 16) return { name: "Or", style: "from-amber-300 to-yellow-500 text-white border-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.2)]", badge: "Or 🏆" };
    if (won >= 6) return { name: "Argent", style: "from-slate-300 to-slate-400 text-white border-slate-200", badge: "Argent 🥈" };
    return { name: "Bronze", style: "from-orange-400 to-amber-600 text-white border-orange-300", badge: "Bronze 🥉" };
  };

  // Calculate statistics for a user
  const getStatsForUser = (userId: string | null, isCurrentUser: boolean) => {
    const userLeads = leads.filter((lead) => {
      if (isCurrentUser) {
        return lead.owner === "Moi" || !lead.assignedTo || lead.assignedTo === currentUser?.id;
      }
      return lead.assignedTo === userId;
    });

    const total = userLeads.length;
    const won = userLeads.filter((l) => l.status === "Won").length;
    const lost = userLeads.filter((l) => l.status === "Lost").length;
    const revenue = userLeads
      .filter((l) => l.status === "Won")
      .reduce((sum, l) => sum + (l.dealAmount || 1500), 0);
    const efficiency = total > 0 ? Math.round((won / total) * 100) : 0;

    return { total, won, lost, revenue, efficiency };
  };

  // Construct real members list
  const realLeaderboard: LeaderboardItem[] = [];

  // Add Current User
  if (currentUser) {
    const stats = getStatsForUser(currentUser.id, true);
    realLeaderboard.push({
      id: currentUser.id,
      name: currentUserProfile?.fullName || currentUser.email?.split("@")[0] || "Moi",
      email: currentUser.email || "",
      role: "Propriétaire",
      avatarUrl: currentUserProfile?.avatarBase64 || undefined,
      totalLeads: stats.total,
      wonLeads: stats.won,
      lostLeads: stats.lost,
      revenue: stats.revenue,
      efficiency: stats.efficiency,
      skills: [
        { name: "Closing", level: 85 },
        { name: "Prospection locale", level: 90 },
        { name: "Audit SEO", level: 75 },
      ],
      projects: ["Campagne Resto Montréal", "Local Scraping Québec"],
    });
  }

  // Add other team members
  teamMembers.forEach((member) => {
    // Avoid duplicating current user if they are listed in members
    if (member.member_user_id === currentUser?.id) return;

    const stats = getStatsForUser(member.member_user_id, false);
    realLeaderboard.push({
      id: member.id,
      name: member.profile?.full_name || member.email.split("@")[0],
      email: member.email,
      role: member.role === "admin" ? "Administrateur" : member.role === "editor" ? "Éditeur" : "Lecteur",
      avatarUrl: undefined,
      totalLeads: stats.total,
      wonLeads: stats.won,
      lostLeads: stats.lost,
      revenue: stats.revenue,
      efficiency: stats.efficiency,
      skills: [
        { name: "Génération de leads", level: 80 },
        { name: "Cold Email", level: 75 },
        { name: "Copywriting", level: 70 },
      ],
      projects: ["Outreach Boulangeries", "Audit Cliniques Dentaires"],
    });
  });

  const sortedLeaderboard = [...realLeaderboard].sort((a, b) => b.wonLeads - a.wonLeads);

  const filteredLeaderboard = sortedLeaderboard.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf9] text-[#26251e] selection:bg-[#10b981]/10">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        
        {/* Header Dashboard section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#e5e5e0] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[#10b981]" />
              <h1 className="text-xl font-bold font-sans tracking-tight">Classement de performance</h1>
            </div>
            <p className="text-xs text-[#807d72] mt-1">
              Gamification d'équipe : suivez vos performances de prospection et comparez-vous aux meilleurs.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex gap-4">
            <div className="bg-white border border-[#e5e5e0] rounded-xl px-4 py-2 flex items-center gap-3">
              <Flame className="w-5 h-5 text-amber-500" />
              <div>
                <span className="text-[10px] uppercase font-bold text-[#807d72] block">Total Gagné</span>
                <span className="font-bold text-sm">
                  {realLeaderboard.reduce((sum, item) => sum + item.wonLeads, 0)} leads
                </span>
              </div>
            </div>
            <div className="bg-white border border-[#e5e5e0] rounded-xl px-4 py-2 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-[#10b981]" />
              <div>
                <span className="text-[10px] uppercase font-bold text-[#807d72] block">Revenu Estimé</span>
                <span className="font-bold text-sm text-[#10b981]">
                  {realLeaderboard.reduce((sum, item) => sum + item.revenue, 0).toLocaleString("fr-CA")} $
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tabs Selector */}
          <div className="flex bg-[#e5e5e0]/60 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("members")}
              className={cn(
                "px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "members"
                  ? "bg-white text-[#26251e] shadow-xs"
                  : "text-[#807d72] hover:text-[#26251e]"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              Membres d'équipe
            </button>
            <button
              onClick={() => setActiveTab("everyone")}
              className={cn(
                "px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "everyone"
                  ? "bg-white text-[#26251e] shadow-xs"
                  : "text-[#807d72] hover:text-[#26251e]"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Réseau Global
            </button>
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#807d72]" />
            <input
              type="text"
              placeholder="Rechercher un membre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-xs bg-white border border-[#e5e5e0] rounded-xl focus:outline-none focus:border-[#10b981] transition-colors"
            />
          </div>
        </div>

        {/* Leaderboard Table Container */}
        {activeTab === "everyone" ? (
          <div className="bg-white border border-[#e5e5e0] rounded-2xl p-12 text-center shadow-xs space-y-3">
            <BarChart2 className="w-10 h-10 text-[#807d72]/30 mx-auto" />
            <p className="text-sm font-semibold text-[#26251e]">Classement réseau bientôt disponible</p>
            <p className="text-xs text-[#807d72] max-w-sm mx-auto">
              Les performances des utilisateurs Minerva à travers le réseau seront visibles ici.
              En attendant, suivez votre équipe dans l&apos;onglet <strong>Membres d&apos;équipe</strong>.
            </p>
          </div>
        ) : (
        <div className="bg-white border border-[#e5e5e0] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e5e5e0] bg-[#fafaf9] text-[#807d72] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-4 px-6 text-center w-16">Pos</th>
                  <th className="py-4 px-4">Utilisateur</th>
                  <th className="py-4 px-4">Division</th>
                  <th className="py-4 px-4 text-center">Taux Eff.</th>
                  <th className="py-4 px-4 text-center">Gagnés</th>
                  <th className="py-4 px-4 text-center">Perdus</th>
                  <th className="py-4 px-4 text-right">CA Généré</th>
                  <th className="py-4 px-6 text-right w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e0] text-xs font-medium">
                {filteredLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#807d72]">
                      <BarChart2 className="w-8 h-8 text-[#807d72]/40 mx-auto mb-2" />
                      Aucun membre trouvé dans cette catégorie.
                    </td>
                  </tr>
                ) : (
                  filteredLeaderboard.map((item, idx) => {
                    const division = getDivision(item.wonLeads);
                    const rank = idx + 1;
                    const isCurrentUserRow = item.id === currentUser?.id;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedUser(item)}
                        className={cn(
                          "hover:bg-[#fafaf9] transition-colors cursor-pointer group",
                          isCurrentUserRow && "bg-[#10b981]/5 hover:bg-[#10b981]/10"
                        )}
                      >
                        {/* Rank Position column */}
                        <td className="py-4 px-6 text-center font-bold text-sm">
                          {rank === 1 ? (
                            <span className="inline-flex w-7 h-7 rounded-full bg-yellow-100 border border-yellow-300 text-yellow-800 items-center justify-center text-xs animate-pulse">🥇</span>
                          ) : rank === 2 ? (
                            <span className="inline-flex w-7 h-7 rounded-full bg-slate-100 border border-slate-300 text-slate-800 items-center justify-center text-xs">🥈</span>
                          ) : rank === 3 ? (
                            <span className="inline-flex w-7 h-7 rounded-full bg-orange-100 border border-orange-300 text-orange-800 items-center justify-center text-xs">🥉</span>
                          ) : (
                            <span className="text-[#807d72]">{rank}</span>
                          )}
                        </td>

                        {/* Name & Avatar Column */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {item.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.avatarUrl}
                                alt={item.name}
                                className="w-8 h-8 rounded-full border border-[#e5e5e0] object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-neutral-100 border border-[#e5e5e0] flex items-center justify-center text-neutral-600 font-bold uppercase text-[10px]">
                                {item.name.substring(0, 2)}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-[#26251e] flex items-center gap-1.5">
                                {item.name}
                                {isCurrentUserRow && (
                                  <span className="text-[9px] bg-[#10b981]/15 text-[#059669] px-1.5 py-0.5 rounded-full font-bold">
                                    Vous
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-[#807d72]">{item.role}</p>
                            </div>
                          </div>
                        </td>

                        {/* Division Badge column */}
                        <td className="py-4 px-4">
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-bold border bg-gradient-to-r select-none",
                              division.style
                            )}
                          >
                            {division.badge}
                          </span>
                        </td>

                        {/* Efficiency conversion rate */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-bold text-[#26251e]">{item.efficiency}%</span>
                            <Percent className="w-3 h-3 text-[#807d72]" />
                          </div>
                        </td>

                        {/* Won leads */}
                        <td className="py-4 px-4 text-center text-[#059669] font-bold">
                          {item.wonLeads}
                        </td>

                        {/* Lost leads */}
                        <td className="py-4 px-4 text-center text-red-500 font-medium">
                          {item.lostLeads}
                        </td>

                        {/* Revenue column */}
                        <td className="py-4 px-4 text-right font-bold text-[#26251e]">
                          {item.revenue.toLocaleString("fr-CA")} $
                        </td>

                        {/* Action column link indicator */}
                        <td className="py-4 px-6 text-right">
                          <ChevronRight className="w-4 h-4 text-[#807d72] group-hover:text-[#10b981] group-hover:translate-x-0.5 transition-all" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* User Detail modal */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white border border-[#e5e5e0] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
              
              {/* Header profile gradient card */}
              <div className="bg-[#fafaf9] border-b border-[#e5e5e0] p-6 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {selectedUser.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedUser.avatarUrl}
                      alt={selectedUser.name}
                      className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-neutral-100 border border-[#e5e5e0] flex items-center justify-center text-neutral-600 font-bold uppercase text-sm">
                      {selectedUser.name.substring(0, 2)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-base text-[#26251e]">
                      {selectedUser.name}
                    </h3>
                    <p className="text-xs text-[#807d72]">{selectedUser.role}</p>
                    <p className="text-[10px] text-[#807d72] mt-0.5">{selectedUser.email}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1 rounded-lg hover:bg-[#e5e5e0]/60 text-[#807d72] hover:text-[#26251e] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Statistics & Division progress content */}
              <div className="p-6 space-y-6">
                
                {/* Division and Trophy badges */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#807d72] flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-[#10b981]" />
                    Trophée de Division Minerva
                  </h4>
                  <div className="bg-[#fafaf9] border border-[#e5e5e0] rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#26251e]">
                        Division Actuelle : {getDivision(selectedUser.wonLeads).name}
                      </p>
                      <p className="text-[10px] text-[#807d72] mt-0.5">
                        {selectedUser.wonLeads} deals gagnés enregistrés.
                      </p>
                    </div>
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold border bg-gradient-to-r select-none",
                        getDivision(selectedUser.wonLeads).style
                      )}
                    >
                      {getDivision(selectedUser.wonLeads).badge}
                    </span>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-center">
                    <span className="text-[9px] uppercase font-bold text-[#807d72] block">Total Leads</span>
                    <span className="font-bold text-sm text-[#26251e]">{selectedUser.totalLeads}</span>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-center">
                    <span className="text-[9px] uppercase font-bold text-[#807d72] block">Gagnés</span>
                    <span className="font-bold text-sm text-[#059669]">{selectedUser.wonLeads}</span>
                  </div>
                  <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-center">
                    <span className="text-[9px] uppercase font-bold text-[#807d72] block">Taux Convers.</span>
                    <span className="font-bold text-sm text-[#26251e]">{selectedUser.efficiency}%</span>
                  </div>
                </div>

                {/* Skills indicators */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#807d72] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#10b981]" />
                    Compétences & Forces Clés
                  </h4>
                  <div className="space-y-2.5">
                    {selectedUser.skills.map((skill) => (
                      <div key={skill.name} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-semibold text-[#26251e]">{skill.name}</span>
                          <span className="text-[#807d72]">{skill.level}%</span>
                        </div>
                        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#10b981] rounded-full transition-all duration-500"
                            style={{ width: `${skill.level}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active campaigns & projects */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#807d72] flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#10b981]" />
                    Projets Actifs Assignés
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedUser.projects.map((proj) => (
                      <span
                        key={proj}
                        className="bg-neutral-100 border border-neutral-200 text-[#26251e] px-2 py-0.5 rounded-md text-[10px]"
                      >
                        {proj}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
