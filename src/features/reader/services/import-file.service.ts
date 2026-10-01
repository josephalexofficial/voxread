import { MAX_UPLOAD_BYTES } from '@/features/reader/constants/limits';
import { requestPdfExtraction } from '@/features/synthesis/services/synthesis-client.service';

export interface ImportedText {
  text: string;
  origin: 'text-file' | 'pdf';
  titleHint: string;
}

/**
 * Reads a text file locally, or asks the server to extract a PDF.
 * Text files never leave the browser. PDFs are parsed for text and are not stored on the server.
 *
 * @param file - File chosen or dropped by the reader.
 * @returns Text ready for a new reading.
 *
 * @throws {Error} When the file is too large, empty, or not a supported type.
 */
export async function importReadingFile(file: File): Promise<ImportedText> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('That file is larger than 8 MB. Paste a shorter excerpt instead.');
  }

  if (isPdf(file)) {
    const extracted = await requestPdfExtraction(file);

    if (!extracted.text.trim()) {
      throw new Error('This PDF has no selectable text. Scanned pages need to be copied out and pasted.');
    }

    return {
      text: extracted.text,
      origin: 'pdf',
      titleHint: stripExtension(file.name),
    };
  }

  if (!isTextFile(file)) {
    throw new Error('Upload a .txt, .md, or .pdf file.');
  }

  const text = await file.text();

  if (text.includes('\u0000')) {
    throw new Error('That file does not look like plain text.');
  }

  if (!text.trim()) {
    throw new Error('That file is empty.');
  }

  return {
    text,
    origin: 'text-file',
    titleHint: stripExtension(file.name),
  };
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function isTextFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type.startsWith('text/') ||
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.markdown')
  );
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim();
}
