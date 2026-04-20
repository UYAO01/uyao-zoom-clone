import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { currentUser } from '@clerk/nextjs/server';

// CRITICAL: Cloudinary SDK Initialization
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Log config status for debugging
console.log('Cloudinary config:', {
  cloud_name: cloudinary.config().cloud_name ? 'SET' : 'MISSING',
  api_key: cloudinary.config().api_key ? 'SET' : 'MISSING',
  api_secret: cloudinary.config().api_secret ? 'SET' : 'MISSING',
});

// Increase max body size for large file uploads
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        // Check authentication first
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'User is not authenticated' }, { status: 401 });
        }

        // Get content length from headers
        const contentLength = req.headers.get('content-length');
        console.log('Content-Length:', contentLength);

        if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 413 });
        }

        let formData;
        try {
            formData = await req.formData();
            console.log('FormData parsed successfully');
        } catch (parseError) {
            console.error('FormData parse error:', parseError);
            return NextResponse.json({ 
                error: 'Failed to parse body as FormData. File may be too large or request malformed.' 
            }, { status: 400 });
        }

        const file = formData.get('file');
        console.log('File from FormData:', file?.constructor?.name);

        if (!file || !(file instanceof File)) {
            console.error('Invalid file:', file);
            return NextResponse.json({ error: 'No valid file in request' }, { status: 400 });
        }

        if (file.size === 0) {
            return NextResponse.json({ error: 'File is empty' }, { status: 400 });
        }

        console.log(`Uploading file: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`);

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (!buffer || buffer.length === 0) {
            return NextResponse.json({ error: 'Failed to process file' }, { status: 400 });
        }

        console.log(`Buffer created: ${buffer.length} bytes`);

        // Upload to Cloudinary
        const uploadResult: Record<string, unknown> = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'chat_uploads',
                    resource_type: 'auto',
                    access_mode: 'public',
                    public_id: file.name.split('.')[0] + '_' + Date.now(),
                    timeout: 600000,
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary error:', error);
                        reject(error);
                    } else if (result) {
                        resolve(result as Record<string, unknown>);
                    } else {
                        reject(new Error('Upload failed: No result returned'));
                    }
                }
            );

            uploadStream.end(buffer);
        });

        const publicUrl = uploadResult.secure_url;

        if (!publicUrl) {
            throw new Error('Cloudinary upload failed or returned no URL.');
        }

        console.log(`File uploaded successfully: ${publicUrl}`);

        return NextResponse.json(
            {
                url: publicUrl,
                name: file.name,
                publicId: uploadResult.public_id,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Upload handler error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: `Upload failed: ${errorMessage}` }, { status: 500 });
    }
}