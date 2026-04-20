import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fileName = req.nextUrl.searchParams.get('fileName');
    const originalName = req.nextUrl.searchParams.get('originalName');

    if (!fileName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    console.log(`Downloading file: ${fileName}`);

    const filePath = path.join(UPLOAD_DIR, fileName);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      console.error(`File not found: ${filePath}`);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read file
    const fileBuffer = await fs.readFile(filePath);

    // Return file with download headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName || fileName)}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Download failed' },
      { status: 500 }
    );
  }
}



