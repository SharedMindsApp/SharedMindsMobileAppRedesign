import { useState, useRef } from 'react';
import { X, Upload, AlertCircle, FileCheck } from 'lucide-react';

interface UploadSVGModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, svgContent: string) => Promise<void>;
}

export function UploadSVGModal({ isOpen, onClose, onUpload }: UploadSVGModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewSVG, setPreviewSVG] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validateAndReadFile = async (file: File): Promise<string> => {
    const fileName = file.name.toLowerCase();
    const fileType = file.type;

    // Check file extension
    if (!fileName.endsWith('.svg')) {
      throw new Error('Only SVG files are supported. Please upload a .svg file.');
    }

    // Check MIME type
    if (fileType && fileType !== 'image/svg+xml') {
      throw new Error('Invalid file type. Please upload a valid SVG file.');
    }

    // Read file content
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;

        // Validate SVG content
        if (!content.trim().startsWith('<svg') && !content.includes('<svg')) {
          reject(new Error('Invalid SVG file. The file does not contain valid SVG content.'));
          return;
        }

        resolve(content);
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file. Please try again.'));
      };

      reader.readAsText(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    setPreviewSVG(null);

    try {
      const svgContent = await validateAndReadFile(file);
      setSelectedFile(file);
      setPreviewSVG(svgContent);
    } catch (err: any) {
      setError(err.message || 'Failed to process file');
      setSelectedFile(null);
      setPreviewSVG(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !previewSVG) return;

    setUploading(true);
    setError(null);

    try {
      await onUpload(selectedFile, previewSVG);
      onClose();
      setSelectedFile(null);
      setPreviewSVG(null);
    } catch (err: any) {
      setError(err.message || 'Failed to upload SVG');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (uploading) return;
    setSelectedFile(null);
    setPreviewSVG(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Upload SVG Graphic</h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : selectedFile
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,image/svg+xml"
              onChange={handleChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-3">
                <FileCheck className="mx-auto text-green-600" size={48} />
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="mx-auto text-gray-400" size={48} />
                <div>
                  <p className="text-lg font-medium text-gray-700">
                    Drop your SVG file here
                  </p>
                  <p className="text-sm text-gray-500">or click to browse</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Choose File
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="font-medium text-red-900">Upload Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Preview */}
          {previewSVG && !error && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Preview</h3>
              <div className="border rounded-lg p-6 bg-gray-50 flex items-center justify-center min-h-[200px]">
                <div
                  dangerouslySetInnerHTML={{ __html: previewSVG }}
                  className="max-w-full max-h-[300px]"
                  style={{ width: 'auto', height: 'auto' }}
                />
              </div>
            </div>
          )}

          {/* Info */}
          <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="font-medium text-blue-900 mb-2">Supported Format:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>SVG (Scalable Vector Graphics) files only</li>
              <li>Files must have .svg extension</li>
              <li>Vector-based graphics that scale without quality loss</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !previewSVG || uploading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload to Canvas'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
