"use client";

import React, { useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getApiUrl } from "@/lib/api-helper";
import { CheckCircle2, XCircle, Loader2, UserPlus2, ArrowRight } from "lucide-react";

export default function InviteTokenPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Params and searchParams might be promises in Next 15/16, but useParams and useSearchParams unwrap them correctly
  const token = typeof params?.token === "string" ? params.token : "";
  const email = searchParams?.get("email") || "";

  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const supabase = createClient();

  const handleAcceptInvite = async () => {
    if (!email || !token) {
      setStatus("error");
      setErrorMessage("L'adresse e-mail ou le jeton d'invitation est manquant.");
      return;
    }

    setStatus("verifying");
    setErrorMessage("");

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "invite",
      });

      if (error) {
        throw error;
      }

      // Activate the pending team membership server-side
      try {
        await fetch(getApiUrl('/api/team/accept-invite'), { method: 'POST' });
      } catch (activateErr) {
        console.warn('accept-invite call failed (non-blocking):', activateErr);
      }

      setStatus("success");
      setTimeout(() => {
        router.push("/onboarding?invited=true");
      }, 1500);
    } catch (err: any) {
      console.error("Verification error:", err);
      setStatus("error");
      setErrorMessage(
        err?.message || "Une erreur est survenue lors de la validation de votre invitation."
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfdfc] text-[#26251e] p-6 selection:bg-[#10b981]/20">
      <div className="relative w-full max-w-md bg-white border border-[#e6e5e0] rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300">
        
        {/* Decorative Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-[#10b981]" />

        {/* Brand Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#10b981]/10 flex items-center justify-center text-[#10b981] mb-3">
            <UserPlus2 className="w-6 h-6 animate-pulse" />
          </div>
          <span className="font-bold text-lg tracking-tight font-sans">Minerva OS</span>
          <span className="text-xs text-[#807d72] tracking-wider uppercase mt-1">Reach Lite</span>
        </div>

        {status === "idle" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold font-sans text-[#26251e] mb-2">
                Rejoignez votre équipe
              </h1>
              <p className="text-sm text-[#807d72] leading-relaxed">
                Vous avez été invité à rejoindre un espace de travail collaboratif. Cliquez ci-dessous pour accepter l'invitation avec l'adresse :
                <br />
                <span className="font-semibold text-[#26251e] mt-1 inline-block break-all">{email}</span>
              </p>
            </div>

            <button
              onClick={handleAcceptInvite}
              className="w-full bg-[#10b981] hover:bg-[#059669] text-white py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm flex items-center justify-center gap-2 hover:gap-3 cursor-pointer group"
            >
              Accepter l'invitation
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        )}

        {status === "verifying" && (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4 animate-fade-in">
            <Loader2 className="w-10 h-10 text-[#10b981] animate-spin" />
            <div>
              <h2 className="font-semibold text-base text-[#26251e]">Validation en cours</h2>
              <p className="text-xs text-[#807d72] mt-1">Nous vérifions vos informations d'authentification...</p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-[#10b981]/10 flex items-center justify-center text-[#10b981] mb-2 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-[#26251e]">Invitation validée !</h2>
              <p className="text-xs text-[#807d72] mt-1">Connexion établie. Redirection vers l'intégration en cours...</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-1">
                <XCircle className="w-8 h-8" />
              </div>
              <h2 className="font-bold text-lg text-[#26251e]">Échec de validation</h2>
              <p className="text-sm text-red-600 bg-red-50/50 border border-red-100 rounded-lg p-3 w-full text-left leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleAcceptInvite}
                className="w-full bg-[#26251e] hover:bg-[#1a1a19] text-white py-2.5 px-4 rounded-xl font-medium text-sm transition-colors cursor-pointer"
              >
                Réessayer
              </button>
              <button
                onClick={() => router.push("/login")}
                className="w-full bg-transparent hover:bg-neutral-50 border border-[#e6e5e0] text-[#807d72] py-2.5 px-4 rounded-xl font-medium text-sm transition-colors cursor-pointer"
              >
                Retour à la connexion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
