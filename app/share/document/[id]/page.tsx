import React from "react";
import SharedDocumentClient from "./shared-document-client";

export const metadata = {
  title: 'Document partagé',
  description: "Consultation publique d'un document partagé.",
};

// Next.js output: 'export' requires generateStaticParams() to return at least one
// entry for dynamic routes. We emit a single placeholder route (_placeholder_)
// that will never be navigated to; all real navigation is client-side.
export function generateStaticParams() {
  return [{ id: "_placeholder_" }];
}

export default function SharedDocumentPage() {
  return <SharedDocumentClient />;
}
