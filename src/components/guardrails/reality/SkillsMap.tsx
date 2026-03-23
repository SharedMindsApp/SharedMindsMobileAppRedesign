/**
 * Skills Map - Graph-Based Visualization
 * 
 * Upgrades the Skills Matrix to a graph-based "Skills Map" view.
 * Each skill is a node, contexts are orbits/layers around skills.
 * Connections show links to habits, goals, projects, etc.
 * 
 * Supports both Guardrails (strategic) and Planner (growth) modes.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Award, Plus, Pencil, Trash2, Loader, AlertCircle, Clock, Network, List, ZoomIn, ZoomOut, RotateCcw, Link2, Target, BookOpen, Calendar, FolderKanban, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import type { UserSkill, ProjectRequiredSkill } from '../../../lib/guardrailsTypes';
import {
  skillsService,
  skillContextsService,
  skillEntityLinksService,
  type SkillContext,
  type SkillEntityLink,
  type SkillContextType,
  type UserSkill as UserSkillType,
  PROFICIENCY_LABELS,
  CATEGORY_LABELS,
} from '../../../lib/skillsService';
import { AddSkillModal } from './AddSkillModal';
import { AddRequiredSkillModal } from './AddRequiredSkillModal';
import { SkillContextManager } from './SkillContextManager';
import { SkillLinkManager } from './SkillLinkManager';
import { SkillDetailModal } from '../../skills/SkillDetailModal';
import { skillPlanningService } from '../../../lib/skills/skillPlanningService';

interface SkillsMapProps {
  masterProjectId?: string; // Optional - if provided, shows Guardrails mode
  mode?: 'guardrails' | 'planner'; // Explicit mode override
}

interface SkillNode {
  skill: UserSkillType;
  contexts: SkillContext[];
  links: SkillEntityLink[];
  hasActivePlan: boolean;
  x: number;
  y: number;
  radius: number;
}

interface SkillConnection {
  fromSkillId: string;
  toEntityId: string;
  entityType: SkillEntityLink['entity_type'];
  entityName?: string;
}

const CONTEXT_COLORS: Record<SkillContextType, string> = {
  work: '#3B82F6', // Blue
  education: '#10B981', // Green
  hobby: '#8B5CF6', // Purple
  life: '#F59E0B', // Amber
  health: '#EF4444', // Red
  therapy: '#EC4899', // Pink
  parenting: '#06B6D4', // Cyan
  coaching: '#6366F1', // Indigo
  other: '#6B7280', // Gray
};

export function SkillsMap({ masterProjectId, mode: explicitMode }: SkillsMapProps) {
  const { user } = useAuth();
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<ProjectRequiredSkill[]>([]);
  const [skillContexts, setSkillContexts] = useState<Map<string, SkillContext[]>>(new Map());
  const [skillLinks, setSkillLinks] = useState<Map<string, SkillEntityLink[]>>(new Map());
  const [skillPlans, setSkillPlans] = useState<Map<string, boolean>>(new Map()); // skillId -> hasActivePlan
  const [loading, setLoading] = useState(true);
  // Mobile: Default to list view, Desktop: Default to map view
  const [viewMode, setViewMode] = useState<'list' | 'map'>(() => 
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'list' : 'map'
  );
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth < 768
  );
  const [selectedContextType, setSelectedContextType] = useState<SkillContextType | 'all'>('all');
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine mode
  const mode = explicitMode || (masterProjectId ? 'guardrails' : 'planner');

  // Load all data
  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load user skills
      const skills = await skillsService.getAll(user.id);
      setUserSkills(skills);

      // Load required skills if in Guardrails mode
      if (masterProjectId) {
        const { data, error } = await supabase
          .from('project_required_skills')
          .select('*')
          .eq('master_project_id', masterProjectId)
          .order('importance', { ascending: false });
        
        if (error) throw error;
        setRequiredSkills(data || []);
      }

      // Load contexts for all skills
      const contextsMap = new Map<string, SkillContext[]>();
      for (const skill of skills) {
        const contexts = await skillContextsService.getContextsForSkill(user.id, skill.id);
        contextsMap.set(skill.id, contexts);
      }
      setSkillContexts(contextsMap);

      // Load links for all skills
      const linksMap = new Map<string, SkillEntityLink[]>();
      for (const skill of skills) {
        const links = await skillEntityLinksService.getLinksForSkill(user.id, skill.id);
        linksMap.set(skill.id, links);
      }
      setSkillLinks(linksMap);

      // Load planning data for all skills
      const plansMap = new Map<string, boolean>();
      for (const skill of skills) {
        const plans = await skillPlanningService.getPlansForSkill(user.id, skill.id);
        plansMap.set(skill.id, plans.length > 0);
      }
      setSkillPlans(plansMap);
    } catch (err) {
      console.error('Failed to load skills data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, masterProjectId]);

  // Calculate node positions for graph view
  const skillNodes = useMemo(() => {
    if (viewMode !== 'map') return [];

    const nodes: SkillNode[] = [];
    
    // Get filtered skills based on context filter
    const filteredSkills = userSkills.filter(skill => {
      if (selectedContextType === 'all') return true;
      const contexts = skillContexts.get(skill.id) || [];
      return contexts.some(ctx => ctx.context_type === selectedContextType);
    });

    if (filteredSkills.length === 0) return [];

    // Better layout algorithm - use a force-directed-like approach with better spacing
    const centerX = 500;
    const centerY = 400;
    const baseRadius = 50;
    const minDistance = 200; // Minimum distance between nodes
    
    // Calculate positions with better distribution
    filteredSkills.forEach((skill, index) => {
      const totalSkills = filteredSkills.length;
      const angle = (index / totalSkills) * 2 * Math.PI;
      
      // Vary distance based on proficiency and link count for visual interest
      const links = skillLinks.get(skill.id) || [];
      const linkCount = links.length;
      const proficiencyFactor = skill.proficiency / 5;
      const linkFactor = Math.min(linkCount / 10, 1);
      
      // Distance varies from 120 to 250 based on activity
      const baseDistance = 120;
      const maxDistance = 250;
      const distance = baseDistance + (proficiencyFactor * 80) + (linkFactor * 50);
      
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      const contexts = skillContexts.get(skill.id) || [];
      
      // Filter by selected context type
      const filteredContexts = selectedContextType === 'all' 
        ? contexts 
        : contexts.filter(ctx => ctx.context_type === selectedContextType);

      // Radius based on proficiency and activity
      const radius = baseRadius + (proficiencyFactor * 15) + (linkCount * 2);

      nodes.push({
        skill,
        contexts: filteredContexts,
        links,
        hasActivePlan: skillPlans.get(skill.id) || false,
        x,
        y,
        radius: Math.min(radius, 80), // Cap max radius
      });
    });

    return nodes;
  }, [userSkills, skillContexts, skillLinks, skillPlans, viewMode, selectedContextType]);

  // Handle zoom
  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.5, Math.min(2, prev + delta)));
  };

  // Handle pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset view
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getSkillGapStatus = (skillName: string) => {
    if (mode !== 'guardrails') return null;
    const userSkill = userSkills.find((s) => s.name.toLowerCase() === skillName.toLowerCase());
    const requiredSkill = requiredSkills.find(
      (s) => s.name.toLowerCase() === skillName.toLowerCase()
    );

    if (!requiredSkill) return null;
    if (!userSkill) return 'missing';
    if (userSkill.proficiency < requiredSkill.importance) return 'insufficient';
    return 'sufficient';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader size={32} className="text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading skills map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Skills {viewMode === 'map' ? 'Map' : 'Matrix'}</h2>
            <p className="text-gray-600 mt-1">
              {mode === 'guardrails' 
                ? 'Strategic capability assessment and gap analysis'
                : 'Personal growth tracking and skill development'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List size={16} className="inline mr-1" />
                List
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'map'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Network size={16} className="inline mr-1" />
                Map
              </button>
            </div>

            {/* Context Filter (Map View Only) */}
            {viewMode === 'map' && (
              <select
                value={selectedContextType}
                onChange={(e) => setSelectedContextType(e.target.value as SkillContextType | 'all')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Contexts</option>
                <option value="work">Work</option>
                <option value="education">Education</option>
                <option value="hobby">Hobby</option>
                <option value="life">Life</option>
                <option value="health">Health</option>
                <option value="therapy">Therapy</option>
                <option value="parenting">Parenting</option>
                <option value="coaching">Coaching</option>
                <option value="other">Other</option>
              </select>
            )}

            {/* Add Skill Button */}
            {mode === 'guardrails' && masterProjectId && (
              <button
                onClick={() => {
                  // TODO: Open add skill modal
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus size={16} />
                Add Skill
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' ? (
        <div className="flex-1 relative border border-gray-200 rounded-xl bg-gray-50 overflow-hidden min-h-[600px]">
          {/* Orientation Layer */}
          <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-md p-4 max-w-sm border border-gray-200">
            <p className="text-sm text-gray-700 mb-3">
              This map shows how your skills connect across different parts of your life.
            </p>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• <strong>Nodes</strong> represent skills</p>
              <p>• <strong>Rings</strong> show contexts (work, life, etc.)</p>
              <p>• <strong>Connections</strong> link to habits, goals, and projects</p>
            </div>
          </div>

          {/* Empty State */}
          {skillNodes.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md">
                <Network size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No skills to display</h3>
                <p className="text-sm text-gray-600 mb-6">
                  {selectedContextType !== 'all' 
                    ? `No skills found for "${selectedContextType}" context. Try selecting "All Contexts" or add skills with this context.`
                    : 'Add skills to see them visualized on the map. Each skill appears as a node, with rings showing the contexts where it appears.'}
                </p>
                
                {/* Example Node Visualization */}
                {selectedContextType === 'all' && (
                  <div className="mt-8 flex items-center justify-center">
                    <div className="relative">
                      <svg width="120" height="120" className="opacity-30">
                        <circle cx="60" cy="60" r="25" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2" />
                        <circle cx="60" cy="60" r="35" fill="none" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
                        <circle cx="60" cy="60" r="45" fill="none" stroke="#10B981" strokeWidth="2" opacity="0.5" />
                        <text x="60" y="95" textAnchor="middle" className="text-xs fill-gray-500">Skill</text>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white rounded-lg shadow-lg p-2 border border-gray-200">
            <button
              onClick={() => handleZoom(0.1)}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={18} className="text-gray-700" />
            </button>
            <button
              onClick={() => handleZoom(-0.1)}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={18} className="text-gray-700" />
            </button>
            <div className="border-t border-gray-200 my-1"></div>
            <button
              onClick={handleResetView}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="Reset View"
            >
              <RotateCcw size={18} className="text-gray-700" />
            </button>
          </div>

          {/* SVG Canvas */}
          <svg
            ref={svgRef}
            className="w-full h-full cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            viewBox="0 0 1000 800"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Background Grid Pattern */}
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.5"/>
              </pattern>
              
              {/* Drop shadow filter for nodes */}
              <filter id="nodeShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                <feOffset dx="0" dy="2" result="offsetblur"/>
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.3"/>
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* Gradient for active nodes */}
              <radialGradient id="nodeGradient">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
              </radialGradient>
            </defs>
            
            <g transform={`translate(${pan.x + 500}, ${pan.y + 400}) scale(${zoom})`}>
              {/* Background Grid */}
              <rect x="-500" y="-400" width="1000" height="800" fill="url(#grid)" />

              {/* Connections (links to entities) */}
              {skillNodes.map(node => (
                <g key={node.skill.id}>
                  {node.links.map((link, linkIndex) => {
                    // For now, just show link count - full entity rendering would require fetching entity data
                    return null; // TODO: Render connection lines to linked entities
                  })}
                </g>
              ))}

              {/* Skill Nodes */}
              {skillNodes.map(node => {
                const gapStatus = getSkillGapStatus(node.skill.name);
                const isSelected = selectedSkill === node.skill.id;
                const linkCount = node.links.length;
                const contextCount = node.contexts.length;
                
                // Calculate ring positions
                const maxOrbitRadius = node.radius + 15 + (contextCount * 12);
                const densityRingRadius = maxOrbitRadius + 8;
                const planningHaloRadius = densityRingRadius + 10;
                const densityIntensity = Math.min(linkCount / 10, 1);
                
                // Node fill color based on mode and status
                let nodeFill = '#FFFFFF';
                if (mode === 'guardrails') {
                  nodeFill = gapStatus === 'missing' 
                    ? '#FEE2E2' 
                    : gapStatus === 'insufficient'
                    ? '#FEF3C7'
                    : '#D1FAE5';
                } else {
                  // Planner mode - use proficiency-based gradient
                  const proficiencyLevel = node.skill.proficiency / 5;
                  nodeFill = `rgba(59, 130, 246, ${0.1 + proficiencyLevel * 0.2})`;
                }
                
                // Build tooltip text
                const tooltipParts = [
                  node.skill.name,
                  `Proficiency: ${PROFICIENCY_LABELS[node.skill.proficiency as keyof typeof PROFICIENCY_LABELS]}`,
                ];
                if (contextCount > 0) {
                  tooltipParts.push(`${contextCount} context${contextCount !== 1 ? 's' : ''}`);
                }
                if (linkCount > 0) {
                  tooltipParts.push(`Connected to ${linkCount} ${linkCount === 1 ? 'entity' : 'entities'}`);
                }
                if (node.hasActivePlan) {
                  tooltipParts.push('Has active planning note');
                }
                const tooltipText = tooltipParts.join('\n');
                
                return (
                  <g key={node.skill.id} filter="url(#nodeShadow)">
                    {/* Planning Halo (outermost, subtle indicator) */}
                    {node.hasActivePlan && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={planningHaloRadius}
                        fill="none"
                        stroke="#8B5CF6"
                        strokeWidth="2"
                        strokeDasharray="4,4"
                        opacity={0.5}
                        className="cursor-pointer"
                        onClick={() => setSelectedSkill(node.skill.id)}
                      >
                        <title>This skill has an active planning note</title>
                      </circle>
                    )}

                    {/* Connection Density Ring */}
                    {linkCount > 0 && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={densityRingRadius}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2.5"
                        opacity={0.2 + (densityIntensity * 0.5)}
                        className="cursor-pointer"
                        onClick={() => setSelectedSkill(node.skill.id)}
                      >
                        <title>Connected to {linkCount} {linkCount === 1 ? 'entity' : 'entities'}</title>
                      </circle>
                    )}

                    {/* Context Orbits with Intensity Shading */}
                    {node.contexts.map((context, ctxIndex) => {
                      const orbitRadius = node.radius + 15 + (ctxIndex * 12);
                      const orbitColor = CONTEXT_COLORS[context.context_type];
                      const intensity = context.status === 'active' ? 0.8 : context.status === 'background' ? 0.5 : 0.3;
                      
                      return (
                        <circle
                          key={context.id}
                          cx={node.x}
                          cy={node.y}
                          r={orbitRadius}
                          fill="none"
                          stroke={orbitColor}
                          strokeWidth="2.5"
                          strokeDasharray={context.status === 'paused' ? '6,6' : 'none'}
                          opacity={intensity}
                          className="cursor-pointer"
                          onClick={() => setSelectedSkill(node.skill.id)}
                        >
                          <title>{context.context_type} context - {context.status}</title>
                        </circle>
                      );
                    })}

                    {/* Skill Node */}
                    <g
                      onClick={() => setSelectedSkill(node.skill.id)}
                      className="cursor-pointer"
                    >
                      {/* Main Node Circle */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.radius}
                        fill={nodeFill}
                        stroke={isSelected ? '#3B82F6' : '#6B7280'}
                        strokeWidth={isSelected ? 4 : 2.5}
                        className="hover:stroke-blue-500 transition-all"
                      >
                        <title>{tooltipText}</title>
                      </circle>
                      
                      {/* Inner gradient overlay for depth */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.radius - 2}
                        fill="url(#nodeGradient)"
                        opacity="0.3"
                      />
                      
                      {/* Proficiency Ring Indicator */}
                      {node.skill.proficiency > 0 && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={node.radius - 6}
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="4"
                          strokeDasharray={`${(node.skill.proficiency / 5) * 2 * Math.PI * (node.radius - 6)} ${2 * Math.PI * (node.radius - 6)}`}
                          transform={`rotate(-90 ${node.x} ${node.y})`}
                          opacity="0.8"
                        />
                      )}

                      {/* Skill Name */}
                      <text
                        x={node.x}
                        y={node.y - node.radius - 12}
                        textAnchor="middle"
                        className="text-sm font-bold fill-gray-900 pointer-events-none"
                        style={{ fontSize: '13px' }}
                      >
                        {node.skill.name.length > 15 
                          ? node.skill.name.substring(0, 15) + '...'
                          : node.skill.name}
                      </text>

                      {/* Proficiency Label */}
                      <text
                        x={node.x}
                        y={node.y + 6}
                        textAnchor="middle"
                        className="text-xs fill-gray-700 pointer-events-none font-medium"
                        style={{ fontSize: '11px' }}
                      >
                        {PROFICIENCY_LABELS[node.skill.proficiency as keyof typeof PROFICIENCY_LABELS]}
                      </text>

                      {/* Link Count Badge */}
                      {linkCount > 0 && (
                        <g>
                          <circle
                            cx={node.x + node.radius - 10}
                            cy={node.y - node.radius + 10}
                            r="12"
                            fill="#3B82F6"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            className="pointer-events-none"
                          />
                          <text
                            x={node.x + node.radius - 10}
                            y={node.y - node.radius + 15}
                            textAnchor="middle"
                            className="text-xs font-bold fill-white pointer-events-none"
                            style={{ fontSize: '10px' }}
                          >
                            {linkCount > 9 ? '9+' : linkCount}
                          </text>
                        </g>
                      )}

                      {/* Planning Indicator (small dot) */}
                      {node.hasActivePlan && (
                        <circle
                          cx={node.x - node.radius + 10}
                          cy={node.y - node.radius + 10}
                          r="6"
                          fill="#8B5CF6"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                          className="pointer-events-none"
                        >
                          <title>Active planning note</title>
                        </circle>
                      )}
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Context Types</h3>
            <div className="space-y-2">
              {Object.entries(CONTEXT_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-200" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-gray-700 capitalize font-medium">{type}</span>
                </div>
              ))}
            </div>
            
            {/* Additional Legend Info */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-blue-500 border-dashed opacity-50"></div>
                  <span className="text-gray-600">Planning note active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600">Connected entities</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-blue-500"></div>
                  <span className="text-gray-600">Proficiency ring</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* List View (Existing Skills Matrix) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Your Skills</h3>
              </div>
            </div>

            {userSkills.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Award size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-600 text-sm mb-2">No skills added yet</p>
                <p className="text-gray-500 text-xs">
                  Start by listing what you're good at
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {userSkills.map((skill) => {
                  const gapStatus = getSkillGapStatus(skill.name);
                  const contexts = skillContexts.get(skill.id) || [];
                  const links = skillLinks.get(skill.id) || [];
                  
                  return (
                    <div
                      key={skill.id}
                      className={`p-3 rounded-lg border ${
                        gapStatus === 'insufficient'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{skill.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-600">
                              Proficiency: {skill.proficiency}/5
                            </span>
                            {contexts.length > 0 && (
                              <span className="text-xs text-gray-500">
                                • {contexts.length} context{contexts.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {links.length > 0 && (
                              <span className="text-xs text-blue-600">
                                • {links.length} link{links.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {mode === 'guardrails' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle size={20} className="text-purple-600" />
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">Required for Project</h3>
                </div>
              </div>

              {requiredSkills.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertCircle size={24} className="text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-sm mb-2">No skill requirements defined</p>
                  <p className="text-gray-500 text-xs">
                    Define skills needed for this project
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {requiredSkills.map((skill) => {
                    const gapStatus = getSkillGapStatus(skill.name);
                    return (
                      <div
                        key={skill.id}
                        className={`p-3 rounded-lg border ${
                          gapStatus === 'missing'
                            ? 'bg-red-50 border-red-200'
                            : gapStatus === 'insufficient'
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-green-50 border-green-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">{skill.name}</h4>
                              {gapStatus === 'missing' && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                  Missing
                                </span>
                              )}
                              {gapStatus === 'insufficient' && (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                                  Needs Improvement
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-600">
                                Importance: {skill.importance}/5
                              </span>
                              {skill.estimated_learning_hours > 0 && (
                                <span className="flex items-center gap-1 text-xs text-gray-600">
                                  <Clock size={12} />
                                  {skill.estimated_learning_hours}h
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Connections Panel (when skill is selected in map view) */}
      {selectedSkill && viewMode === 'map' && (() => {
        const selectedNode = skillNodes.find(n => n.skill.id === selectedSkill);
        if (!selectedNode) return null;
        
        const linksByType = {
          habit: selectedNode.links.filter(l => l.entity_type === 'habit'),
          goal: selectedNode.links.filter(l => l.entity_type === 'goal'),
          project: selectedNode.links.filter(l => l.entity_type === 'project'),
          trip: selectedNode.links.filter(l => l.entity_type === 'trip'),
          calendar_event: selectedNode.links.filter(l => l.entity_type === 'calendar_event'),
          other: selectedNode.links.filter(l => !['habit', 'goal', 'project', 'trip', 'calendar_event'].includes(l.entity_type)),
        };

        return (
          <div className="absolute right-4 top-4 bottom-4 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col z-20">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Connections</h3>
                <button
                  onClick={() => setSelectedSkill(null)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <X size={18} className="text-gray-600" />
                </button>
              </div>
              <p className="text-sm text-gray-600">{selectedNode.skill.name}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedNode.links.length === 0 ? (
                <div className="text-center py-8">
                  <Link2 size={32} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-1">No connections</p>
                  <p className="text-xs text-gray-400">
                    This skill is not yet linked to habits, goals, or projects.
                  </p>
                </div>
              ) : (
                <>
                  {linksByType.habit.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Target size={16} className="text-green-600" />
                        Habits ({linksByType.habit.length})
                      </h4>
                      <div className="space-y-2">
                        {linksByType.habit.map(link => (
                          <div key={link.id} className="p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                            <div className="font-medium text-gray-900">Habit</div>
                            {link.link_notes && (
                              <div className="text-xs text-gray-600 mt-1">{link.link_notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {linksByType.goal.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <BookOpen size={16} className="text-blue-600" />
                        Goals ({linksByType.goal.length})
                      </h4>
                      <div className="space-y-2">
                        {linksByType.goal.map(link => (
                          <div key={link.id} className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                            <div className="font-medium text-gray-900">Goal</div>
                            {link.link_notes && (
                              <div className="text-xs text-gray-600 mt-1">{link.link_notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {linksByType.project.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <FolderKanban size={16} className="text-purple-600" />
                        Projects ({linksByType.project.length})
                      </h4>
                      <div className="space-y-2">
                        {linksByType.project.map(link => (
                          <div key={link.id} className="p-2 bg-purple-50 border border-purple-200 rounded-lg text-sm">
                            <div className="font-medium text-gray-900">Project</div>
                            {link.link_notes && (
                              <div className="text-xs text-gray-600 mt-1">{link.link_notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {linksByType.trip.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Calendar size={16} className="text-orange-600" />
                        Trips ({linksByType.trip.length})
                      </h4>
                      <div className="space-y-2">
                        {linksByType.trip.map(link => (
                          <div key={link.id} className="p-2 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                            <div className="font-medium text-gray-900">Trip</div>
                            {link.link_notes && (
                              <div className="text-xs text-gray-600 mt-1">{link.link_notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {linksByType.calendar_event.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Calendar size={16} className="text-amber-600" />
                        Calendar Events ({linksByType.calendar_event.length})
                      </h4>
                      <div className="space-y-2">
                        {linksByType.calendar_event.map(link => (
                          <div key={link.id} className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                            <div className="font-medium text-gray-900">Calendar Event</div>
                            {link.link_notes && (
                              <div className="text-xs text-gray-600 mt-1">{link.link_notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDetailModal(true);
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                View Full Details
              </button>
            </div>
          </div>
        );
      })()}

      {/* Skill Detail Modal */}
      {selectedSkill && (showDetailModal || viewMode !== 'map') && (
        <SkillDetailModal
          isOpen={true}
          onClose={() => {
            setSelectedSkill(null);
            setShowDetailModal(false);
          }}
          skillId={selectedSkill}
          mode={mode}
          permissions={{ can_view: true, can_edit: true, can_manage: true }}
        />
      )}
    </div>
  );
}


