import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient } from '@azure/storage-blob';
import { db } from '@/lib/database/connection';
import { candidateResults, campaignInterviews } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

// Azure Blob Storage configuration
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'interview-recordings';

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
    const recording = formData.get('recording') as File;
    const email = formData.get('email') as string;
    const interviewId = formData.get('interviewId') as string;
    const interviewType = formData.get('interviewType') as string;
    const answers = formData.get('answers') as string; // JSON string of Q&A

    if (!recording || !email || !interviewId) {
      return NextResponse.json(
        { error: 'Missing required fields: recording, email, or interviewId' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['video/webm', 'video/mp4', 'video/avi'];
    if (!allowedTypes.includes(recording.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only WebM, MP4, and AVI are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 500MB for interviews)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (recording.size > maxSize) {
      return NextResponse.json(
        { error: 'Recording too large. Maximum size is 500MB.' },
        { status: 400 }
      );
    }

    try {
      // Initialize Azure Blob Service Client
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(containerName);

      // Ensure container exists
      await containerClient.createIfNotExists({
        access: 'blob' // Make recordings accessible via URL
      });

      // Create unique blob name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileExtension = recording.type.split('/')[1];
      const blobName = `interviews/${interviewId}/${email.replace('@', '_at_')}_${timestamp}.${fileExtension}`;

      // Get block blob client
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Convert file to buffer
      const arrayBuffer = await recording.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Azure Blob Storage
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: recording.type,
        },
        metadata: {
          email: email,
          interviewId: interviewId,
          interviewType: interviewType || 'unknown',
          originalName: recording.name,
          uploadTimestamp: new Date().toISOString(),
          purpose: 'interview-recording',
          duration: recording.size.toString(), // Approximate duration based on file size
        }
      });

      const recordingUrl = blockBlobClient.url;
      console.log(`Interview recording uploaded successfully: ${recordingUrl}`);

      // Update database with recording URL and answers
      try {
        // Parse answers if provided
        let parsedAnswers = null;
        if (answers) {
          try {
            parsedAnswers = JSON.parse(answers);
          } catch (parseError) {
            console.warn('Failed to parse answers JSON:', parseError);
          }
        }

        // Try to update candidateResults first
        const historyUpdate = await db
          .update(candidateResults)
          .set({
            recordingUrl: recordingUrl,
            feedback: parsedAnswers ? JSON.stringify(parsedAnswers) : null,
            completedAt: new Date(),
            status: 'completed',
            updatedAt: new Date(),
          })
          .where(eq(candidateResults.interviewId, interviewId))
          .returning();

        // If no rows affected, try campaignInterviews table
        if (historyUpdate.length === 0) {
          await db
            .update(campaignInterviews)
            .set({
              recordingUrl: recordingUrl,
              feedback: parsedAnswers ? JSON.stringify(parsedAnswers) : null,
              completedAt: new Date(),
              status: 'completed',
              updatedAt: new Date(),
            })
            .where(eq(campaignInterviews.interviewId, interviewId));
        }

        console.log(`Database updated for interview ${interviewId}`);
      } catch (dbError) {
        console.error('Database update error:', dbError);
        // Don't fail the request if DB update fails - recording is still uploaded
      }

      return NextResponse.json({
        success: true,
        recordingUrl: recordingUrl,
        message: 'Interview recording uploaded successfully',
        interviewId: interviewId,
      });

    } catch (azureError) {
      console.error('Azure Blob Storage error:', azureError);
      return NextResponse.json(
        { error: 'Failed to upload recording to storage' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Recording upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error during recording upload' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to upload recordings.' },
    { status: 405 }
  );
}