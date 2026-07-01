'use client';
import { useParams } from 'next/navigation';
import LibraryEditorClient from './library-editor-client';

export default function LibraryEditorWrapper() {
  const { id } = useParams<{ id: string }>();
  return <LibraryEditorClient id={id} />;
}
