import { supabase, supabaseConfigured } from './supabase';

const STORAGE_BUCKET = 'gift-images';
const MAX_IMAGE_WIDTH = 800;
const MAX_IMAGE_HEIGHT = 800;
const TARGET_FILE_SIZE = 200 * 1024; // 200KB target
const INITIAL_QUALITY = 0.85;

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;
      
      // Calculate new dimensions maintaining aspect ratio
      if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
        const ratio = Math.min(MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Use white background for transparency (converts to JPEG)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      // Start with initial quality and reduce if needed
      let quality = INITIAL_QUALITY;
      
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Compression failed'));
              return;
            }
            
            // If still too large and quality can be reduced, try again
            if (blob.size > TARGET_FILE_SIZE && quality > 0.3) {
              quality -= 0.1;
              tryCompress();
            } else {
              console.log(`Image compressed: ${(file.size / 1024).toFixed(1)}KB -> ${(blob.size / 1024).toFixed(1)}KB (${Math.round(quality * 100)}% quality)`);
              resolve(blob);
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      tryCompress();
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadGiftImage(
  file: File,
  sessionId: string
): Promise<UploadResult> {
  if (!supabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (!allowedExtensions.includes(fileExt)) {
      return { success: false, error: 'Invalid file type. Please use JPG, PNG, GIF, or WebP.' };
    }

    // Allow larger files since we'll compress them
    const maxSize = 10 * 1024 * 1024; // 10MB input limit
    if (file.size > maxSize) {
      return { success: false, error: 'File too large. Maximum size is 10MB.' };
    }

    // Compress the image before upload
    let uploadBlob: Blob;
    let finalExt = 'jpg';
    let contentType = 'image/jpeg';
    let compressionSucceeded = false;
    
    try {
      uploadBlob = await compressImage(file);
      compressionSucceeded = true;
    } catch (compressError) {
      console.error('Compression failed, using original:', compressError);
      uploadBlob = file;
      // Preserve original file type when compression fails
      finalExt = fileExt === 'jpeg' ? 'jpg' : fileExt;
      contentType = file.type || `image/${fileExt}`;
    }

    const fileName = `${sessionId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${compressionSucceeded ? 'jpg' : finalExt}`;

    const { data, error } = await supabase!.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, uploadBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: compressionSucceeded ? 'image/jpeg' : contentType
      });

    if (error) {
      console.error('Storage upload error:', error);
      if (error.message.includes('Bucket not found')) {
        return { 
          success: false, 
          error: 'Storage bucket not configured. Please contact the administrator.' 
        };
      }
      return { success: false, error: error.message };
    }

    const { data: publicUrlData } = supabase!.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return { success: true, url: publicUrlData.publicUrl };
  } catch (err: any) {
    console.error('Image upload failed:', err);
    return { success: false, error: err.message || 'Upload failed' };
  }
}

export async function deleteGiftImage(imageUrl: string): Promise<boolean> {
  if (!supabaseConfigured || !imageUrl) return false;

  try {
    // Only attempt to delete if it looks like a Supabase storage URL
    // Pattern: https://<project>.supabase.co/storage/v1/object/public/gift-images/<path>
    const storagePattern = /\/storage\/v1\/object\/public\/gift-images\/(.+)$/;
    const match = imageUrl.match(storagePattern);
    
    if (!match) {
      // Not a Supabase storage URL, nothing to delete
      return true;
    }

    const path = decodeURIComponent(match[1]);
    
    const { error } = await supabase!.storage
      .from(STORAGE_BUCKET)
      .remove([path]);

    if (error) {
      console.error('Storage delete error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Image delete failed:', err);
    return false;
  }
}

export function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  if (isDataUrl(url)) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
