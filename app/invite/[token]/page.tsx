import React from "react";
import InviteTokenClient from "./invite-token-client";

export const metadata = {
  title: "Rejoindre l'équipe - Minerva OS",
  description: "Acceptez l'invitation pour rejoindre l'équipe sur Minerva OS Reach Lite.",
};

// Next.js output: 'export' requires generateStaticParams() to return at least one
// entry for dynamic routes. We emit a single placeholder route (_placeholder_)
// that will never be navigated to; all real navigation is client-side.
export function generateStaticParams() {
  return [{ token: "_placeholder_" }];
}

export default function InvitePage() {
  return <InviteTokenClient />;
}
