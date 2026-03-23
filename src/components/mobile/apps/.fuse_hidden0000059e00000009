import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Plus, Image as ImageIcon, X, Upload, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { FridgeWidget, PhotoContent } from '../../../lib/fridgeCanvasTypes';

interface MobilePhotosAppProps {
  householdId?: string;
  onClose: () => void;
}

export function MobilePhotosApp({ householdId, onClose }: MobilePhotosAppProps) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<FridgeWidget[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<FridgeWidget | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (householdId) {
      loadPhotos();
    }
  }, [householdId]);

  const loadPhotos = async () => {
    if (!householdId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fridge_widgets')
        .select('*')
        .eq('household_id', householdId)
        .eq('widget_type', 'photo')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPhoto = async (url: string, caption?: string) => {
    if (!householdId || !user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return;

      const newPhoto: Partial<FridgeWidget> = {
        household_id: householdId,
        created_by: profile.id,
        widget_type: 'photo',
        title: 'Photo',
        content: { url, caption, uploadedBy: profile.display_name || 'Someone' },
        color: 'gray',
        icon: 'Image'
      };

      const { data, error } = await supabase
        .from('fridge_widgets')
        .insert(newPhoto)
        .select()
        .single();

      if (error) throw error;

      setPhotos([data, ...photos]);
      setShowAddOptions(false);
      setShowUrlInput(false);
      setUrlInput('');
    } catch (error) {
      console.error('Failed to create photo:', error);
    }
  };

  const updatePhoto = async (photoId: string, content: PhotoContent) => {
    try {
      const { error } = await supabase
        .from('fridge_widgets')
        .update({ content })
        .eq('id', photoId);

      if (error) throw error;

      setPhotos(photos.map(p => p.id === photoId ? { ...p, content } : p));
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto({ ...selectedPhoto, content });
      }
    } catch (error) {
      console.error('Failed to update photo:', error);
    }
  };

  const deletePhoto = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from('fridge_widgets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', photoId);

      if (error) throw error;

      setPhotos(photos.filter(p => p.id !== photoId));
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
      }
    } catch (error) {
      console.error('Failed to delete photo:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        createPhoto(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      createPhoto(urlInput.trim());
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading photos...</div>
      </div>
    );
  }

  if (selectedPhoto) {
    const photoContent = selectedPhoto.content as PhotoContent;

    return (
      <div className="h-full bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur">
          <button
            onClick={() => setSelectedPhoto(null)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} className="text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Photo</h1>
          <button
            onClick={() => deletePhoto(selectedPhoto.id)}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
          >
            <X size={24} className="text-red-400" />
          </button>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
          <img
            src={photoContent.url || ''}
            alt={photoContent.caption || 'Photo'}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>

        <div className="px-4 py-3 bg-black/80 backdrop-blur">
          <input
            type="text"
            className="w-full bg-white/10 text-white placeholder-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:bg-white/20 transition-colors"
            placeholder="Add a caption..."
            value={photoContent.caption || ''}
            onChange={(e) => updatePhoto(selectedPhoto.id, { ...photoContent, caption: e.target.value })}
          />
          {photoContent.uploadedBy && (
            <p className="text-sm text-gray-400 mt-2">Uploaded by {photoContent.uploadedBy}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Photos</h1>
        <button
          onClick={() => setShowAddOptions(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Plus size={24} className="text-gray-700" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <ImageIcon size={64} className="text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Photos Yet</h2>
            <p className="text-gray-500 mb-6">Add your first photo to get started</p>
            <button
              onClick={() => setShowAddOptions(true)}
              className="px-6 py-3 bg-pink-500 text-white rounded-xl font-semibold hover:bg-pink-600 transition-colors"
            >
              Add Photo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => {
              const photoContent = photo.content as PhotoContent;

              return (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="aspect-square bg-gray-100 rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                >
                  {photoContent.url ? (
                    <img
                      src={photoContent.url}
                      alt={photoContent.caption || 'Photo'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={32} className="text-gray-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showAddOptions && (
        <div className="absolute inset-0 bg-black/50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Add Photo</h2>
              <button
                onClick={() => {
                  setShowAddOptions(false);
                  setShowUrlInput(false);
                  setUrlInput('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-700" />
              </button>
            </div>

            {showUrlInput ? (
              <div className="space-y-4">
                <input
                  type="url"
                  className="w-full text-gray-800 bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-pink-400"
                  placeholder="Enter image URL..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                  autoFocus
                />
                <button
                  onClick={handleUrlSubmit}
                  className="w-full px-6 py-3 bg-pink-500 text-white rounded-xl font-semibold hover:bg-pink-600 transition-colors"
                >
                  Add Image
                </button>
                <button
                  onClick={() => {
                    setShowUrlInput(false);
                    setUrlInput('');
                  }}
                  className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-6 py-4 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <Upload size={24} className="text-gray-700" />
                  <span className="text-lg font-medium text-gray-900">Upload from Device</span>
                </button>
                <button
                  onClick={() => setShowUrlInput(true)}
                  className="w-full flex items-center gap-3 px-6 py-4 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <LinkIcon size={24} className="text-gray-700" />
                  <span className="text-lg font-medium text-gray-900">Add from URL</span>
                </button>
              </div>
            )}
          </div>
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
