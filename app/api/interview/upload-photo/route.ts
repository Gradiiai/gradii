import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient } from '@azure/storage-blob';

// Azure Blob Storage configuration
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'interview-photos';

if (!connectionString) {
  console.error('AZURE_STORAGE_CONNECTION_STRING environment variable is not set');
}

export async function POST(request: NextRequest) {
  try {
    if (!connectionString) {
      return NextResponse.json(
        { error: 'Azure Storage not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const photo = formData.get('photo') as File;
    const email = formData.get('email') as string;
    const interviewId = formData.get('interviewId') as string;

    if (!photo || !email || !interviewId) {
      return NextResponse.json(
        { error: 'Missing required fields: photo, email, or interviewId' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(photo.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (photo.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    try {
      // Initialize Azure Blob Service Client
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(containerName);

      // Ensure container exists (private access since public access is disabled)
      await containerClient.createIfNotExists();

      // Create unique blob name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileExtension = photo.type.split('/')[1];
      const blobName = `verification-photos/${interviewId}/${email.replace('@', '_at_')}_${timestamp}.${fileExtension}`;

      // Get block blob client
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Convert file to buffer
      const arrayBuffer = await photo.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Azure Blob Storage
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: photo.type,
        },
        metadata: {
          email: email,
          interviewId: interviewId,
          originalName: photo.name,
          uploadTimestamp: new Date().toISOString(),
          purpose: 'identity-verification'
        }
      });

      const photoUrl = blockBlobClient.url;

      // TODO: Store photo URL in database for future reference
      // You may want to add this to candidateInterviewHistory or create a separate table
      // for verification photos
      
      console.log(`Verification photo uploaded successfully: ${photoUrl}`);

      return NextResponse.json({
        success: true,
        photoUrl: photoUrl,
        message: 'Verification photo uploaded successfully'
      });

    } catch (azureError) {
      console.error('Azure Blob Storage error:', azureError);
      return NextResponse.json(
        { error: 'Failed to upload photo to storage' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error during photo upload' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to upload photos.' },
    { status: 405 }
  );
}