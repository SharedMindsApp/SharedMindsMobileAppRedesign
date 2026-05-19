import { useEffect, useState } from 'react';

interface Node {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

interface Connection {
  from: Node;
  to: Node;
  opacity: number;
  delay: number;
}

export default function MindPatternBackground() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    const colors = [
      'rgba(59, 130, 246, 0.15)',
      'rgba(6, 182, 212, 0.12)',
      'rgba(20, 184, 166, 0.1)',
      'rgba(245, 158, 11, 0.08)',
    ];

    const generatedNodes: Node[] = Array.from({ length: 35 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 10,
      duration: 4 + Math.random() * 6,
    }));

    setNodes(generatedNodes);

    const generatedConnections: Connection[] = [];
    for (let i = 0; i < generatedNodes.length; i++) {
      const node = generatedNodes[i];
      const nearbyNodes = generatedNodes.filter((n, idx) => {
        if (idx === i) return false;
        const dx = Math.abs(n.x - node.x);
        const dy = Math.abs(n.y - node.y);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 25;
      });

      nearbyNodes.slice(0, 2).forEach((nearbyNode) => {
        generatedConnections.push({
          from: node,
          to: nearbyNode,
          opacity: 0.03 + Math.random() * 0.05,
          delay: Math.random() * 8,
        });
      });
    }

    setConnections(generatedConnections);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ mixBlendMode: 'multiply' }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {connections.map((connection, i) => (
          <line
            key={`connection-${i}`}
            x1={`${connection.from.x}%`}
            y1={`${connection.from.y}%`}
            x2={`${connection.to.x}%`}
            y2={`${connection.to.y}%`}
            stroke="rgba(59, 130, 246, 0.08)"
            strokeWidth="0.5"
            opacity={connection.opacity}
            style={{
              animation: `fadeInOut ${6 + Math.random() * 8}s ease-in-out infinite`,
              animationDelay: `${connection.delay}s`,
            }}
          />
        ))}

        {nodes.map((node, i) => (
          <circle
            key={`node-${i}`}
            cx={`${node.x}%`}
            cy={`${node.y}%`}
            r={node.size}
            fill={node.color}
            filter="url(#glow)"
            style={{
              animation: `pulse ${node.duration}s ease-in-out infinite`,
              animationDelay: `${node.delay}s`,
            }}
          />
        ))}
      </svg>

      <div className="absolute inset-0">
        {[...Array(8)].map((_, i) => (
          <div
            key={`cluster-${i}`}
            className="absolute rounded-full blur-3xl"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${150 + Math.random() * 200}px`,
              height: `${150 + Math.random() * 200}px`,
              background:
                i % 3 === 0
                  ? 'radial-gradient(circle, rgba(59, 130, 246, 0.03) 0%, transparent 70%)'
                  : i % 3 === 1
                  ? 'radial-gradient(circle, rgba(6, 182, 212, 0.025) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(20, 184, 166, 0.02) 0%, transparent 70%)',
              animation: `float ${15 + i * 3}s ease-in-out infinite`,
              animationDelay: `${i * 2}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes fadeInOut {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.8;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(20px, -30px) scale(1.05);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.95);
          }
        }
      `}</style>
    </div>
  );
}
