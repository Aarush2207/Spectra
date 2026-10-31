import { createWorker } from 'tesseract.js';

export interface OcrResult {
  text: string;
  confidence: number;
  durationMs: number;
}

/**
 * Pre-processes an image on an offscreen canvas:
 * - Scales down excessively large images to max 1800px to maintain high OCR speed
 * - Enhances contrast to separate text characters from noisy backgrounds
 */
export async function preprocessImage(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDimension = 1800;
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Contrast stretch for optical character separation
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const contrast = avg > 128 ? Math.min(255, avg * 1.1) : Math.max(0, avg * 0.9);
        data[i] = contrast;
        data[i + 1] = contrast;
        data[i + 2] = contrast;
      }
      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

/**
 * Executes Tesseract OCR on an image file or base64 data URI
 */
export async function extractTextFromImage(
  imageSource: string | File,
  onProgress?: (status: string, percent: number) => void
): Promise<OcrResult> {
  const startTime = performance.now();

  let base64Data: string;
  if (typeof imageSource === 'string') {
    base64Data = imageSource;
  } else {
    base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageSource);
    });
  }

  onProgress?.('Optimizing image contrast and resolution...', 20);
  const optimizedData = await preprocessImage(base64Data);

  onProgress?.('Initializing neural OCR engine...', 45);
  const worker = await createWorker('eng');

  onProgress?.('Extracting character bounding boxes...', 75);
  const ret = await worker.recognize(optimizedData);
  await worker.terminate();

  const durationMs = Number((performance.now() - startTime).toFixed(2));
  const text = ret.data.text.trim();
  const confidence = Math.round(ret.data.confidence);

  onProgress?.('Extraction complete', 100);

  return {
    text,
    confidence,
    durationMs
  };
}
