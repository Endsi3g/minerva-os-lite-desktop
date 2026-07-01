import dynamic from 'next/dynamic';

const LibraryEditorWrapper = dynamic(() => import('./_components/library-editor-wrapper'));

export function generateStaticParams() { return []; }

export default function Page() { return <LibraryEditorWrapper />; }
