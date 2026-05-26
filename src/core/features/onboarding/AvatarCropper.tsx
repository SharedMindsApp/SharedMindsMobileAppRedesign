/**
 * AvatarCropper — square-aspect crop modal with zoom + pan.
 *
 * Uses react-easy-crop for the drag/pinch interaction; produces a fresh
 * JPEG File via canvas on confirm. Output is square (1:1) at 512×512 max,
 * which is plenty for avatar display and keeps upload size small.
 *
 * Usage:
 *   <AvatarCropper
 *     file={selectedFile}
 *     onConfirm={(croppedFile) => { ... }}
 *     onCancel={() => { ... }}
 *   />
 */

import { useState, useCallback, useEffect } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Check, X, ZoomIn, ZoomOut } from 'lucide-react';

interface Props {
  file: File;
  onConfirm: (croppedFile: File, previewUrl: string) => void;
  onCancel: () => void;
}

const OUTPUT_SIZE = 512; // px — the final avatar dimension

/** Render the user's selected crop region onto a canvas → return a new File. */
async function getCroppedFile(
  imageSrc: string,
  cropPixels: Area,
  filename: string,
): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.drawImage(
    image,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, OUTPUT_SIZE, OUTPUT_SIZE,
  );

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Canvas toBlob failed'));
        resolve(new File([blob], filename, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  });
}

export function AvatarCropper({ file, onConfirm, onCancel }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPixels, setCropPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  // Read the File into a data URL so the cropper can render it
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }, [file]);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCropPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !cropPixels || busy) return;
    setBusy(true);
    try {
      const cropped = await getCroppedFile(imageSrc, cropPixels, file.name);
      const previewUrl = URL.createObjectURL(cropped);
      onConfirm(cropped, previewUrl);
    } catch (err) {
      console.error('[AvatarCropper] Failed to crop:', err);
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      style={{ animation: 'wizFadeIn 200ms ease-out both' }}
    >
      <div
        className="relative w-full max-w-md bg-surface rounded-3xl overflow-hidden shadow-2xl"
        style={{ animation: 'wizPop 350ms cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-container">
          <h3 className="font-extrabold text-base stitch-text-primary">
            Adjust your photo
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center transition-colors"
          >
            <X size={16} className="stitch-text-secondary" />
          </button>
        </div>

        {/* Cropper area — fixed square */}
        <div className="relative w-full aspect-square bg-slate-900">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
              classes={{ containerClassName: 'rounded-none' }}
            />
          )}
        </div>

        {/* Zoom slider */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
              className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center transition-colors active:scale-90"
            >
              <ZoomOut size={14} className="stitch-text-primary" />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary h-1"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center transition-colors active:scale-90"
            >
              <ZoomIn size={14} className="stitch-text-primary" />
            </button>
          </div>
          <p className="text-[11px] stitch-text-secondary text-center mt-2">
            Drag to reposition · pinch or scroll to zoom
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-3 rounded-2xl text-sm font-bold bg-surface-container-low stitch-text-primary hover:bg-surface-container transition-colors active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!cropPixels || busy}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] ${
              cropPixels && !busy
                ? 'stitch-btn--primary text-white shadow-md shadow-primary/30 hover:-translate-y-0.5'
                : 'bg-surface-container-low stitch-text-secondary cursor-not-allowed'
            }`}
          >
            <Check size={16} />
            {busy ? 'Cropping…' : 'Use this photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
