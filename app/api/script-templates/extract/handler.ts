import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_EXTRACTED_CHARS = 20000;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier requis (champ "file")' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name || '';
    const ext = name.split('.').pop()?.toLowerCase() || '';

    let text = '';

    if (ext === 'pdf' || file.type === 'application/pdf') {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        text = result.text || '';
      } finally {
        await parser.destroy();
      }
    } else if (
      ext === 'docx' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || '';
    } else if (ext === 'txt' || file.type.startsWith('text/')) {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { error: 'Format non supporté — utilise un PDF, un .docx ou un .txt.' },
        { status: 400 }
      );
    }

    text = text.trim().slice(0, MAX_EXTRACTED_CHARS);

    if (!text) {
      return NextResponse.json({ error: 'Aucun texte extrait de ce fichier.' }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error('[script-templates/extract]', err);
    return NextResponse.json({ error: 'Extraction du fichier impossible' }, { status: 500 });
  }
}
