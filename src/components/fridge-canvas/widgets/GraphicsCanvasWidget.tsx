import { useState, useRef, useEffect } from 'react';
import { ImagePlus, Upload, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { uploadFile, isFileTypeSupported } from '../../../lib/filesService';
import { createCanvasSVG } from '../../../lib/canvasSVGService';
import { getCanvasSVGsForSpace } from '../../../lib/canvasSVGService';
import type { CanvasSVGWithFile } from '../../../lib/canvasSVGTypes';

interface GraphicsCanvasWidgetProps {
  spaceId: string | null;
  spaceType: 'personal' | 'shared';
  sizeMode: 'icon' | 'mini' | 'large' | 'xlarge';
  onAddToCanvas?: () => void;
}

export function GraphicsCanvasWidget({ spaceId, spaceType, sizeMode, onAddToCanvas }: GraphicsCanvasWidgetProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [svgs, setSvgs] = useState<CanvasSVGWithFile[]>([]);
  const [loadingSvgs, setLoadingSvgs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (spaceId && (sizeMode === 'large' || sizeMode === 'xlarge')) {
      loadSvgs();
    }
  }, [spaceId, sizeMode]);

  async function loadSvgs() {
    if (!spaceId) return;

    try {
      setLoadingSvgs(true);
      const data = await getCanvasSVGsForSpace(spaceId);
      setSvgs(data);
    } catch (err) {
      console.error('Failed to load SVGs:', err);
    } finally {
      setLoadingSvgs(false);
    }
  }

  async function calculateOptimalScale(file: File): Promise<number> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const width = img.width || 200;
        const height = img.height || 200;
        URL.revokeObjectURL(url);

        const maxDimension = Math.max(width, height);
        const minDimension = Math.min(width, height);

        const targetMaxSize = 300;
        const targetMinSize = 100;

        if (maxDimension > targetMaxSize) {
          resolve(targetMaxSize / maxDimension);
        } else if (minDimension < targetMinSize) {
          resolve(targetMinSize / minDimension);
        } else {
          resolve(1.0);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(1.0);
      };

      img.src = url;
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isFileTypeSupported(file.type)) {
      setError('Only SVG files are supported in Graphics widget');
      return;
    }

    if (file.type !== 'image/svg+xml') {
      setError('Only SVG files (.svg) can be added to the canvas');
      return;
    }

    if (!spaceId) {
      setError('No space selected');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const uploadedFile = await uploadFile(file, spaceId, spaceType);

      const scale = await calculateOptimalScale(file);

      await createCanvasSVG({
        space_id: spaceId,
        source_file_id: uploadedFile.id,
        x_position: Math.random() * 200 + 100,
        y_position: Math.random() * 200 + 100,
        scale: scale,
      });

      if (onAddToCanvas) {
        onAddToCanvas();
      }

      await loadSvgs();

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload and place SVG on canvas');
    } finally {
      setUploading(false);
    }
  }

  if (sizeMode === 'icon') {
    return (
      <div className="flex items-center justify-center h-full">
        <ImageIcon size={24} className="text-gray-600" />
      </div>
    );
  }

  if (sizeMode === 'mini') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-2 text-center">
        <ImageIcon size={20} className="text-gray-600 mb-1" />
        <span className="text-xs font-medium text-gray-700">Graphics</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-white rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <ImageIcon size={18} className="text-gray-700" />
          <h3 className="text-sm font-semibold text-gray-900">Graphics</h3>
        </div>
        <span className="text-xs text-gray-500">{svgs.length} on canvas</span>
      </div>

      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-red-800">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-xs font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {loadingSvgs ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="text-gray-400 animate-spin" />
          </div>
        ) : svgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <ImagePlus size={28} className="text-gray-400" />
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">No graphics yet</h4>
            <p className="text-xs text-gray-500 max-w-[200px]">
              Upload SVG files to place them freely on your canvas
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {svgs.map((svg) => (
              <div
                key={svg.id}
                className="aspect-square bg-gray-50 rounded-lg border border-gray-200 p-2 flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <img
                  src={svg.file_url}
                  alt={svg.file_name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !spaceId}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {uploading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload size={16} />
              <span>Upload SVG</span>
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          onChange={handleUpload}
          className="hidden"
        />
        <p className="text-xs text-gray-500 text-center mt-2">
          SVGs will be sized appropriately and placed on your canvas
        </p>
      </div>
    </div>
  );
}
