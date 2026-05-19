import React, { useState, useRef, useEffect } from 'react';

interface Point { x: number; y: number; }
interface PhysicsNode extends Point {
  rotation: number; rv: number; vx: number; vy: number;
}
interface Bubble extends Point {
  id: number; vx: number; vy: number; radius: number;
  color: string; homeX: number; homeY: number; wobbleOffset: number;
}

const COLORS = {
  blue: ['#60a5fa', '#3b82f6'],
  green: ['#34d399', '#10b981'],
  yellow: ['#fbbf24', '#f59e0b'],
  purple: ['#a78bfa', '#8b5cf6'],
  pink: ['#f472b6', '#ec4899']
};

export default function InteractiveNeuralAnimation() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [viewBox, setViewBox] = useState({ w: 2000, h: 1500 });
  
  const [node1, setNode1] = useState<PhysicsNode>({ x: 1600, y: 400, rotation: 0, rv: 0, vx: 0, vy: 0 }); 
  const [node2, setNode2] = useState<PhysicsNode>({ x: 700, y: 1100, rotation: 0, rv: 0, vx: 0, vy: 0 }); 
  const [activeNode, setActiveNode] = useState<'node1' | 'node2' | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      let w = 2000;
      
      if (width < 768) {
        type = 'mobile';
        w = 1000;
      } else if (width >= 768 && width <= 1024) {
        type = 'tablet';
        w = 1400; // Optimized width for iPad/Tablet portrait and landscape
      }

      setDeviceType(type);
      setViewBox({ w, h: 1500 });

      // TABLET PLACEMENT: Ensure nodes are within 1400px bounds
      if (type === 'mobile') {
        setNode1(p => ({ ...p, x: 800, y: 350 }));
        setNode2(p => ({ ...p, x: 200, y: 1150 }));
      } else if (type === 'tablet') {
        setNode1(p => ({ ...p, x: 1200, y: 400 })); // Pulled in from 1600 to 1200
        setNode2(p => ({ ...p, x: 400, y: 1100 }));
      } else {
        setNode1(p => ({ ...p, x: 1620, y: 380 }));
        setNode2(p => ({ ...p, x: 720, y: 1100 }));
      }

      const newBubbles = Array.from({ length: type === 'mobile' ? 10 : 14 }).map((_, i) => {
        const hX = (w / 2) + (Math.random() - 0.5) * (w * 0.6);
        const hY = 750 + (Math.random() - 0.5) * 800;
        return {
          id: i, x: hX, y: hY, homeX: hX, homeY: hY,
          vx: 0, vy: 0,
          radius: (type === 'mobile' ? 14 : 18) + Math.random() * 10, 
          color: Object.keys(COLORS)[i % 5],
          wobbleOffset: Math.random() * Math.PI * 2
        };
      });
      setBubbles(newBubbles);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let frameId: number;
    const updatePhysics = () => {
      const applyBoundaries = (node: PhysicsNode) => {
        let evx = node.vx; let evy = node.vy;
        const margin = deviceType === 'mobile' ? 80 : 150;
        if (node.x < margin) evx += (margin - node.x) * 0.08;
        if (node.x > viewBox.w - margin) evx -= (node.x - (viewBox.w - margin)) * 0.08;
        if (node.y < margin) evy += (margin - node.y) * 0.08;
        if (node.y > 1500 - margin) evy -= (node.y - (1500 - margin)) * 0.08;
        return { ...node, vx: evx, vy: evy };
      };

      const dx = node1.x - node2.x;
      const dy = node1.y - node2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const magnetRadius = deviceType === 'mobile' ? 400 : 550; 

      if (dist < magnetRadius) {
        const repulsion = Math.pow(1 - dist / magnetRadius, 2) * 3;
        const angle = Math.atan2(dy, dx);
        if (activeNode === 'node1') {
          setNode2(prev => ({ ...prev, vx: prev.vx - Math.cos(angle) * repulsion, vy: prev.vy - Math.sin(angle) * repulsion, rv: prev.rv - (repulsion * 0.06) }));
        } else if (activeNode === 'node2') {
          setNode1(prev => ({ ...prev, vx: prev.vx + Math.cos(angle) * repulsion, vy: prev.vy + Math.sin(angle) * repulsion, rv: prev.rv + (repulsion * 0.06) }));
        }
      }

      setNode1(prev => {
        const n = activeNode === 'node1' ? prev : applyBoundaries(prev);
        return { ...n, x: activeNode === 'node1' ? n.x : n.x + n.vx, y: activeNode === 'node1' ? n.y : n.y + n.vy, vx: n.vx * 0.88, vy: n.vy * 0.88, rotation: n.rotation + n.rv, rv: n.rv * 0.9 };
      });

      setNode2(prev => {
        const n = activeNode === 'node2' ? prev : applyBoundaries(prev);
        return { ...n, x: activeNode === 'node2' ? n.x : n.x + n.vx, y: activeNode === 'node2' ? n.y : n.y + n.vy, vx: n.vx * 0.88, vy: n.vy * 0.88, rotation: n.rotation + n.rv, rv: n.rv * 0.9 };
      });

      setBubbles(prev => prev.map(b => {
        const time = Date.now() * 0.0015;
        const wobbleX = Math.sin(time + b.wobbleOffset) * 0.8;
        const wobbleY = Math.cos(time * 0.8 + b.wobbleOffset) * 0.8;
        let ax = (b.homeX - b.x) * 0.01 + wobbleX;
        let ay = (b.homeY - b.y) * 0.01 + wobbleY;

        [node1, node2].forEach(n => {
          const bdx = b.x - n.x; const bdy = b.y - n.y;
          const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
          const r = deviceType === 'mobile' ? 250 : 380;
          if (bdist < r) {
            const f = Math.pow(1 - bdist / r, 2) * 12;
            ax += (bdx / bdist) * f; ay += (bdy / bdist) * f;
          }
        });
        let nx = b.x + b.vx; let ny = b.y + b.vy;
        let nvx = b.vx + ax; let nvy = b.vy + ay;
        if (nx < 0 || nx > viewBox.w) nvx *= -1.2;
        if (ny < 0 || ny > 1500) nvy *= -1.2;
        return { ...b, vx: nvx * 0.82, vy: nvy * 0.82, x: nx, y: ny };
      }));
      frameId = requestAnimationFrame(updatePhysics);
    };
    updatePhysics();
    return () => cancelAnimationFrame(frameId);
  }, [node1, node2, activeNode, viewBox, deviceType]);

  const handlePointerDown = (node: 'node1' | 'node2', e: React.PointerEvent) => {
    // Only stop propagation for the nodes, allowing background touches to bubble up for scrolling
    e.stopPropagation();
    setActiveNode(node);
  };

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!activeNode || !svgRef.current) return;
      const CTM = svgRef.current.getScreenCTM();
      if (!CTM) return;
      let x = (e.clientX - CTM.e) / CTM.a;
      let y = (e.clientY - CTM.f) / CTM.d;
      if (activeNode === 'node1') setNode1(p => ({ ...p, x, y }));
      else setNode2(p => ({ ...p, x, y }));
    };
    const handleUp = () => setActiveNode(null);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [activeNode]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ zIndex: 1 }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBox.w} 1500`} 
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
        // DYNAMIC TOUCH ACTION: Disable scroll ONLY when holding a node
        style={{ touchAction: activeNode ? 'none' : 'auto' }}
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {bubbles.map(b => {
          return [node1, node2].map((n, nodeIdx) => {
            const dist = Math.sqrt((b.x - n.x)**2 + (b.y - n.y)**2);
            if (dist > 380) return null;
            return (
              <line key={`spark-${b.id}-${nodeIdx}`} x1={n.x} y1={n.y} x2={b.x} y2={b.y}
                stroke={nodeIdx === 0 ? "#fbbf24" : "#a78bfa"} strokeWidth="1.5"
                opacity={(1 - dist/380) * 0.3} strokeDasharray="4,8" className="energy-arc"
              />
            );
          });
        })}

        {bubbles.map((b) => (
          <g key={b.id} transform={`translate(${b.x}, ${b.y})`} filter="url(#glow)">
            <circle r={b.radius} fill="white" stroke="#f1f5f9" strokeWidth="1" opacity="0.9" />
            <circle r={b.radius * 0.75} fill={COLORS[b.color as keyof typeof COLORS][1]} opacity="0.8" />
            <circle r={b.radius * 0.3} fill="white" opacity="0.95" />
          </g>
        ))}

        {/* Improved Hit Areas for Tablet/Mobile Fingers */}
        <g transform={`translate(${node1.x}, ${node1.y}) rotate(${node1.rotation})`}
           onPointerDown={(e) => handlePointerDown('node1', e)} style={{ cursor: 'grab' }}>
          <circle r={deviceType === 'desktop' ? "120" : "160"} fill="transparent" />
          <image href="/assets/shared_minds_logo_right_node.svg"
                 x="-110" y="-110" width="220" height="220"
                 preserveAspectRatio="xMidYMid meet"
                 style={{ pointerEvents: 'none' }} />
        </g>

        <g transform={`translate(${node2.x}, ${node2.y}) rotate(${node2.rotation})`}
           onPointerDown={(e) => handlePointerDown('node2', e)} style={{ cursor: 'grab' }}>
          <circle r={deviceType === 'desktop' ? "130" : "180"} fill="transparent" />
          <image href="/assets/shared_minds_logo_left_node.svg"
                 x="-130" y="-130" width="260" height="260"
                 preserveAspectRatio="xMidYMid meet"
                 style={{ pointerEvents: 'none' }} />
        </g>
      </svg>
      <style>{`
        .energy-arc { animation: energyFlicker 0.2s infinite alternate; }
        @keyframes energyFlicker { from { opacity: 0.1; } to { opacity: 0.4; } }
      `}</style>
    </div>
  );
}