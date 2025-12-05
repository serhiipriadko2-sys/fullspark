
import React, { useMemo, useState } from 'react';
import { MemoryNode, MemoryNodeType } from '../types';

interface MemoryGraphProps {
  nodes: MemoryNode[];
  onSelectNode: (node: MemoryNode) => void;
}

const TYPE_COLORS: Record<MemoryNodeType, string> = {
  event: '#4DA3FF', // Accent
  insight: '#FF7A00', // Primary
  decision: '#2ECC71', // Success
  feedback: '#FFB020', // Warning
  artifact: '#E5484D', // Danger
};

const TYPE_Y_OFFSET: Record<MemoryNodeType, number> = {
  event: 0.2,
  insight: 0.4,
  decision: 0.6,
  feedback: 0.8,
  artifact: 0.5,
};

const MemoryGraph: React.FC<MemoryGraphProps> = ({ nodes, onSelectNode }) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Calculate layout
  const layout = useMemo(() => {
    if (nodes.length === 0) return { nodes: [], links: [], width: 0, height: 0 };

    const sortedNodes = [...nodes].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    // Adjust width dynamically
    const width = Math.max(800, sortedNodes.length * 80);
    const height = 400;
    const padding = 60;

    const mappedNodes = sortedNodes.map((node, index) => {
      const x = padding + (index / (sortedNodes.length - 1 || 1)) * (width - 2 * padding);
      const y = (TYPE_Y_OFFSET[node.type] || 0.5) * height;
      return { ...node, x, y };
    });

    const links = [];
    for (let i = 0; i < mappedNodes.length - 1; i++) {
      const start = mappedNodes[i];
      const end = mappedNodes[i+1];
      
      // Bezier control points for smooth S-curve
      const cp1x = (start.x + end.x) / 2;
      const cp1y = start.y;
      const cp2x = (start.x + end.x) / 2;
      const cp2y = end.y;

      links.push({
        d: `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`,
        id: `link-${i}`,
        color: 'rgba(255, 255, 255, 0.08)'
      });
    }

    return { nodes: mappedNodes, links, width, height };
  }, [nodes]);

  if (nodes.length === 0) {
      return <div className="flex items-center justify-center h-64 text-text-muted font-serif italic opacity-50">Память чиста...</div>;
  }

  return (
    <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
      <svg width={layout.width} height={layout.height} className="min-w-full">
        <defs>
            <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
            <linearGradient id="link-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.2)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
            </linearGradient>
        </defs>
        
        {/* Connections */}
        {layout.links.map(link => (
          <path
            key={link.id}
            d={link.d}
            stroke="url(#link-gradient)"
            strokeWidth="1.5"
            fill="none"
            className="transition-all duration-500"
          />
        ))}

        {/* Nodes */}
        {layout.nodes.map(node => {
            const isHovered = hoveredNodeId === node.id;
            const color = TYPE_COLORS[node.type] || '#fff';
            
            return (
                <g 
                    key={node.id} 
                    onClick={() => onSelectNode(node)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    style={{ cursor: 'pointer' }}
                    className="transition-all duration-300 group"
                >
                    {/* Pulse Effect for significant nodes (e.g. artifacts) */}
                    {node.type === 'artifact' && (
                         <circle
                            cx={node.x}
                            cy={node.y}
                            r={isHovered ? 16 : 12}
                            fill={color}
                            opacity="0.2"
                            className="animate-pulse"
                        />
                    )}

                    {/* Core Node */}
                    <circle
                        cx={node.x}
                        cy={node.y}
                        r={isHovered ? 8 : 5}
                        fill={color}
                        filter={isHovered ? "url(#node-glow)" : ""}
                        stroke="rgba(0,0,0,0.5)"
                        strokeWidth="2"
                        className="transition-all duration-300"
                    />
                    
                    {/* Hover Label */}
                    <foreignObject x={node.x - 75} y={node.y + 15} width="150" height="60" style={{pointerEvents: 'none', opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s'}}>
                         <div className="flex flex-col items-center text-center">
                            <span className="text-[10px] font-mono text-text-muted bg-black/80 px-2 py-0.5 rounded mb-1 backdrop-blur-md border border-white/10">{node.type}</span>
                            <span className="text-xs font-bold text-text leading-tight drop-shadow-md">{node.title}</span>
                         </div>
                    </foreignObject>
                </g>
            );
        })}
      </svg>
      
      {/* Compact Legend */}
      <div className="absolute bottom-4 left-4 flex gap-3 bg-black/40 backdrop-blur-md p-2 rounded-lg border border-white/5 text-[10px]">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                  <span className="text-text-muted capitalize opacity-80">{type}</span>
              </div>
          ))}
      </div>
    </div>
  );
};

export default MemoryGraph;
