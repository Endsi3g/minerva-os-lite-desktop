import LibraryEditorClient from './_components/library-editor-client';

export const metadata = {
  title: 'Document - Minerva Reach',
  description: "Éditeur de document de la bibliothèque Minerva.",
};

export function generateStaticParams() {
  return [{ id: '_placeholder_' }];
}

export default async function LibraryDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LibraryEditorClient id={id} />;
}
