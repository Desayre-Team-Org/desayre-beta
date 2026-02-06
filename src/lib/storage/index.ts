import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export interface UploadResult {
  key: string;
  url: string;
  publicUrl: string;
}

export class StorageService {
  async uploadFromUrl(
    sourceUrl: string,
    folder: 'images' | 'videos' = 'images'
  ): Promise<UploadResult> {
    try {
      console.log(`[STORAGE] Fetching from URL: ${sourceUrl}`);
      
      // Fetch the file from source URL
      const response = await fetch(sourceUrl);
      
      console.log(`[STORAGE] Fetch response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from URL: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const contentLength = response.headers.get('content-length');
      console.log(`[STORAGE] Content-Type: ${contentType}, Content-Length: ${contentLength}`);
      
      const buffer = await response.arrayBuffer();
      console.log(`[STORAGE] Downloaded ${buffer.byteLength} bytes`);
      
      return this.uploadBuffer(Buffer.from(buffer), folder, contentType);
    } catch (error) {
      console.error(`[STORAGE] Upload from URL failed:`, error);
      throw new Error(`Upload from URL failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    folder: 'images' | 'videos' = 'images',
    contentType?: string
  ): Promise<UploadResult> {
    const extension = this.getExtensionFromContentType(contentType);
    const key = `${folder}/${uuidv4()}${extension}`;

    try {
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
      });

      await s3Client.send(command);

      return {
        key,
        url: this.getInternalUrl(key),
        publicUrl: this.getPublicUrl(key),
      };
    } catch (error) {
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadBase64(
    base64Data: string,
    folder: 'images' | 'videos' = 'images'
  ): Promise<UploadResult> {
    // Extract content type and data from base64 string
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 data');
    }

    const contentType = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    return this.uploadBuffer(buffer, folder, contentType);
  }

  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
    } catch (error) {
      throw new Error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  getPublicUrl(key: string): string {
    if (R2_PUBLIC_URL) {
      return `${R2_PUBLIC_URL}/${key}`;
    }
    return this.getInternalUrl(key);
  }

  private getInternalUrl(key: string): string {
    return `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`;
  }

  private getExtensionFromContentType(contentType?: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
    };

    return mimeToExt[contentType || ''] || '';
  }
}

export const storage = new StorageService();
