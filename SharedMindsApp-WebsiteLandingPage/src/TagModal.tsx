import { X, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  tag: {
    name: string;
    title: string;
    description: string;
    longDescription: string;
    destination: string;
    destinationLabel: string;
    color: string;
    colorHex: string;
  } | null;
}

export default function TagModal({ isOpen, onClose, tag }: TagModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !tag) return null;

  const handleNavigate = () => {
    window.location.hash = tag.destination;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      ></div>

      <div
        className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{ animation: 'modalSlideUp 0.3s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all duration-200 hover:scale-110 z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>

        <div className="p-8 sm:p-12">
          <div
            className={`inline-flex items-center justify-center px-4 py-2 rounded-full bg-gradient-to-r ${tag.color} text-white text-sm font-semibold mb-6 shadow-lg`}
            style={{
              boxShadow: `0 4px 20px ${tag.colorHex}40`,
            }}
          >
            {tag.name}
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {tag.title}
          </h2>

          <p className="text-lg text-slate-700 mb-6 leading-relaxed">
            {tag.description}
          </p>

          <div className="bg-slate-50 rounded-2xl p-6 mb-8 border-2 border-slate-200">
            <p className="text-slate-700 leading-relaxed">
              {tag.longDescription}
            </p>
          </div>

          <button
            onClick={handleNavigate}
            className={`w-full sm:w-auto group relative overflow-hidden rounded-2xl bg-gradient-to-r ${tag.color} text-white px-8 py-4 font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3`}
            style={{
              boxShadow: `0 8px 30px ${tag.colorHex}40`,
            }}
          >
            <span className="relative z-10">{tag.destinationLabel}</span>
            <ArrowRight className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
            <div
              className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
            ></div>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
