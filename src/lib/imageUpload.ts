import { supabase, supabaseConfigured } from './supabase';

const STORAGE_BUCKET = 'gift-images';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
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

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: 'File too large. Maximum size is 5MB.' };
    }

    const fileName = `${sessionId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase!.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
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
