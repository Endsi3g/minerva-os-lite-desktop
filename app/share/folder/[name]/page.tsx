import React from "react";
import SharedFolderClient from "./shared-folder-client";

export const metadata = {
  title: "Dossier Partagé - Minerva Reach",
  description: "Accès public aux documents partagés de l'espace de travail.",
};

// Next.js output: 'export' requires generateStaticParams() to return at least one
// entry for dynamic routes. We emit a single placeholder route (_placeholder_)
// that will never be navigated to; all real navigation is client-side.
export function generateStaticParams() {
  return [{ name: "_placeholder_" }];
}

export default function SharedFolderPage() {
  return <SharedFolderClient />;
}
