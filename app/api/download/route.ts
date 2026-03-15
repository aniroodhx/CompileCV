import { NextRequest, NextResponse } from 'next/server';
import { getPresignedDownloadUrl } from '@/utils/s3Utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileKey } = body;

    if (!fileKey) {
      return NextResponse.json(
        { error: 'fileKey is required' },
        { status: 400 }
      );
    }

    // Generate pre-signed download URL
    const downloadUrl = await getPresignedDownloadUrl(fileKey);

    return NextResponse.json({
      downloadUrl,
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}