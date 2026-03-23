import { useState, useRef } from 'react';
import { Image as ImageIcon, Upload, Link as LinkIcon } from 'lucide-react';
import { PhotoContent, WidgetViewMode } from '../../../lib/fridgeCanvasTypes';

interface PhotoCanvasWidgetProps {
  content: PhotoContent;
  viewMode: WidgetViewMode;
  onContentChange?: (content: PhotoContent) => void;
}

export function PhotoCanvasWidget({ content, viewMode, onContentChange }: PhotoCanvasWidgetProps) {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  if (viewMode === 'icon') {
    return (
      <div className="w-full h-full bg-gray-100 border-gray-200 border-2 rounded-2xl overflow-hidden">
        {content.url ? (
          <img src={content.url} alt={content.caption || 'Photo'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={32} className="text-gray-400" />
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'mini') {
    return (
      <div className="w-full h-full bg-white border-gray-300 border-4 rounded-2xl overflow-hidden shadow-xl">
        {content.url ? (
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 overflow-hidden">
              <img src={content.url} alt={content.caption || 'Photo'} className="w-full h-full object-cover" />
            </div>
            {content.caption && (
              <div className="bg-white px-3 py-2 border-t border-gray-200">
                <p className="text-xs text-gray-700 truncate">{content.caption}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <ImageIcon size={32} className="text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No image</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const handleUrlSubmit = () => {
    if (urlInput.trim() && onContentChange) {
      onContentChange({ ...content, url: urlInput.trim() });
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onContentChange) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        onContentChange({ ...content, url: result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full h-full bg-white border-gray-300 border-4 rounded-2xl overflow-hidden shadow-xl">
      {content.url ? (
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 overflow-hidden relative group">
            <img src={content.url} alt={content.caption || 'Photo'} className="w-full h-full object-cover" />
            {onContentChange && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-white rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  <Upload size={16} className="inline mr-1" />
                  Replace
                </button>
                <button
                  onClick={() => setShowUrlInput(true)}
                  className="px-3 py-2 bg-white rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  <LinkIcon size={16} className="inline mr-1" />
                  URL
                </button>
              </div>
            )}
          </div>
          <div className="bg-white px-4 py-3 border-t border-gray-200">
            {onContentChange ? (
              <input
                type="text"
                className="w-full text-sm text-gray-800 bg-transparent border-none focus:outline-none"
                placeholder="Add a caption..."
                value={content.caption || ''}
                onChange={(e) => onContentChange({ ...content, caption: e.target.value })}
              />
            ) : content.caption ? (
              <p className="text-sm text-gray-800 mb-1">{content.caption}</p>
            ) : null}
            {content.uploadedBy && (
              <p className="text-xs text-gray-500">Uploaded by {content.uploadedBy}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-50">
          {showUrlInput ? (
            <div className="text-center px-6 w-full">
              <LinkIcon size={32} className="text-gray-400 mx-auto mb-3" />
              <input
                type="url"
                className="w-full text-sm text-gray-800 bg-white border border-gray-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-blue-400"
                placeholder="Enter image URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                autoFocus
              />
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleUrlSubmit}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  Add Image
                </button>
                <button
                  onClick={() => {
                    setShowUrlInput(false);
                    setUrlInput('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <ImageIcon size={48} className="text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-4">No image uploaded</p>
              {onContentChange && (
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Upload size={16} />
                    Upload File
                  </button>
                  <button
                    onClick={() => setShowUrlInput(true)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors flex items-center gap-2"
                  >
                    <LinkIcon size={16} />
                    Image URL
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
