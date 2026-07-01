import dynamic from 'next/dynamic';

const LibraryEditorClient = dynamic(() => import('./_components/library-editor-client'));

export function generateStaticParams() { return []; }

export default function Page() { return <LibraryEditorClient />; }
