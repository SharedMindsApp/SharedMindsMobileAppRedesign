import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Sparkles, FileText, Share2, Lock, Copy, Crown, ArrowUp, Loader2, AlertCircle, ArrowLeft,
  Moon, Activity, UtensilsCrossed, Brain, Bed, TrendingUp, Heart, BookOpen, DollarSign,
  Smile, Zap, Droplet, Pill, Wind, Users, Sun, CheckSquare, Search, X, Smartphone, Target, Trees
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  listTemplates, 
  duplicateTemplate, 
  promoteTemplateToGlobal,
  archiveTemplate,
} from '../../lib/trackerStudio/trackerTemplateService';
import { isCurrentUserAdminOrDeveloper } from '../../lib/admin/adminUtils';
import type { TrackerTemplate } from '../../lib/trackerStudio/types';
import { CreateTrackerFromTemplateModal } from './CreateTrackerFromTemplateModal';
import { TemplateShareLinkModal } from './TemplateShareLinkModal';
import { showToast } from '../Toast';

export function TrackerTemplatesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TrackerTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TrackerTemplate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sharingTemplate, setSharingTemplate] = useState<TrackerTemplate | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');

  useEffect(() => {
    loadTemplates();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const admin = await isCurrentUserAdminOrDeveloper();
    setIsAdmin(admin);
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromTemplate = (template: TrackerTemplate) => {
    setSelectedTemplate(template);
    setShowCreateModal(true);
  };

  const handleCreateFromScratch = () => {
    navigate('/tracker-studio/create');
  };

  const handleTrackerCreated = (trackerId: string) => {
    setShowCreateModal(false);
    setSelectedTemplate(null);
    navigate(`/tracker-studio/tracker/${trackerId}`);
  };

  const handleDuplicateTemplate = async (template: TrackerTemplate) => {
    try {
      await duplicateTemplate(template.id);
      showToast('success', 'Template duplicated to your templates');
      loadTemplates();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to duplicate template');
    }
  };

  const handlePromoteToGlobal = async (template: TrackerTemplate) => {
    if (!window.confirm(`Are you sure you want to promote "${template.name}" to a global template? This will make it visible to all users and lock it from further edits.`)) {
      return;
    }

    try {
      await promoteTemplateToGlobal(template.id);
      showToast('success', 'Template promoted to global');
      loadTemplates();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to promote template');
    }
  };

  const handleArchiveTemplate = async (template: TrackerTemplate) => {
    if (!window.confirm(`Are you sure you want to archive "${template.name}"?`)) {
      return;
    }

    try {
      await archiveTemplate(template.id);
      showToast('success', 'Template archived');
      loadTemplates();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to archive template');
    }
  };

  // Get all unique tags from templates
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    templates.forEach(template => {
      if (template.tags && Array.isArray(template.tags)) {
        template.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [templates]);

  // Filter templates based on search query and selected tag
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by search query (name or description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(query) ||
        (template.description && template.description.toLowerCase().includes(query))
      );
    }

    // Filter by selected tag
    if (selectedTag) {
      filtered = filtered.filter(template => 
        template.tags && Array.isArray(template.tags) && template.tags.includes(selectedTag)
      );
    }

    return filtered;
  }, [templates, searchQuery, selectedTag]);

  // Split filtered templates by scope
  const globalTemplates = filteredTemplates.filter(t => t.scope === 'global');
  const userTemplates = filteredTemplates.filter(t => t.scope === 'user');

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - App Store Style */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate('/tracker-studio/my-trackers')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 active:text-gray-700 mb-3 transition-colors text-sm min-h-[44px] sm:min-h-0"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Back to Trackers</span>
            <span className="sm:hidden">Back</span>
          </button>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1.5">Tracker Templates</h1>
          <p className="text-xs sm:text-sm text-gray-600">Choose a template to start tracking, or create your own.</p>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-10 pr-10 py-2.5 sm:py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base min-h-[44px] sm:min-h-0"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Tag Filter Dropdown */}
            {allTags.length > 0 && (
              <div className="relative sm:w-48">
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 sm:py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base min-h-[44px] sm:min-h-0 appearance-none bg-white cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}

            {/* Create from Scratch CTA */}
            <button
              onClick={handleCreateFromScratch}
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-2 text-sm font-semibold min-h-[44px] sm:min-h-0 shadow-sm whitespace-nowrap"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Create Custom</span>
              <span className="sm:hidden">Create</span>
            </button>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || selectedTag) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-600 font-medium">Active filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    aria-label="Remove search filter"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {selectedTag && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  Category: {selectedTag}
                  <button
                    onClick={() => setSelectedTag('')}
                    className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    aria-label="Remove tag filter"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTag('');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading templates...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium mb-1">Failed to load templates</p>
              <p className="text-red-700 text-sm mb-3">{error}</p>
              <button
                onClick={loadTemplates}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Results Count */}
        {!loading && !error && (searchQuery || selectedTag) && (
          <div className="mb-3 text-sm text-gray-600">
            Found {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Featured Templates (Global) */}
        {!loading && !error && globalTemplates.length > 0 && (
          <div className="mb-5 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Crown size={16} className="text-yellow-600 flex-shrink-0" />
                Featured Templates
              </h2>
              {isAdmin && (
                <button
                  onClick={() => navigate('/tracker-studio/templates/create-global')}
                  className="w-full sm:w-auto px-3 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 active:bg-yellow-800 transition-colors text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 min-h-[36px] shadow-sm"
                >
                  <Plus size={14} />
                  <span className="hidden sm:inline">Create Global Template</span>
                  <span className="sm:hidden">Create</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
              {globalTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onCreate={() => handleCreateFromTemplate(template)}
                  onDuplicate={() => handleDuplicateTemplate(template)}
                  onArchive={isAdmin ? () => handleArchiveTemplate(template) : undefined}
                  isGlobal={true}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          </div>
        )}

        {/* User Templates */}
        {!loading && !error && userTemplates.length > 0 && (
          <div className="mb-5 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <FileText size={16} className="text-gray-600 flex-shrink-0" />
              My Templates
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
              {userTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onCreate={() => handleCreateFromTemplate(template)}
                  onShare={() => setSharingTemplate(template)}
                  onPromote={isAdmin ? () => handlePromoteToGlobal(template) : undefined}
                  onArchive={() => handleArchiveTemplate(template)}
                  isOwner={template.created_by === user?.id}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State - No Templates */}
        {!loading && !error && templates.length === 0 && (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200 shadow-sm">
            <FileText size={64} className="mx-auto text-gray-300 mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">Create a custom tracker to get started with your own tracking structure.</p>
            <button
              onClick={handleCreateFromScratch}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Custom Tracker
            </button>
          </div>
        )}

        {/* Empty State - No Results from Filter */}
        {!loading && !error && templates.length > 0 && filteredTemplates.length === 0 && (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200 shadow-sm">
            <Search size={64} className="mx-auto text-gray-300 mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No templates match your search</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Try adjusting your search query or filter to find what you're looking for.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTag('');
              }}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Create Tracker Modal */}
      {showCreateModal && selectedTemplate && (
        <CreateTrackerFromTemplateModal
          template={selectedTemplate}
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedTemplate(null);
          }}
          onTrackerCreated={handleTrackerCreated}
        />
      )}

      {/* Share Link Modal */}
      {sharingTemplate && (
        <TemplateShareLinkModal
          template={sharingTemplate}
          isOpen={!!sharingTemplate}
          onClose={() => setSharingTemplate(null)}
        />
      )}
    </div>
  );
}

// Template theme configuration
type TemplateTheme = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  gradient: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  hoverBorderColor: string;
  buttonBg: string;
  buttonHover: string;
};

function getTemplateTheme(template: TrackerTemplate | string): TemplateTheme {
  // If template object is passed, check for icon and color first
  let templateName: string;
  let templateIcon: string | null = null;
  let templateColor: string | null = null;
  
  if (typeof template === 'string') {
    templateName = template;
  } else {
    templateName = template.name;
    templateIcon = template.icon || null;
    templateColor = template.color || null;
  }
  
  const name = templateName.toLowerCase();
  
  // If template has explicit icon and color, use them
  if (templateIcon && typeof template !== 'string') {
    const IconComponent = (LucideIcons as any)[templateIcon];
    if (IconComponent) {
      // Get color theme based on color name
      const colorTheme = getColorTheme(templateColor || 'blue');
      return {
        icon: IconComponent,
        ...colorTheme,
      };
    }
  }
  
  // Health Tracker - specific check (before medication/symptom)
  if (name.includes('health') && !name.includes('mental health')) {
    return {
      icon: Heart,
      gradient: 'from-red-500 via-rose-500 to-pink-500',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200',
      hoverBorderColor: 'hover:border-red-400',
      buttonBg: 'bg-red-600',
      buttonHover: 'hover:bg-red-700',
    };
  }

  // Fitness Tracker - specific check
  if (name.includes('fitness')) {
    return {
      icon: Activity,
      gradient: 'from-blue-500 via-cyan-500 to-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      hoverBorderColor: 'hover:border-blue-400',
      buttonBg: 'bg-blue-600',
      buttonHover: 'hover:bg-blue-700',
    };
  }
  
  // Sleep & Rest
  if (name.includes('sleep')) {
    return {
      icon: Moon,
      gradient: 'from-indigo-500 via-purple-500 to-pink-500',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
      hoverBorderColor: 'hover:border-indigo-400',
      buttonBg: 'bg-indigo-600',
      buttonHover: 'hover:bg-indigo-700',
    };
  }
  
  if (name.includes('rest') || name.includes('recovery')) {
    return {
      icon: Bed,
      gradient: 'from-blue-400 via-cyan-400 to-teal-400',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      hoverBorderColor: 'hover:border-blue-400',
      buttonBg: 'bg-blue-600',
      buttonHover: 'hover:bg-blue-700',
    };
  }
  
  // Physical Activity
  if (name.includes('exercise') || name.includes('activity')) {
    return {
      icon: Activity,
      gradient: 'from-red-500 via-orange-500 to-yellow-500',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200',
      hoverBorderColor: 'hover:border-red-400',
      buttonBg: 'bg-red-600',
      buttonHover: 'hover:bg-red-700',
    };
  }
  
  // Nutrition & Hydration Tracker (unified food + hydration tracking)
  // Check for "nutrition & hydration" or "nutrition hydration" before generic nutrition
  if ((name.includes('nutrition') && name.includes('hydration')) || 
      (name.includes('nutrition') && name.includes('&'))) {
    return {
      icon: UtensilsCrossed,
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
      hoverBorderColor: 'hover:border-green-400',
      buttonBg: 'bg-green-600',
      buttonHover: 'hover:bg-green-700',
    };
  }
  
  // Nutrition
  if (name.includes('nutrition') || name.includes('food') || name.includes('meal')) {
    return {
      icon: UtensilsCrossed,
      gradient: 'from-orange-400 via-amber-400 to-yellow-400',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-200',
      hoverBorderColor: 'hover:border-orange-400',
      buttonBg: 'bg-orange-600',
      buttonHover: 'hover:bg-orange-700',
    };
  }
  
  // Mindfulness & Mental Health
  if (name.includes('mindfulness') || name.includes('meditation')) {
    return {
      icon: Brain,
      gradient: 'from-purple-500 via-pink-500 to-rose-500',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200',
      hoverBorderColor: 'hover:border-purple-400',
      buttonBg: 'bg-purple-600',
      buttonHover: 'hover:bg-purple-700',
    };
  }
  
  if (name.includes('mood')) {
    return {
      icon: Smile,
      gradient: 'from-pink-400 via-rose-400 to-red-400',
      iconBg: 'bg-pink-100',
      iconColor: 'text-pink-600',
      borderColor: 'border-pink-200',
      hoverBorderColor: 'hover:border-pink-400',
      buttonBg: 'bg-pink-600',
      buttonHover: 'hover:bg-pink-700',
    };
  }
  
  if (name.includes('stress')) {
    return {
      icon: Wind,
      gradient: 'from-gray-500 via-slate-500 to-zinc-500',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      borderColor: 'border-gray-200',
      hoverBorderColor: 'hover:border-gray-400',
      buttonBg: 'bg-gray-600',
      buttonHover: 'hover:bg-gray-700',
    };
  }
  
  // Growth & Development
  if (name.includes('growth')) {
    return {
      icon: TrendingUp,
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
      hoverBorderColor: 'hover:border-green-400',
      buttonBg: 'bg-green-600',
      buttonHover: 'hover:bg-green-700',
    };
  }
  
  // Journaling
  if (name.includes('gratitude')) {
    return {
      icon: Heart,
      gradient: 'from-rose-400 via-pink-400 to-fuchsia-400',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      borderColor: 'border-rose-200',
      hoverBorderColor: 'hover:border-rose-400',
      buttonBg: 'bg-rose-600',
      buttonHover: 'hover:bg-rose-700',
    };
  }
  
  if (name.includes('journal') || name.includes('personal')) {
    return {
      icon: BookOpen,
      gradient: 'from-amber-500 via-yellow-500 to-orange-500',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-200',
      hoverBorderColor: 'hover:border-amber-400',
      buttonBg: 'bg-amber-600',
      buttonHover: 'hover:bg-amber-700',
    };
  }
  
  // Finance
  if (name.includes('income') || name.includes('cash') || name.includes('finance')) {
    return {
      icon: DollarSign,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      hoverBorderColor: 'hover:border-emerald-400',
      buttonBg: 'bg-emerald-600',
      buttonHover: 'hover:bg-emerald-700',
    };
  }
  
  // Health & Wellness
  if (name.includes('energy')) {
    return {
      icon: Zap,
      gradient: 'from-yellow-400 via-amber-400 to-orange-400',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      borderColor: 'border-yellow-200',
      hoverBorderColor: 'hover:border-yellow-400',
      buttonBg: 'bg-yellow-600',
      buttonHover: 'hover:bg-yellow-700',
    };
  }
  
  if (name.includes('water') || name.includes('hydration')) {
    return {
      icon: Droplet,
      gradient: 'from-cyan-400 via-blue-400 to-indigo-400',
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      borderColor: 'border-cyan-200',
      hoverBorderColor: 'hover:border-cyan-400',
      buttonBg: 'bg-cyan-600',
      buttonHover: 'hover:bg-cyan-700',
    };
  }
  
  if (name.includes('medication')) {
    return {
      icon: Pill,
      gradient: 'from-violet-400 via-purple-400 to-fuchsia-400',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      borderColor: 'border-violet-200',
      hoverBorderColor: 'hover:border-violet-400',
      buttonBg: 'bg-violet-600',
      buttonHover: 'hover:bg-violet-700',
    };
  }
  
  if (name.includes('symptom')) {
    return {
      icon: AlertCircle,
      gradient: 'from-red-400 via-rose-400 to-pink-400',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200',
      hoverBorderColor: 'hover:border-red-400',
      buttonBg: 'bg-red-600',
      buttonHover: 'hover:bg-red-700',
    };
  }
  
  // Social & Environment
  if (name.includes('social') || name.includes('connection')) {
    return {
      icon: Users,
      gradient: 'from-blue-500 via-indigo-500 to-purple-500',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      hoverBorderColor: 'hover:border-blue-400',
      buttonBg: 'bg-blue-600',
      buttonHover: 'hover:bg-blue-700',
    };
  }
  
  // Environmental Impact Tracker (behavior-focused environmental actions)
  // Check for "environmental impact" before generic environment/weather
  if (name.includes('environmental impact') || (name.includes('environmental') && name.includes('impact'))) {
    return {
      icon: Trees,
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
      hoverBorderColor: 'hover:border-green-400',
      buttonBg: 'bg-green-600',
      buttonHover: 'hover:bg-green-700',
    };
  }
  
  if (name.includes('weather') || name.includes('environment')) {
    return {
      icon: Sun,
      gradient: 'from-yellow-300 via-amber-300 to-orange-300',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      borderColor: 'border-yellow-200',
      hoverBorderColor: 'hover:border-yellow-400',
      buttonBg: 'bg-yellow-600',
      buttonHover: 'hover:bg-yellow-700',
    };
  }
  
  // Productivity & Habits
  if (name.includes('productivity') || name.includes('focus')) {
    return {
      icon: TrendingUp,
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      hoverBorderColor: 'hover:border-blue-400',
      buttonBg: 'bg-blue-600',
      buttonHover: 'hover:bg-blue-700',
    };
  }

  if (name.includes('habit')) {
    return {
      icon: CheckSquare,
      gradient: 'from-green-400 via-emerald-400 to-teal-400',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
      hoverBorderColor: 'hover:border-green-400',
      buttonBg: 'bg-green-600',
      buttonHover: 'hover:bg-green-700',
    };
  }

  // Digital Wellness & Screen Time (Digital Wellness Tracker evolved from Screen Time Tracker)
  if (name.includes('digital wellness') || name.includes('digital-wellness') || 
      name.includes('screen time') || name.includes('screen-time') || 
      name.includes('phone usage') || name.includes('app usage')) {
    return {
      icon: Smartphone,
      gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      borderColor: 'border-violet-200',
      hoverBorderColor: 'hover:border-violet-400',
      buttonBg: 'bg-violet-600',
      buttonHover: 'hover:bg-violet-700',
    };
  }

  // Goals & Targets
  if (name.includes('goal') || name.includes('target') || name.includes('objective')) {
    return {
      icon: Target,
      gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      hoverBorderColor: 'hover:border-emerald-400',
      buttonBg: 'bg-emerald-600',
      buttonHover: 'hover:bg-emerald-700',
    };
  }

  // Default theme
  return {
    icon: FileText,
    gradient: 'from-gray-400 via-slate-400 to-zinc-400',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    borderColor: 'border-gray-200',
    hoverBorderColor: 'hover:border-gray-400',
    buttonBg: 'bg-gray-600',
    buttonHover: 'hover:bg-gray-700',
  };
}

/**
 * Get color theme based on color name
 */
function getColorTheme(colorName: string): Omit<TemplateTheme, 'icon'> {
  const colorMap: Record<string, Omit<TemplateTheme, 'icon'>> = {
    blue: {
      gradient: 'from-blue-500 via-cyan-500 to-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      hoverBorderColor: 'hover:border-blue-400',
      buttonBg: 'bg-blue-600',
      buttonHover: 'hover:bg-blue-700',
    },
    green: {
      gradient: 'from-green-400 via-emerald-400 to-teal-400',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
      hoverBorderColor: 'hover:border-green-400',
      buttonBg: 'bg-green-600',
      buttonHover: 'hover:bg-green-700',
    },
    purple: {
      gradient: 'from-purple-500 via-pink-500 to-rose-500',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200',
      hoverBorderColor: 'hover:border-purple-400',
      buttonBg: 'bg-purple-600',
      buttonHover: 'hover:bg-purple-700',
    },
    red: {
      gradient: 'from-red-500 via-orange-500 to-yellow-500',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200',
      hoverBorderColor: 'hover:border-red-400',
      buttonBg: 'bg-red-600',
      buttonHover: 'hover:bg-red-700',
    },
    indigo: {
      gradient: 'from-indigo-500 via-purple-500 to-pink-500',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
      hoverBorderColor: 'hover:border-indigo-400',
      buttonBg: 'bg-indigo-600',
      buttonHover: 'hover:bg-indigo-700',
    },
  };
  
  return colorMap[colorName.toLowerCase()] || colorMap.blue;
}

type TemplateCardProps = {
  template: TrackerTemplate;
  onCreate: () => void;
  onShare?: () => void;
  onDuplicate?: () => void;
  onPromote?: () => void;
  onArchive?: () => void;
  isOwner?: boolean;
  isGlobal?: boolean;
  isAdmin?: boolean;
};

function TemplateCard({ 
  template, 
  onCreate, 
  onShare, 
  onDuplicate,
  onPromote,
  onArchive,
  isOwner,
  isGlobal = false,
  isAdmin = false,
}: TemplateCardProps) {
  const theme = getTemplateTheme(template);
  const Icon = theme.icon;
  const tags = template.tags || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 flex flex-col group overflow-hidden relative cursor-pointer">
      {/* Icon/Image Section - App Store Style */}
      <div className={`bg-gradient-to-br ${theme.gradient} p-4 sm:p-5 flex items-center justify-center relative overflow-hidden`}>
        <div className="relative z-10">
          <div className={`${theme.iconBg} ${theme.iconColor} rounded-2xl p-3 sm:p-4 shadow-lg`}>
            <Icon size={32} className={theme.iconColor} />
          </div>
        </div>
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-white"></div>
        {isGlobal && (
          <span className="absolute top-2 right-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800 shadow-sm z-20">
            <Lock size={10} className="mr-1" />
            <span className="hidden sm:inline">Featured</span>
          </span>
        )}
      </div>
      
      {/* Content Section */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 min-h-0">
        {/* Title */}
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-2 mb-1.5 leading-snug break-words">
          {template.name}
        </h3>
        
        {/* Description */}
        {template.description && (
          <p className="text-xs sm:text-sm text-gray-600 line-clamp-3 leading-relaxed mb-2.5 flex-1 break-words">
            {template.description}
          </p>
        )}
        
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.slice(0, tags.length <= 3 ? tags.length : 2).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 whitespace-nowrap"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                +{tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Action Button - App Store "Get" Style */}
        <button
          onClick={onCreate}
          className={`w-full px-3 py-2 sm:py-2.5 ${theme.buttonBg} ${theme.buttonHover} active:opacity-90 text-white rounded-xl transition-all text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white min-h-[36px] sm:min-h-[40px] shadow-sm hover:shadow-md`}
        >
          Create
        </button>
        
        {/* Secondary Actions (Admin/Owner only - hidden by default, shown on hover/click) */}
        {(onDuplicate || onShare || onPromote || onArchive) && (
          <div className="mt-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {isGlobal && onDuplicate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
                className="flex-1 px-2 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-xs flex items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 min-h-[32px]"
                title="Duplicate to My Templates"
                aria-label="Duplicate template"
              >
                <Copy size={12} />
              </button>
            )}
            
            {!isGlobal && isOwner && onShare && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare();
                }}
                className="px-2 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                title="Share template"
                aria-label="Share template"
              >
                <Share2 size={14} />
              </button>
            )}
            
            {!isGlobal && isAdmin && onPromote && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPromote();
                }}
                className="px-2 py-1.5 border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 active:bg-yellow-100 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                title="Promote to Global"
                aria-label="Promote to global template"
              >
                <ArrowUp size={14} />
              </button>
            )}
            
            {onArchive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive();
                }}
                className="px-2 py-1.5 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors text-xs focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 min-h-[32px]"
                title="Archive template"
                aria-label="Archive template"
              >
                <span className="hidden sm:inline">Archive</span>
                <span className="sm:hidden">×</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
