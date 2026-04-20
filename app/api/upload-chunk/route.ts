import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { currentUser } from '@clerk/nextjs/server';

// Cloudinary SDK Initialization
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const maxDuration = 120; // 2 minute timeout

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fileName = req.headers.get('x-file-name');

    if (!fileName) {
      return NextResponse.json({ error: 'Missing filename' }, { status: 400 });
    }

    // Read the raw body as a stream and convert to buffer
    const chunks: Buffer[] = [];
    const reader = req.body?.getReader();

    if (!reader) {
      return NextResponse.json({ error: 'No request body' }, { status: 400 });
    }

    let totalSize = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = Buffer.from(value);
        chunks.push(chunk);
        totalSize += chunk.length;
      }
    } catch (readError) {
      console.error('Stream read error:', readError);
      // Fallback: try to get arrayBuffer
      const buffer = Buffer.from(await req.arrayBuffer());
      chunks.push(buffer);
      totalSize = buffer.length;
    }

    const buffer = Buffer.concat(chunks);

    console.log(`Uploading file: ${fileName}, Size: ${buffer.length} bytes (total: ${totalSize})`);

    // Verify buffer is not empty
    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Empty file received' }, { status: 400 });
    }

    // Upload to Cloudinary using stream from buffer
    const uploadResult: Record<string, unknown> = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'chat_uploads',
          resource_type: 'auto',
          access_mode: 'public',
          public_id: fileName.split('.')[0] + '_' + Date.now(),
          timeout: 600000,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary error:', error);
            reject(error);
          } else if (result) {
            console.log('Upload successful:', result?.secure_url);
            resolve(result as Record<string, unknown>);
          } else {
            reject(new Error('Upload failed: No result returned'));
          }
        }
      );

      // Write buffer to stream properly
      uploadStream.write(buffer);
      uploadStream.end();
    });

    return NextResponse.json({
      url: uploadResult.secure_url,
      name: fileName,
      publicId: uploadResult.public_id,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

