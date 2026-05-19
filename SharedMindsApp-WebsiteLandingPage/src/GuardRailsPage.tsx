import { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, Zap, Calendar, Target, GitBranch, Circle, ArrowRight, Clock, CheckCircle2, Sparkles, Network, Map, Layers, X, ChevronDown, ChevronRight, Mail, Home, Instagram, Linkedin } from 'lucide-react';
import { MindMeshDemo, RoadmapDemo, TaskFlowDemo, SideProjectsDemo, OffshootIdeasDemo, FocusModeDemo } from './FeatureDemos';
import WaitlistForm from './WaitlistForm';
import SharedMindsLogo from './assets/shared_minds_logo_2.svg';

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  icon: any;
  color: string;
  connections: string[];
}

interface Connection {
  from: string;
  to: string;
}

interface Feature {
  icon: any;
  iconBg: string;
  iconColor: string;
  name: string;
  headline: string;
  description: string;
  ecosystem: string;
  demo: () => JSX.Element;
}

const features: Feature[] = [
  {
    icon: Network,
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
    name: 'Mind Mesh',
    headline: 'Ideas form relationships before they become tasks',
    description: 'Mind Mesh lets thoughts connect naturally in a visual space. New nodes appear and link to existing ideas, creating a living map of your thinking. Structure emerges organically - nothing is forced into lists too early.',
    ecosystem: 'Feeds direction to Roadmap, informs Task Flow priorities',
    demo: MindMeshDemo
  },
  {
    icon: Map,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    name: 'Roadmap',
    headline: 'Plans shift as priorities change',
    description: 'Roadmap shows intention over time without locking you in. Blocks move and resize as your thinking evolves. The system stays oriented to where you\'re heading while accepting that the future isn\'t fixed.',
    ecosystem: 'Pulls themes from Mind Mesh, shapes daily Task Flow',
    demo: RoadmapDemo
  },
  {
    icon: ArrowRight,
    iconBg: 'bg-teal-500/10',
    iconColor: 'text-teal-400',
    name: 'Task Flow',
    headline: 'Only what matters now surfaces',
    description: 'Task Flow filters based on context and capacity. As your focus shifts, relevant items appear while others fade. The system presents what you can handle, not everything you could do.',
    ecosystem: 'Shaped by Roadmap, regulated by Focus Mode',
    demo: TaskFlowDemo
  },
  {
    icon: Layers,
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
    name: 'Side Projects',
    headline: 'Parallel interests stay contained',
    description: 'Side Projects hold secondary focuses without interference. As attention shifts between containers, each maintains its own context. Curiosity is preserved, but the main path stays clear.',
    ecosystem: 'Links to Mind Mesh, can feed back into Roadmap',
    demo: SideProjectsDemo
  },
  {
    icon: Sparkles,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    name: 'Offshoot Ideas',
    headline: 'Good ideas get captured, then parked',
    description: 'Mid-task tangents are instantly saved and moved aside. The system holds them until focus can safely shift. Creativity isn\'t suppressed - it\'s just reintroduced at the right moment.',
    ecosystem: 'Returns to Mind Mesh, can seed Side Projects',
    demo: OffshootIdeasDemo
  },
  {
    icon: Target,
    iconBg: 'bg-teal-500/10',
    iconColor: 'text-teal-400',
    name: 'Focus Mode',
    headline: 'Boundaries adapt to your state',
    description: 'Focus Mode creates temporary protective space around your attention. The boundary forms and dissolves based on energy and clarity. No streaks, no punishment - just compassionate structure when you need it.',
    ecosystem: 'Regulates Task Flow pacing, informs Regulation',
    demo: FocusModeDemo
  }
];

export default function GuardRailsPage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodes, setNodes] = useState<Node[]>([
    { id: '1', x: 20, y: 30, label: 'Mind Mesh', icon: Network, color: 'cyan', connections: ['2', '3'] },
    { id: '2', x: 40, y: 15, label: 'Roadmap', icon: Map, color: 'blue', connections: ['4'] },
    { id: '3', x: 45, y: 55, label: 'Side Projects', icon: Layers, color: 'cyan', connections: ['5'] },
    { id: '4', x: 65, y: 25, label: 'Task Flow', icon: ArrowRight, color: 'teal', connections: ['6'] },
    { id: '5', x: 70, y: 65, label: 'Offshoot Ideas', icon: Sparkles, color: 'blue', connections: ['6'] },
    { id: '6', x: 85, y: 45, label: 'Focus Mode', icon: Target, color: 'teal', connections: [] },
  ]);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [collapsedTracks, setCollapsedTracks] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const waitlistRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const draggedElementRef = useRef<HTMLDivElement | null>(null);
  const currentDragPos = useRef<{ x: number; y: number } | null>(null);

  const scrollToWaitlist = () => {
    waitlistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const nodeDescriptions: Record<string, { headline: string; description: string; ecosystem: string }> = {
    'Mind Mesh': {
      headline: 'Ideas form relationships before they become tasks',
      description: 'Mind Mesh lets thoughts connect naturally in a visual space. New nodes appear and link to existing ideas, creating a living map of your thinking. Structure emerges organically - nothing is forced into lists too early.',
      ecosystem: 'Feeds direction to Roadmap, informs Task Flow priorities'
    },
    'Roadmap': {
      headline: 'Plans shift as priorities change',
      description: 'Roadmap shows intention over time without locking you in. Blocks move and resize as your thinking evolves. The system stays oriented to where you\'re heading while accepting that the future isn\'t fixed.',
      ecosystem: 'Pulls themes from Mind Mesh, shapes daily Task Flow'
    },
    'Side Projects': {
      headline: 'Parallel interests stay contained',
      description: 'Side Projects hold secondary focuses without interference. As attention shifts between containers, each maintains its own context. Curiosity is preserved, but the main path stays clear.',
      ecosystem: 'Links to Mind Mesh, can feed back into Roadmap'
    },
    'Task Flow': {
      headline: 'Only what matters now surfaces',
      description: 'Task Flow filters based on context and capacity. As your focus shifts, relevant items appear while others fade. The system presents what you can handle, not everything you could do.',
      ecosystem: 'Shaped by Roadmap, regulated by Focus Mode'
    },
    'Offshoot Ideas': {
      headline: 'Good ideas get captured, then parked',
      description: 'Mid-task tangents are instantly saved and moved aside. The system holds them until focus can safely shift. Creativity isn\'t suppressed - it\'s just reintroduced at the right moment.',
      ecosystem: 'Returns to Mind Mesh, can seed Side Projects'
    },
    'Focus Mode': {
      headline: 'Boundaries adapt to your state',
      description: 'Focus Mode creates temporary protective space around your attention. The boundary forms and dissolves based on energy and clarity. No streaks, no punishment - just compassionate structure when you need it.',
      ecosystem: 'Regulates Task Flow pacing, informs Regulation'
    }
  };

  const toggleTrack = (trackId: string) => {
    setCollapsedTracks(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      if (pageRef.current) {
        const scrollTop = pageRef.current.scrollTop;
        const scrollHeight = pageRef.current.scrollHeight - pageRef.current.clientHeight;
        const progress = Math.min(scrollTop / scrollHeight, 1);
        setScrollProgress(progress);
      }
    };

    const page = pageRef.current;
    if (page) {
      page.addEventListener('scroll', handleScroll);
      return () => page.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleNodeDragStart = useCallback((e: React.MouseEvent, nodeId: string, element: HTMLDivElement) => {
    if (scrollProgress > 0.15) return;
    setDraggedNode(nodeId);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    draggedElementRef.current = element;

    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      currentDragPos.current = { x: node.x, y: node.y };
    }

    e.preventDefault();
  }, [scrollProgress, nodes]);

  const handleNodeDrag = useCallback((e: MouseEvent) => {
    if (!draggedNode || !containerRef.current || !draggedElementRef.current || scrollProgress > 0.15) return;

    requestAnimationFrame(() => {
      if (!containerRef.current || !draggedElementRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));

      currentDragPos.current = { x, y };

      draggedElementRef.current.style.left = `${x}%`;
      draggedElementRef.current.style.top = `${y}%`;
    });
  }, [draggedNode, scrollProgress]);

  const handleNodeDragEnd = useCallback((e: MouseEvent) => {
    if (dragStartPos.current && draggedNode) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - dragStartPos.current.x, 2) +
        Math.pow(e.clientY - dragStartPos.current.y, 2)
      );
      if (distance < 5) {
        const node = nodes.find(n => n.id === draggedNode);
        if (node) {
          setSelectedNode(node);
        }
      }

      const finalPos = currentDragPos.current;
      if (finalPos) {
        setNodes(prev => prev.map(node =>
          node.id === draggedNode
            ? { ...node, x: finalPos.x, y: finalPos.y }
            : node
        ));
      }
    }
    setDraggedNode(null);
    dragStartPos.current = null;
    draggedElementRef.current = null;
    currentDragPos.current = null;
  }, [draggedNode, nodes]);

  const handleNodeDoubleClick = useCallback((node: Node) => {
    setSelectedNode(node);
  }, []);

  useEffect(() => {
    if (draggedNode) {
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      window.addEventListener('mousemove', handleNodeDrag);
      window.addEventListener('mouseup', handleNodeDragEnd);
      return () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', handleNodeDrag);
        window.removeEventListener('mouseup', handleNodeDragEnd);
      };
    }
  }, [draggedNode, handleNodeDrag, handleNodeDragEnd]);

  const phase1 = scrollProgress < 0.28;
  const phase2 = scrollProgress >= 0.28 && scrollProgress < 0.56;
  const phase3 = scrollProgress >= 0.56;

  const transitionProgress1to2 = Math.max(0, Math.min(1, (scrollProgress - 0.24) / 0.08));
  const transitionProgress2to3 = Math.max(0, Math.min(1, (scrollProgress - 0.52) / 0.08));

  const sortedNodes = [...nodes].sort((a, b) => {
    const aX = a.x + a.y * 0.3;
    const bX = b.x + b.y * 0.3;
    return aX - bX;
  });

  return (
    <div
      ref={pageRef}
      className="h-screen overflow-y-scroll snap-y snap-mandatory bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#22d3ee #0f172a' }}
    >
      <div className="min-h-[1400vh] relative">
        <div className="sticky top-0 h-screen flex flex-col">
          <header className="relative z-50 px-4 sm:px-8 py-4 sm:py-6 flex justify-between items-center bg-gradient-to-b from-slate-950/90 to-transparent backdrop-blur-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={SharedMindsLogo} alt="SharedMinds Logo" className="w-8 h-8 sm:w-10 sm:h-10" />
              <h1 className="text-lg sm:text-2xl font-bold text-white">SharedMinds</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <a
                href="/"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-300 hover:text-white transition-colors duration-200 rounded-lg hover:bg-slate-800/50"
              >
                <Home className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Home</span>
              </a>
              <div className="text-xs sm:text-sm text-slate-400 hidden md:block">
                Scroll to explore
              </div>
            </div>
          </header>

          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.1),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.08),transparent_40%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(20,184,166,0.08),transparent_40%)]" />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
              <img
                src={SharedMindsLogo}
                alt=""
                className="absolute w-[50vw] sm:w-[40vw] h-auto"
                style={{
                  opacity: 0.1,
                  filter: 'drop-shadow(0 0 60px rgba(34, 211, 238, 0.4)) drop-shadow(0 0 120px rgba(34, 211, 238, 0.3))',
                }}
              />
              <div
                className="text-[25vw] sm:text-[20vw] font-black text-white/5 tracking-tighter leading-none relative z-10"
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  WebkitTextStroke: '1px rgba(34, 211, 238, 0.1)',
                  textShadow: '0 0 80px rgba(34, 211, 238, 0.15)'
                }}
              >
                GuardRails
              </div>
            </div>

            <div
              ref={containerRef}
              className="absolute inset-0 flex items-center justify-center p-4 sm:p-8"
            >
              <div className="relative w-full max-w-7xl h-full">
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{
                    opacity: phase1 ? 1 - transitionProgress1to2 : 0,
                    transition: 'opacity 0.8s ease-out'
                  }}
                >
                  {nodes.map(node =>
                    node.connections.map(targetId => {
                      const target = nodes.find(n => n.id === targetId);
                      if (!target) return null;
                      return (
                        <line
                          key={`${node.id}-${targetId}`}
                          x1={`${node.x}%`}
                          y1={`${node.y}%`}
                          x2={`${target.x}%`}
                          y2={`${target.y}%`}
                          stroke="url(#lineGradient)"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          opacity="0.4"
                          className="animate-pulse"
                          style={{ animationDuration: '3s' }}
                        />
                      );
                    })
                  )}
                  <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                </svg>

                {phase1 && (
                  <div
                    className="absolute inset-0 transition-opacity duration-1000"
                    style={{ opacity: 1 - transitionProgress1to2 }}
                  >
                    {nodes.map((node) => {
                      const Icon = node.icon;
                      const colorMap: Record<string, string> = {
                        cyan: 'from-cyan-400 to-cyan-600',
                        blue: 'from-blue-400 to-blue-600',
                        teal: 'from-teal-400 to-teal-600'
                      };

                      return (
                        <div
                          key={node.id}
                          className={`absolute group ${draggedNode === node.id ? 'cursor-grabbing' : 'cursor-grab'}`}
                          style={{
                            left: `${node.x}%`,
                            top: `${node.y}%`,
                            transform: 'translate(-50%, -50%)',
                            transition: draggedNode === node.id ? 'none' : 'all 500ms',
                            animation: draggedNode === node.id ? 'none' : `float-${node.id} 6s ease-in-out infinite`,
                            willChange: draggedNode === node.id ? 'left, top' : 'auto',
                            userSelect: 'none'
                          }}
                          onMouseDown={(e) => handleNodeDragStart(e, node.id, e.currentTarget)}
                          onDoubleClick={() => handleNodeDoubleClick(node)}
                        >
                          <div className={`relative bg-gradient-to-br ${colorMap[node.color]} p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xl backdrop-blur-sm border border-white/20 hover:scale-110 hover:shadow-[0_20px_50px_rgba(34,211,238,0.4)] transition-all duration-300`}>
                            <div className="absolute inset-0 bg-white/10 rounded-xl sm:rounded-2xl blur-xl group-hover:bg-white/20 transition-all duration-300" />
                            <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white relative z-10 group-hover:scale-110 transition-transform duration-300" />
                            <div className="absolute -bottom-6 sm:-bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs sm:text-sm font-medium text-white/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              {node.label}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(phase2 || transitionProgress1to2 > 0) && transitionProgress2to3 < 0.1 && (
                  <div
                    className="absolute inset-0 flex items-center justify-center px-4 sm:px-8 py-8 sm:py-12 overflow-x-auto"
                    style={{
                      opacity: phase2 ? (1 - transitionProgress2to3) * Math.min(1, transitionProgress1to2) : transitionProgress1to2,
                      transition: 'opacity 0.8s ease-out'
                    }}
                  >
                    <div className="w-full max-w-7xl min-w-[800px] sm:min-w-0">
                      <div className="mb-6 sm:mb-8">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Task Flow</h2>
                        <p className="text-sm sm:text-base text-slate-400">Your work, organized naturally</p>
                      </div>

                      <div className="grid grid-cols-4 gap-3 sm:gap-4">
                        <div
                          className="transition-all duration-700"
                          style={{
                            opacity: transitionProgress1to2,
                            transform: `translateY(${(1 - transitionProgress1to2) * 30}px)`,
                            transitionDelay: '0.1s'
                          }}
                        >
                          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-700/50">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                              <h3 className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wider">Backlog</h3>
                              <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 sm:py-1 rounded-full">3</span>
                            </div>
                            <div className="space-y-2 sm:space-y-3">
                              <div className="bg-slate-900/60 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-700/30 hover:border-cyan-400/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/20 cursor-pointer group">
                                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                                    <Network className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-xs sm:text-sm font-medium text-white mb-0.5 sm:mb-1">Mind Mesh Setup</h4>
                                    <p className="text-[10px] sm:text-xs text-slate-400">Connect your thought spaces</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Setup</span>
                                  <span className="text-[10px] sm:text-xs text-slate-500">2h</span>
                                </div>
                              </div>

                              <div className="bg-slate-900/60 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-700/30 hover:border-blue-400/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20 cursor-pointer group">
                                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                                    <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-xs sm:text-sm font-medium text-white mb-0.5 sm:mb-1">Side Projects</h4>
                                    <p className="text-[10px] sm:text-xs text-slate-400">Track parallel work streams</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">Planning</span>
                                  <span className="text-[10px] sm:text-xs text-slate-500">1h</span>
                                </div>
                              </div>

                              <div className="bg-slate-900/60 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-700/30 hover:border-teal-400/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-teal-500/20 cursor-pointer group">
                                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-xs sm:text-sm font-medium text-white mb-0.5 sm:mb-1">Offshoot Ideas</h4>
                                    <p className="text-[10px] sm:text-xs text-slate-400">Capture spontaneous thoughts</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20">Brainstorm</span>
                                  <span className="text-[10px] sm:text-xs text-slate-500">30m</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div
                          className="transition-all duration-700"
                          style={{
                            opacity: transitionProgress1to2,
                            transform: `translateY(${(1 - transitionProgress1to2) * 30}px)`,
                            transitionDelay: '0.2s'
                          }}
                        >
                          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-700/50">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                              <h3 className="text-xs sm:text-sm font-semibold text-blue-300 uppercase tracking-wider">In Progress</h3>
                              <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 sm:py-1 rounded-full">2</span>
                            </div>
                            <div className="space-y-2 sm:space-y-3">
                              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-400/30 hover:border-blue-400/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20 cursor-pointer shadow-lg shadow-blue-500/5 group">
                                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                                    <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-xs sm:text-sm font-medium text-white mb-0.5 sm:mb-1">Roadmap Planning</h4>
                                    <p className="text-[10px] sm:text-xs text-slate-400">Q1 strategy alignment</p>
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] sm:text-xs text-slate-400">Progress</span>
                                    <span className="text-[10px] sm:text-xs text-blue-400">65%</span>
                                  </div>
                                  <div className="h-1 sm:h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" style={{ width: '65%' }} />
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">Active</span>
                                  <span className="text-[10px] sm:text-xs text-slate-500">4h left</span>
                                </div>
                              </div>

                              <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-cyan-400/30 hover:border-cyan-400/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/20 cursor-pointer shadow-lg shadow-cyan-500/5 group">
                                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-xs sm:text-sm font-medium text-white mb-0.5 sm:mb-1">Task Flow</h4>
                                    <p className="text-[10px] sm:text-xs text-slate-400">Build workflow engine</p>
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] sm:text-xs text-slate-400">Progress</span>
                                    <span className="text-[10px] sm:text-xs text-cyan-400">40%</span>
                                  </div>
                                  <div className="h-1 sm:h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full" style={{ width: '40%' }} />
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">Active</span>
                                  <span className="text-[10px] sm:text-xs text-slate-500">6h left</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div
                          className="transition-all duration-700"
                          style={{
                            opacity: transitionProgress1to2,
                            transform: `translateY(${(1 - transitionProgress1to2) * 30}px)`,
                            transitionDelay: '0.3s'
                          }}
                        >
                          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-700/50">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                              <h3 className="text-xs sm:text-sm font-semibold text-amber-300 uppercase tracking-wider">Review</h3>
                              <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 sm:py-1 rounded-full">1</span>
                            </div>
                            <div className="space-y-2 sm:space-y-3">
                              <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-amber-400/30 hover:border-amber-400/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-amber-500/20 cursor-pointer shadow-lg shadow-amber-500/5 group">
                                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                                    <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-xs sm:text-sm font-medium text-white mb-0.5 sm:mb-1">Focus Mode</h4>
                                    <p className="text-[10px] sm:text-xs text-slate-400">Polish distraction filter</p>
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] sm:text-xs text-slate-400">Testing</span>
                                    <span className="text-[10px] sm:text-xs text-amber-400">90%</span>
                                  </div>
                                  <div className="h-1 sm:h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" style={{ width: '90%' }} />
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30">QA</span>
                                  <span className="text-[10px] sm:text-xs text-slate-500">1h left</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div
                          className="transition-all duration-700"
                          style={{
                            opacity: transitionProgress1to2,
                            transform: `translateY(${(1 - transitionProgress1to2) * 30}px)`,
                            transitionDelay: '0.4s'
                          }}
                        >
                          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-700/50">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                              <h3 className="text-xs sm:text-sm font-semibold text-emerald-300 uppercase tracking-wider">Done</h3>
                              <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 sm:py-1 rounded-full">0</span>
                            </div>
                            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center mb-2 sm:mb-3">
                                <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400/50" />
                              </div>
                              <p className="text-xs sm:text-sm text-slate-500">Complete tasks</p>
                              <p className="text-[10px] sm:text-xs text-slate-600">will appear here</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 px-2">
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-400" />
                            <span className="text-[10px] sm:text-xs text-slate-400">Planning</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-400" />
                            <span className="text-[10px] sm:text-xs text-slate-400">Development</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-teal-400" />
                            <span className="text-[10px] sm:text-xs text-slate-400">Creative</span>
                          </div>
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">
                          Drag tasks between columns to update status
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(phase3 || transitionProgress2to3 > 0) && (
                  <div
                    className="absolute inset-0 flex items-center justify-center px-2 sm:px-8 py-4 sm:py-12 overflow-auto"
                    style={{
                      opacity: transitionProgress2to3,
                      transition: 'opacity 0.8s ease-out'
                    }}
                  >
                    <div className="w-full max-w-6xl">
                      <div className="bg-slate-900/40 backdrop-blur-xl rounded-xl sm:rounded-3xl border border-cyan-500/20 p-3 sm:p-8 shadow-2xl">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-4 sm:mb-8">
                          <h2 className="text-lg sm:text-2xl font-bold text-white">Project Roadmap</h2>
                          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                            <div className="flex items-center gap-1 sm:gap-2 text-slate-400">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="text-[10px] sm:text-sm">Weekly</span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="text-[10px] sm:text-sm">On Track</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-[90px_1fr] sm:grid-cols-[240px_1fr] gap-0 mb-2 sm:mb-6">
                          <div className="pr-1 sm:pr-4">
                            <div className="text-[9px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tracks</div>
                          </div>
                          <div className="grid grid-cols-8 gap-px text-slate-500 text-center mb-2">
                            <div className="hidden sm:grid sm:grid-cols-8 sm:gap-px sm:col-span-8 text-xs">
                              {['Dec 14-20', 'Dec 21-27', 'Dec 28-3', 'Jan 4-10', 'Jan 11-17', 'Jan 18-24', 'Jan 25-31', 'Feb 1-7'].map((week, i) => (
                                <div key={i} className="font-medium">{week}</div>
                              ))}
                            </div>
                            <div className="grid grid-cols-8 gap-px col-span-8 sm:hidden text-[9px]">
                              {['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'].map((week, i) => (
                                <div key={i} className="font-medium">{week}</div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-0 border-t border-slate-700/30">
                          <div
                            className="transition-all duration-300"
                            style={{
                              opacity: transitionProgress2to3,
                              transform: `translateY(${(1 - transitionProgress2to3) * 20}px)`,
                              transitionDelay: '0.1s'
                            }}
                          >
                            <button
                              onClick={() => toggleTrack('product')}
                              className="w-full grid grid-cols-[90px_1fr] sm:grid-cols-[240px_1fr] gap-0 hover:bg-slate-800/30 transition-colors group"
                            >
                              <div className="flex items-center gap-0.5 sm:gap-2 py-1.5 sm:py-3 pr-1 sm:pr-4">
                                <div className="transition-transform duration-200 flex-shrink-0">
                                  {collapsedTracks.has('product') ? (
                                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                                  )}
                                </div>
                                <div className="w-1 h-1 sm:w-2 sm:h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50 flex-shrink-0" />
                                <span className="text-[10px] sm:text-sm font-semibold text-white truncate">
                                  <span className="sm:hidden">Product</span>
                                  <span className="hidden sm:inline">Product Development</span>
                                </span>
                              </div>
                              <div className="relative h-8 sm:h-12 my-auto">
                                <div className="absolute inset-0 grid grid-cols-8 gap-px">
                                  {Array(8).fill(0).map((_, i) => (
                                    <div key={i} className="bg-slate-800/20" />
                                  ))}
                                </div>
                                <div
                                  className="absolute h-5 sm:h-8 top-1/2 -translate-y-1/2 rounded-md sm:rounded-lg bg-gradient-to-r from-cyan-400/70 to-cyan-500/70 border border-cyan-400/30 shadow-lg"
                                  style={{ left: '0%', width: '87.5%' }}
                                />
                              </div>
                            </button>

                            {!collapsedTracks.has('product') && (
                              <div className="bg-slate-800/10">
                                {[
                                  { name: 'Vision & Strategy', shortName: 'Vision', start: 0, width: 25, icon: Target },
                                  { name: 'Feature Scoping', shortName: 'Features', start: 12.5, width: 37.5, icon: Layers },
                                  { name: 'Release Planning', shortName: 'Planning', start: 37.5, width: 37.5, icon: Calendar },
                                  { name: 'Product Metrics', shortName: 'Metrics', start: 62.5, width: 25, icon: GitBranch }
                                ].map((task, idx) => {
                                  const Icon = task.icon;
                                  return (
                                    <div
                                      key={idx}
                                      className="grid grid-cols-[90px_1fr] sm:grid-cols-[240px_1fr] gap-0 hover:bg-slate-700/20 transition-colors"
                                    >
                                      <div className="flex items-center gap-0.5 sm:gap-2 py-1.5 sm:py-2.5 pl-4 sm:pl-10 pr-1 sm:pr-4">
                                        <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 flex-shrink-0">
                                          <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" />
                                        </div>
                                        <span className="text-[9px] sm:text-sm text-slate-300 truncate">
                                          <span className="sm:hidden">{task.shortName}</span>
                                          <span className="hidden sm:inline">{task.name}</span>
                                        </span>
                                      </div>
                                      <div className="relative h-7 sm:h-10 my-auto">
                                        <div className="absolute inset-0 grid grid-cols-8 gap-px">
                                          {Array(8).fill(0).map((_, i) => (
                                            <div key={i} className="bg-slate-800/20" />
                                          ))}
                                        </div>
                                        <div
                                          className="absolute h-4 sm:h-6 top-1/2 -translate-y-1/2 rounded-sm sm:rounded-md bg-gradient-to-r from-cyan-400/50 to-cyan-500/50 border border-cyan-400/20 shadow-md hover:from-cyan-400/60 hover:to-cyan-500/60 transition-all cursor-pointer"
                                          style={{ left: `${task.start}%`, width: `${task.width}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div
                            className="transition-all duration-300 border-t border-slate-700/30"
                            style={{
                              opacity: transitionProgress2to3,
                              transform: `translateY(${(1 - transitionProgress2to3) * 20}px)`,
                              transitionDelay: '0.2s'
                            }}
                          >
                            <button
                              onClick={() => toggleTrack('research')}
                              className="w-full grid grid-cols-[90px_1fr] sm:grid-cols-[240px_1fr] gap-0 hover:bg-slate-800/30 transition-colors group"
                            >
                              <div className="flex items-center gap-0.5 sm:gap-2 py-1.5 sm:py-3 pr-1 sm:pr-4">
                                <div className="transition-transform duration-200 flex-shrink-0">
                                  {collapsedTracks.has('research') ? (
                                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                                  )}
                                </div>
                                <div className="w-1 h-1 sm:w-2 sm:h-2 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50 flex-shrink-0" />
                                <span className="text-[10px] sm:text-sm font-semibold text-white truncate">
                                  <span className="sm:hidden">Research</span>
                                  <span className="hidden sm:inline">Market Research</span>
                                </span>
                              </div>
                              <div className="relative h-8 sm:h-12 my-auto">
                                <div className="absolute inset-0 grid grid-cols-8 gap-px">
                                  {Array(8).fill(0).map((_, i) => (
                                    <div key={i} className="bg-slate-800/20" />
                                  ))}
                                </div>
                                <div
                                  className="absolute h-5 sm:h-8 top-1/2 -translate-y-1/2 rounded-md sm:rounded-lg bg-gradient-to-r from-blue-400/70 to-blue-500/70 border border-blue-400/30 shadow-lg"
                                  style={{ left: '12.5%', width: '50%' }}
                                />
                              </div>
                            </button>

                            {!collapsedTracks.has('research') && (
                              <div className="bg-slate-800/10">
                                {[
                                  { name: 'Competitor Research', shortName: 'Compete', start: 12.5, width: 25, icon: Target },
                                  { name: 'User Interviews', shortName: 'Users', start: 25, width: 25, icon: Brain },
                                  { name: 'Insights Synthesis', shortName: 'Insights', start: 37.5, width: 25, icon: Sparkles }
                                ].map((task, idx) => {
                                  const Icon = task.icon;
                                  return (
                                    <div
                                      key={idx}
                                      className="grid grid-cols-[90px_1fr] sm:grid-cols-[240px_1fr] gap-0 hover:bg-slate-700/20 transition-colors"
                                    >
                                      <div className="flex items-center gap-0.5 sm:gap-2 py-1.5 sm:py-2.5 pl-4 sm:pl-10 pr-1 sm:pr-4">
                                        <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 flex-shrink-0">
                                          <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                                        </div>
                                        <span className="text-[9px] sm:text-sm text-slate-300 truncate">
                                          <span className="sm:hidden">{task.shortName}</span>
                                          <span className="hidden sm:inline">{task.name}</span>
                                        </span>
                                      </div>
                                      <div className="relative h-7 sm:h-10 my-auto">
                                        <div className="absolute inset-0 grid grid-cols-8 gap-px">
                                          {Array(8).fill(0).map((_, i) => (
                                            <div key={i} className="bg-slate-800/20" />
                                          ))}
                                        </div>
                                        <div
                                          className="absolute h-4 sm:h-6 top-1/2 -translate-y-1/2 rounded-sm sm:rounded-md bg-gradient-to-r from-blue-400/50 to-blue-500/50 border border-blue-400/20 shadow-md hover:from-blue-400/60 hover:to-blue-500/60 transition-all cursor-pointer"
                                          style={{ left: `${task.start}%`, width: `${task.width}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div
                            className="transition-all duration-300 border-t border-slate-700/30"
                            style={{
                              opacity: transitionProgress2to3,
                              transform: `translateY(${(1 - transitionProgress2to3) * 20}px)`,
                              transitionDelay: '0.3s'
                            }}
                          >
                            <button
                              onClick={() => toggleTrack('execution')}
                              className="w-full grid grid-cols-[90px_1fr] sm:grid-cols-[240px_1fr] gap-0 hover:bg-slate-800/30 transition-colors group"
                            >
                              <div className="flex items-center gap-0.5 sm:gap-2 py-1.5 sm:py-3 pr-1 sm:pr-4">
                                <div className="transition-transform duration-200 flex-shrink-0">
                                  {collapsedTracks.has('execution') ? (
                                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                                  )}
                                </div>
                                <div className="w-1 h-1 sm:w-2 sm:h-2 rounded-full bg-teal-400 shadow-lg shadow-teal-400/50 flex-shrink-0" />
                                <span className="text-[10px] sm:text-sm font-semibold text-white truncate">Execution</span>
                              </div>
                              <div className="relative h-8 sm:h-12 my-auto">
                                <div className="absolute inset-0 grid grid-cols-8 gap-px">
                                  {Array(8).fill(0).map((_, i) => (
                                    <div key={i} className="bg-slate-800/20" />
                                  ))}
                                </div>
                                <div
                                  className="absolute h-5 sm:h-8 top-1/2 -translate-y-1/2 rounded-md sm:rounded-lg bg-gradient-to-r from-teal-400/70 to-teal-500/70 border border-teal-400/30 shadow-lg"
                                  style={{ left: '25%', width: '62.5%' }}
                                />
                              </div>
                            </button>

                            {!collapsedTracks.has('execution') && (
                              <div className="bg-slate-800/10">
                                {[
                                  { name: 'Core Development', shortName: 'Dev', start: 25, width: 37.5, icon: GitBranch },
                                  { name: 'Testing & QA', shortName: 'Testing', start: 50, width: 25, icon: CheckCircle2 },
                                  { name: 'Launch Prep', shortName: 'Launch', start: 62.5, width: 25, icon: Sparkles }
                                ].map((task, idx) => {
                                  const Icon = task.icon;
                                  return (
                                    <div
                                      key={idx}
                                      className="grid grid-cols-[90px_1fr] sm:grid-cols-[240px_1fr] gap-0 hover:bg-slate-700/20 transition-colors"
                                    >
                                      <div className="flex items-center gap-0.5 sm:gap-2 py-1.5 sm:py-2.5 pl-4 sm:pl-10 pr-1 sm:pr-4">
                                        <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-teal-500/10 flex items-center justify-center border border-teal-500/20 flex-shrink-0">
                                          <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-teal-400" />
                                        </div>
                                        <span className="text-[9px] sm:text-sm text-slate-300 truncate">
                                          <span className="sm:hidden">{task.shortName}</span>
                                          <span className="hidden sm:inline">{task.name}</span>
                                        </span>
                                      </div>
                                      <div className="relative h-7 sm:h-10 my-auto">
                                        <div className="absolute inset-0 grid grid-cols-8 gap-px">
                                          {Array(8).fill(0).map((_, i) => (
                                            <div key={i} className="bg-slate-800/20" />
                                          ))}
                                        </div>
                                        <div
                                          className="absolute h-4 sm:h-6 top-1/2 -translate-y-1/2 rounded-sm sm:rounded-md bg-gradient-to-r from-teal-400/50 to-teal-500/50 border border-teal-400/20 shadow-md hover:from-teal-400/60 hover:to-teal-500/60 transition-all cursor-pointer"
                                          style={{ left: `${task.start}%`, width: `${task.width}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 sm:mt-8 pt-3 sm:pt-6 border-t border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 text-[10px] sm:text-sm">
                          <div className="text-slate-400 hidden sm:block">
                            Flexible timelines that adapt as priorities shift
                          </div>
                          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-start sm:justify-end">
                            <div className="flex items-center gap-1 sm:gap-2 text-slate-400">
                              <div className="w-1 h-1 sm:w-2 sm:h-2 rounded-full bg-cyan-400" />
                              <span className="text-[9px] sm:text-sm">Main</span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 text-slate-400">
                              <div className="w-1 h-1 sm:w-2 sm:h-2 rounded-full bg-slate-400" />
                              <span className="text-[9px] sm:text-sm">Sub</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div
              className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 text-center space-y-4 pointer-events-none z-40 transition-opacity duration-700 px-4"
              style={{ opacity: scrollProgress < 0.7 ? 1 : 0 }}
            >
              <div
                className="transition-opacity duration-700"
                style={{ opacity: phase1 ? 1 - transitionProgress1to2 : 0 }}
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1.5 sm:mb-2">
                  Connected, not fragmented
                </h2>
                <p className="text-sm sm:text-lg text-slate-300 mb-4 sm:mb-6">
                  Ideas, goals, and tasks as relationships. Drag nodes around.
                </p>
                <button
                  onClick={scrollToWaitlist}
                  className="pointer-events-auto inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm sm:text-base font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-4 focus:ring-cyan-500/30 transition-all duration-200 shadow-lg shadow-cyan-500/20"
                >
                  <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Join Waitlist
                </button>
              </div>

              <div
                className="transition-opacity duration-700"
                style={{ opacity: phase2 ? Math.max(transitionProgress1to2, 1 - transitionProgress2to3) : 0 }}
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1.5 sm:mb-2">
                  From thinking to doing
                </h2>
                <p className="text-sm sm:text-lg text-slate-300">
                  Surface what matters now — gently, without pressure
                </p>
              </div>

              <div
                className="transition-opacity duration-700"
                style={{ opacity: transitionProgress2to3 }}
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1.5 sm:mb-2">
                  Direction without overwhelm
                </h2>
                <p className="text-sm sm:text-lg text-slate-300">
                  Flexible timelines that adapt as priorities shift
                </p>
              </div>
            </div>

            <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 flex gap-1.5 sm:gap-2 z-40">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-500 ${
                    (idx === 0 && phase1) || (idx === 1 && phase2) || (idx === 2 && phase3)
                      ? 'bg-cyan-400 w-6 sm:w-8'
                      : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes float-1 { 0%, 100% { transform: translate(-50%, -50%) translateY(0px); } 50% { transform: translate(-50%, -50%) translateY(-10px); } }
          @keyframes float-2 { 0%, 100% { transform: translate(-50%, -50%) translateY(0px); } 50% { transform: translate(-50%, -50%) translateY(-15px); } }
          @keyframes float-3 { 0%, 100% { transform: translate(-50%, -50%) translateY(0px); } 50% { transform: translate(-50%, -50%) translateY(-8px); } }
          @keyframes float-4 { 0%, 100% { transform: translate(-50%, -50%) translateY(0px); } 50% { transform: translate(-50%, -50%) translateY(-12px); } }
          @keyframes float-5 { 0%, 100% { transform: translate(-50%, -50%) translateY(0px); } 50% { transform: translate(-50%, -50%) translateY(-14px); } }
          @keyframes float-6 { 0%, 100% { transform: translate(-50%, -50%) translateY(0px); } 50% { transform: translate(-50%, -50%) translateY(-9px); } }
        `}</style>
      </div>

      <div className="relative bg-gradient-to-b from-slate-950 to-slate-900 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Core Features
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              GuardRails is made up of several interconnected parts — each designed to reduce cognitive load and support follow-through.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <button
                  key={index}
                  onClick={() => setSelectedFeature(feature)}
                  className={`${feature.iconBg} backdrop-blur-md border border-cyan-500/20 rounded-2xl p-8 text-left transition-all duration-300 hover:scale-105 hover:border-cyan-400/40 hover:shadow-xl hover:shadow-cyan-500/20 group`}
                >
                  <div className={`w-14 h-14 ${feature.iconBg} border border-cyan-500/30 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-7 h-7 ${feature.iconColor}`} />
                  </div>
                  <h3 className={`text-sm font-semibold ${feature.iconColor} uppercase tracking-wider mb-2`}>
                    {feature.name}
                  </h3>
                  <p className="text-lg font-semibold text-white mb-2">
                    {feature.headline}
                  </p>
                  <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">
                    {feature.description}
                  </p>
                  <div className="mt-4 text-cyan-400 text-sm font-medium flex items-center gap-2">
                    Click to learn more
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-16 text-center">
            <p className="text-lg text-slate-300 max-w-3xl mx-auto">
              None of these tools exist in isolation. GuardRails is designed so thinking, planning, execution, and reflection continuously inform each other — without friction.
            </p>
          </div>
        </div>
      </div>

      {selectedFeature && (
        <div
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300"
          onClick={() => setSelectedFeature(null)}
        >
          <div
            className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-xl rounded-2xl sm:rounded-[32px] max-w-6xl w-full max-h-[90vh] shadow-2xl shadow-black/40 relative overflow-hidden border border-white/5 flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'slideUp 0.5s ease-out'
            }}
          >
            <button
              onClick={() => setSelectedFeature(null)}
              className="absolute top-3 right-3 sm:top-6 sm:right-6 text-slate-500 hover:text-slate-300 transition-all duration-200 hover:scale-110 z-10 bg-slate-900/80 rounded-lg p-1.5 sm:p-0 sm:bg-transparent"
              aria-label="Close"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
            </button>

            <div className="grid lg:grid-cols-2 gap-0 overflow-y-auto">
              <div className="relative bg-slate-900/50 p-6 sm:p-8 lg:p-12 flex items-center justify-center min-h-[250px] sm:min-h-[300px] lg:min-h-[500px] border-b lg:border-b-0 lg:border-r border-white/5">
                <div className="w-full h-full">
                  <selectedFeature.demo />
                </div>
              </div>

              <div className="p-6 sm:p-8 lg:p-12 flex flex-col justify-center space-y-6 sm:space-y-8">
                <div className="space-y-4 sm:space-y-6">
                  <div className={`text-xs font-semibold ${selectedFeature.iconColor} uppercase tracking-[0.2em]`}>
                    {selectedFeature.name}
                  </div>

                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight pr-8 sm:pr-0">
                    {selectedFeature.headline}
                  </h3>

                  <p className="text-[15px] sm:text-[17px] text-slate-300 leading-relaxed">
                    {selectedFeature.description}
                  </p>
                </div>

                <div className="pt-4 pb-2">
                  <div className="h-px bg-gradient-to-r from-slate-700/50 via-slate-700/50 to-transparent" />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-[0.15em]">
                    System Integration
                  </div>
                  <p className="text-sm sm:text-[15px] text-slate-400 leading-relaxed">
                    {selectedFeature.ecosystem}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedNode && (() => {
        const nodeDemoMap: Record<string, React.ComponentType> = {
          'Mind Mesh': MindMeshDemo,
          'Roadmap': RoadmapDemo,
          'Side Projects': SideProjectsDemo,
          'Task Flow': TaskFlowDemo,
          'Offshoot Ideas': OffshootIdeasDemo,
          'Focus Mode': FocusModeDemo
        };
        const DemoComponent = nodeDemoMap[selectedNode.label];
        const colorMap: Record<string, string> = {
          cyan: 'text-cyan-400',
          blue: 'text-blue-400',
          teal: 'text-teal-400'
        };
        const textColor = colorMap[selectedNode.color];

        return (
          <div
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300"
            onClick={() => setSelectedNode(null)}
          >
            <div
              className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-xl rounded-2xl sm:rounded-[32px] max-w-6xl w-full max-h-[90vh] shadow-2xl shadow-black/40 relative overflow-hidden border border-white/5 flex flex-col"
              onClick={(e) => e.stopPropagation()}
              style={{
                animation: 'slideUp 0.5s ease-out'
              }}
            >
              <button
                onClick={() => setSelectedNode(null)}
                className="absolute top-3 right-3 sm:top-6 sm:right-6 text-slate-500 hover:text-slate-300 transition-all duration-200 hover:scale-110 z-10 bg-slate-900/80 rounded-lg p-1.5 sm:p-0 sm:bg-transparent"
                aria-label="Close"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
              </button>

              <div className="grid lg:grid-cols-2 gap-0 overflow-y-auto">
                <div className="relative bg-slate-900/50 p-6 sm:p-8 lg:p-12 flex items-center justify-center min-h-[250px] sm:min-h-[300px] lg:min-h-[500px] border-b lg:border-b-0 lg:border-r border-white/5">
                  <div className="w-full h-full">
                    {DemoComponent && <DemoComponent />}
                  </div>
                </div>

                <div className="p-6 sm:p-8 lg:p-12 flex flex-col justify-center space-y-6 sm:space-y-8">
                  <div className="space-y-4 sm:space-y-6">
                    <div className={`text-xs font-semibold ${textColor} uppercase tracking-[0.2em]`}>
                      {selectedNode.label}
                    </div>

                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight pr-8 sm:pr-0">
                      {nodeDescriptions[selectedNode.label]?.headline || selectedNode.label}
                    </h3>

                    <p className="text-[15px] sm:text-[17px] text-slate-300 leading-relaxed">
                      {nodeDescriptions[selectedNode.label]?.description || 'Explore how this feature helps you manage your thoughts and tasks more effectively.'}
                    </p>
                  </div>

                  <div className="pt-4 pb-2">
                    <div className="h-px bg-gradient-to-r from-slate-700/50 via-slate-700/50 to-transparent" />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-[0.15em]">
                      System Integration
                    </div>
                    <p className="text-sm sm:text-[15px] text-slate-400 leading-relaxed">
                      {nodeDescriptions[selectedNode.label]?.ecosystem || 'Part of the interconnected GuardRails ecosystem'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div ref={waitlistRef} className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.08),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.06),transparent_50%)]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Early Access
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Ready to build better systems<br />for your mind?
          </h2>

          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join the waitlist to get early access to SharedMinds and be part of shaping how we work with our thoughts.
          </p>

          <WaitlistForm />

          <div className="mt-12 pt-12 border-t border-slate-800/50">
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>Early access benefits</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>Influence development</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>Priority support</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <img src={SharedMindsLogo} alt="SharedMinds Logo" className="w-10 h-10" />
                <span className="font-semibold text-white text-lg">SharedMinds</span>
              </div>
              <p className="text-slate-400 leading-relaxed mb-6">
                SharedMinds is being built to support non-linear thinking, executive function, and complex lives — with compassion and clarity.
              </p>
              <div className="mb-4">
                <h4 className="text-white font-semibold mb-3 text-sm">Follow Us</h4>
                <div className="flex items-center gap-4">
                  <a
                    href="https://instagram.com/sharedminds"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-slate-800 hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-600 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg"
                    aria-label="Follow us on Instagram"
                  >
                    <Instagram className="w-5 h-5 text-slate-300 hover:text-white transition-colors" />
                  </a>
                  <a
                    href="https://tiktok.com/@sharedminds"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-950 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg"
                    aria-label="Follow us on TikTok"
                  >
                    <div className="text-slate-300 hover:text-white transition-colors">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                    </div>
                  </a>
                  <a
                    href="https://linkedin.com/company/sharedminds"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-slate-800 hover:bg-blue-700 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg"
                    aria-label="Follow us on LinkedIn"
                  >
                    <Linkedin className="w-5 h-5 text-slate-300 hover:text-white transition-colors" />
                  </a>
                </div>
              </div>
              <a href="mailto:support@sharedminds.app" className="text-slate-400 hover:text-blue-400 transition-colors text-sm">
                support@sharedminds.app
              </a>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-3">
                <li>
                  <a href="/" className="text-slate-400 hover:text-blue-400 transition-colors">
                    Home
                  </a>
                </li>
                <li>
                  <a href="/guardrails" className="text-slate-400 hover:text-blue-400 transition-colors">
                    GuardRails
                  </a>
                </li>
                <li>
                  <a href="/#spaces" className="text-slate-400 hover:text-blue-400 transition-colors">
                    Spaces
                  </a>
                </li>
                <li>
                  <a href="/#regulation" className="text-slate-400 hover:text-blue-400 transition-colors">
                    Regulation
                  </a>
                </li>
                <li>
                  <a href="/#use-cases" className="text-slate-400 hover:text-blue-400 transition-colors">
                    Use Cases
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-3">
                <li>
                  <a href="/#why" className="text-slate-400 hover:text-blue-400 transition-colors">
                    Why SharedMinds exists
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-slate-400 hover:text-blue-400 transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="text-slate-400 hover:text-blue-400 transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li className="text-slate-500 text-sm">
                  Early-stage project
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">
              &copy; {new Date().getFullYear()} SharedMinds. All rights reserved.
            </p>
            <p className="text-slate-400 text-sm">
              Built with care for neurodivergent minds.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
