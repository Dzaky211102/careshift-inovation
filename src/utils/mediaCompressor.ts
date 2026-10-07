/**
 * Media compression utility for CareShift
 * Compresses images before storing as base64 to prevent exceeding browser storage quota
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Compresses an image file (JPEG, PNG, WebP) using HTML5 Canvas.
 * Animated GIFs are kept intact to preserve animation frames.
 */
export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const { maxWidth = 1280, maxHeight = 1280, quality = 0.82 } = options;

  // If animated GIF, don't flatten to canvas (preserves frames)
  if (file.type === 'image/gif') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // For other images, use canvas downscaling and JPEG/WebP compression
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) {
        reject(new Error('Failed to read image file'));
        return;
      }

      const img = new Image();
      img.onerror = () => {
        // Fallback to raw data url if image failed to decode
        resolve(rawDataUrl);
      };
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width <= maxWidth && height <= maxHeight && file.size < 400 * 1024) {
          // File is already small and within bounds
          resolve(rawDataUrl);
          return;
        }

        // Calculate aspect ratio preserving dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }

        // Enable high-quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to efficient JPEG
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Processes any media file (image, video, gif)
 * Returns the base64 URL and an optional warning message if too large
 */
export async function processMediaUpload(
  file: File
): Promise<{ url: string; warning?: string }> {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');

  if (isVideo) {
    // Check video file size (warn if > 15MB)
    const sizeInMB = file.size / (1024 * 1024);
    let warning: string | undefined;

    if (sizeInMB > 15) {
      warning = `Ukuran file video (${sizeInMB.toFixed(1)} MB) cukup besar. Disarankan memakai link YouTube/Google Drive/URL eksternal agar pemuatan selalu lancar.`;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result as string,
          warning,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  if (isImage) {
    try {
      const compressedUrl = await compressImageFile(file);
      return { url: compressedUrl };
    } catch {
      // Fallback to direct FileReader
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ url: reader.result as string });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  }

  // Fallback for other file types
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ url: reader.result as string });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
