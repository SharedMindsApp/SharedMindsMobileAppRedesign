import { useState, useEffect } from 'react';
import { Wrench, Plus, Pencil, Trash2, Loader, AlertTriangle, DollarSign } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { UserTool, ProjectRequiredTool } from '../../../lib/guardrailsTypes';
import { AddToolModal } from './AddToolModal';
import { AddRequiredToolModal } from './AddRequiredToolModal';

interface ToolsMatrixProps {
  masterProjectId: string;
}

export function ToolsMatrix({ masterProjectId }: ToolsMatrixProps) {
  const [userTools, setUserTools] = useState<UserTool[]>([]);
  const [requiredTools, setRequiredTools] = useState<ProjectRequiredTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddToolModal, setShowAddToolModal] = useState(false);
  const [showAddRequiredModal, setShowAddRequiredModal] = useState(false);
  const [editingTool, setEditingTool] = useState<UserTool | null>(null);
  const [editingRequired, setEditingRequired] = useState<ProjectRequiredTool | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const [userToolsRes, requiredToolsRes] = await Promise.all([
        supabase.from('user_tools').select('*').eq('user_id', user.id).order('name'),
        supabase
          .from('project_required_tools')
          .select('*')
          .eq('master_project_id', masterProjectId)
          .order('is_essential', { ascending: false }),
      ]);

      if (userToolsRes.error) throw userToolsRes.error;
      if (requiredToolsRes.error) throw requiredToolsRes.error;

      setUserTools(userToolsRes.data || []);
      setRequiredTools(requiredToolsRes.data || []);
    } catch (err) {
      console.error('Failed to load tools:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [masterProjectId]);

  const handleDeleteUserTool = async (toolId: string) => {
    try {
      const { error } = await supabase.from('user_tools').delete().eq('id', toolId);
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Failed to delete tool:', err);
    }
  };

  const handleDeleteRequiredTool = async (toolId: string) => {
    try {
      const { error } = await supabase.from('project_required_tools').delete().eq('id', toolId);
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Failed to delete required tool:', err);
    }
  };

  const getToolGapStatus = (toolName: string) => {
    const userTool = userTools.find((t) => t.name.toLowerCase() === toolName.toLowerCase());
    const requiredTool = requiredTools.find(
      (t) => t.name.toLowerCase() === toolName.toLowerCase()
    );

    if (!requiredTool) return null;
    if (!userTool) return requiredTool.is_essential ? 'missing-essential' : 'missing-optional';
    return 'available';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader size={32} className="text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading tools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Tools Matrix</h2>
        <p className="text-sm md:text-base text-gray-600 mt-1">
          Manage your available tools and define project requirements
        </p>
      </div>

      {/* Mobile: Single column stacked, Desktop: 2 columns side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Wrench size={20} className="text-orange-600" />
              <h3 className="text-base md:text-lg font-semibold text-gray-900">Your Tools</h3>
            </div>
            <button
              onClick={() => {
                setEditingTool(null);
                setShowAddToolModal(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm min-h-[44px]"
            >
              <Plus size={16} />
              Add Tool
            </button>
          </div>

          {userTools.length === 0 ? (
            <div className="text-center py-6 md:py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Wrench size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-600 text-sm mb-2">No tools added yet</p>
              <p className="text-gray-500 text-xs">
                Add tools you own to improve your feasibility score
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] md:max-h-96 overflow-y-auto">
              {userTools.map((tool) => (
                <div key={tool.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm md:text-base">{tool.name}</h4>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-gray-600">{tool.category}</span>
                        {tool.cost !== null && (
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            <DollarSign size={12} />
                            {tool.cost.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingTool(tool);
                          setShowAddToolModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-orange-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Edit tool"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteUserTool(tool.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Delete tool"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-red-600" />
              <h3 className="text-base md:text-lg font-semibold text-gray-900">Required for Project</h3>
            </div>
            <button
              onClick={() => {
                setEditingRequired(null);
                setShowAddRequiredModal(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm min-h-[44px]"
            >
              <Plus size={16} />
              Add Requirement
            </button>
          </div>

          {requiredTools.length === 0 ? (
            <div className="text-center py-6 md:py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-600 text-sm mb-2">No tool requirements defined</p>
              <p className="text-gray-500 text-xs">
                Define tools needed for this project
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] md:max-h-96 overflow-y-auto">
              {requiredTools.map((tool) => {
                const gapStatus = getToolGapStatus(tool.name);
                return (
                  <div
                    key={tool.id}
                    className={`p-3 rounded-lg border ${
                      gapStatus === 'missing-essential'
                        ? 'bg-red-50 border-red-200'
                        : gapStatus === 'missing-optional'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-green-50 border-green-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-gray-900 text-sm md:text-base">{tool.name}</h4>
                          {tool.is_essential && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium whitespace-nowrap">
                              Essential
                            </span>
                          )}
                          {gapStatus === 'missing-essential' && (
                            <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full font-medium whitespace-nowrap">
                              Critical
                            </span>
                          )}
                          {gapStatus === 'missing-optional' && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium whitespace-nowrap">
                              Missing
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-gray-600">{tool.category}</span>
                          {tool.estimated_cost !== null && (
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              <DollarSign size={12} />
                              {tool.estimated_cost.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditingRequired(tool);
                            setShowAddRequiredModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label="Edit requirement"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRequiredTool(tool.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label="Delete requirement"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showAddToolModal && (
        <AddToolModal
          tool={editingTool}
          onClose={() => {
            setShowAddToolModal(false);
            setEditingTool(null);
          }}
          onSave={loadData}
        />
      )}

      {showAddRequiredModal && (
        <AddRequiredToolModal
          masterProjectId={masterProjectId}
          tool={editingRequired}
          onClose={() => {
            setShowAddRequiredModal(false);
            setEditingRequired(null);
          }}
          onSave={loadData}
        />
      )}
    </div>
  );
}
