import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

function ensureUploadDir() {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  } catch (e) {
    console.error('Failed to create upload directory', e);
  }
}

/**
 * API endpoint để xử lý tải lên file hoặc metadata và lưu cục bộ vào `public/uploads`.
 * - POST multipart/form-data với trường `file` => trả về `{ url: '/uploads/filename.ext' }`
 * - POST application/json => lưu file JSON và trả về `{ url: '/uploads/metadata-<ts>.json' }`
 */
export async function POST(request: NextRequest) {
  try {
    ensureUploadDir();

    const contentType = request.headers.get('content-type') || '';

    // JSON metadata
    if (contentType.includes('application/json')) {
      const metadata = await request.json();
      const fileName = `metadata-${Date.now()}.json`;
      const filePath = path.join(UPLOAD_DIR, fileName);

      fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2), 'utf-8');

      const url = `/uploads/${fileName}`;
      return NextResponse.json({ url });
    }

    // multipart/form-data (file)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file found in request' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const filePath = path.join(UPLOAD_DIR, safeName);
      fs.writeFileSync(filePath, buffer);

      const url = `/uploads/${safeName}`;
      return NextResponse.json({ url });
    }

    return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
  } catch (err) {
    console.error('Error in local upload route:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
  },
};