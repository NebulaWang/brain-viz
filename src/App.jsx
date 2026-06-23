
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Settings, 
  Search, 
  Brain, 
  Upload,
  Eye,
  EyeOff,
  Share2,
  Grid3X3,
  Circle,
  Palette,
  Layers,
  Camera,
  Navigation,
  X,
  ChevronDown,
  ArrowLeftRight,
  FileJson,
  MousePointer2,
  Activity,
  Zap,
  TrendingUp,
  Skull,
  GitCompare,
  Box,
  Target,
  Plus,
  GitCommit,
  Grid,
  Focus
} from 'lucide-react';

// --- Components ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 ${className}`}>
    {children}
  </div>
);

const MetricBox = ({ label, value, tooltip, assessFn, colorClass = "text-indigo-600 dark:text-indigo-400" }) => {
  const assessment = (value !== undefined && value !== null && !isNaN(value) && assessFn) ? assessFn(value) : null;
  return (
    <div className="bg-white dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col group relative h-full" title={tooltip}>
       <div className="text-[9px] leading-tight font-bold text-slate-500 dark:text-slate-400 cursor-help mb-0.5">{label}</div>
       <div className={`font-mono font-bold text-[13px] ${colorClass} mb-1.5`}>
          {value !== undefined && value !== null && !isNaN(value) ? value.toFixed(3) : '-'}
       </div>
       <div className="mt-auto flex items-end">
         {assessment && (
             <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded-sm font-bold ${assessment.color}`}>
                 {assessment.text}
             </span>
         )}
       </div>
    </div>
  );
};

// --- Metric Assessment Helpers ---
const evalEfficiency = v => v > 0.3 ? {text: 'HIGH', color: 'bg-emerald-100 text-emerald-700'} : v > 0.1 ? {text: 'MOD', color: 'bg-amber-100 text-amber-700'} : {text: 'LOW', color: 'bg-rose-100 text-rose-700'};
const evalClustering = v => v > 0.3 ? {text: 'HIGH', color: 'bg-emerald-100 text-emerald-700'} : {text: 'MOD', color: 'bg-amber-100 text-amber-700'};
const evalDensity = v => v > 0.1 ? {text: 'DENSE', color: 'bg-indigo-100 text-indigo-700'} : {text: 'SPARSE', color: 'bg-slate-100 text-slate-700'};

const evalCentralization = v => v > 0.4 ? {text: 'STRONG', color: 'bg-rose-100 text-rose-700'} : v > 0.15 ? {text: 'MODERATE', color: 'bg-amber-100 text-amber-700'} : {text: 'DISTRIBUTED', color: 'bg-emerald-100 text-emerald-700'};
const evalAssortativity = v => v > 0.05 ? {text: 'RICH-CLUB', color: 'bg-purple-100 text-purple-700'} : v < -0.05 ? {text: 'DISASSORT', color: 'bg-rose-100 text-rose-700'} : {text: 'NEUTRAL', color: 'bg-slate-100 text-slate-700'};
const evalAvgPC = v => v > 0.4 ? {text: 'INTEGRATED', color: 'bg-emerald-100 text-emerald-700'} : {text: 'SEGREGATED', color: 'bg-amber-100 text-amber-700'};

const evalSmallWorld = v => v > 1.2 ? {text: 'STRONG', color: 'bg-emerald-100 text-emerald-700'} : v > 1.0 ? {text: 'WEAK', color: 'bg-amber-100 text-amber-700'} : {text: 'NONE', color: 'bg-slate-100 text-slate-700'};
const evalPowerLaw = v => (v >= 2 && v <= 3.5) ? {text: 'YES', color: 'bg-emerald-100 text-emerald-700'} : {text: 'NO', color: 'bg-slate-100 text-slate-700'};
const evalModularity = v => v > 0.3 ? {text: 'STRONG', color: 'bg-emerald-100 text-emerald-700'} : {text: 'WEAK', color: 'bg-amber-100 text-amber-700'};

// --- Algorithms ---

const calculateGraphMetrics = (nodes, links) => {
  if (nodes.length === 0) return { 
    efficiency: 0, clustering: 0, density: 0, 
    centralization: 0, assortativity: 0, modQ: 0, 
    powerLaw: 0, smallWorld: 0, avgPC: 0 
  };

  const N = nodes.length;
  const E = links.length;

  const adj = new Map();
  const weights = new Map();
  nodes.forEach(n => {
      adj.set(n.id, []);
      weights.set(n.id, 0); // node strength
  });

  let totalWeight = 0;
  links.forEach(l => {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    const val = Math.abs(l.value); // Use absolute value for structural topology
    
    if (adj.has(s) && adj.has(t)) {
      adj.get(s).push(t);
      adj.get(t).push(s);
      weights.set(s, weights.get(s) + val);
      weights.set(t, weights.get(t) + val);
      totalWeight += val;
    }
  });

  // 1. Efficiency, Path Length, & Clustering
  let totalEfficiency = 0;
  let totalPathLength = 0;
  let reachablePairs = 0;

  // Sample nodes to prevent UI freeze on huge networks
  const sampleNodes = nodes.length > 100 ? nodes.filter((_, i) => i % 2 === 0) : nodes; 

  sampleNodes.forEach(startNode => {
    const distances = new Map();
    const queue = [startNode.id];
    distances.set(startNode.id, 0);
    
    let head = 0;
    while(head < queue.length) {
      const u = queue[head++];
      const d = distances.get(u);
      
      const neighbors = adj.get(u) || [];
      for(const v of neighbors) {
        if(!distances.has(v)) {
          distances.set(v, d + 1);
          queue.push(v);
          totalEfficiency += 1 / (d + 1);
          totalPathLength += (d + 1);
          reachablePairs++;
        }
      }
    }
  });
  
  const avgPathLength = reachablePairs > 0 ? totalPathLength / reachablePairs : 0;
  const efficiency = totalEfficiency / (sampleNodes.length * (N - 1) || 1); 

  // Clustering
  let totalClustering = 0;
  nodes.forEach(node => {
    const neighbors = adj.get(node.id) || [];
    const k = neighbors.length;
    if (k < 2) return;
    
    let triangles = 0;
    for(let i=0; i<k; i++) {
      for(let j=i+1; j<k; j++) {
        const n1 = neighbors[i];
        const n2 = neighbors[j];
        if (adj.get(n1)?.includes(n2)) triangles++;
      }
    }
    totalClustering += (2 * triangles) / (k * (k - 1));
  });
  const clustering = totalClustering / N;

  const possibleLinks = (N * (N - 1)) / 2;
  const density = E / (possibleLinks || 1);

  // 2. Degree Centralization
  const degrees = nodes.map(n => (adj.get(n.id) || []).length);
  const maxDegree = Math.max(...degrees, 0);
  const centralization = N > 2 ? degrees.reduce((acc, deg) => acc + (maxDegree - deg), 0) / ((N - 1) * (N - 2)) : 0;

  // 3. Assortativity Coefficient
  let sum_jk = 0, sum_j_plus_k = 0, sum_j2_plus_k2 = 0;
  let validEdges = 0;
  links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      const dj = (adj.get(s) || []).length;
      const dk = (adj.get(t) || []).length;
      if (dj > 0 && dk > 0) {
          sum_jk += dj * dk;
          sum_j_plus_k += (dj + dk);
          sum_j2_plus_k2 += (dj * dj + dk * dk);
          validEdges++;
      }
  });
  
  let assortativity = 0;
  if (validEdges > 0) {
      const term1 = sum_jk;
      const term2 = Math.pow(sum_j_plus_k, 2) / (4 * validEdges);
      const term3 = 0.5 * sum_j2_plus_k2;
      const num = term1 - term2;
      const den = term3 - term2;
      assortativity = den !== 0 ? num / den : 0;
  }

  // 4. Weighted Modularity (Q)
  let modQ = 0;
  if (totalWeight > 0) {
      const communityInfo = new Map();
      nodes.forEach(n => {
          if (!communityInfo.has(n.group)) {
              communityInfo.set(n.group, { innerWeight: 0, totalStrength: 0 });
          }
          communityInfo.get(n.group).totalStrength += weights.get(n.id);
      });

      links.forEach(l => {
          const sObj = nodes.find(n => n.id === (typeof l.source === 'object' ? l.source.id : l.source));
          const tObj = nodes.find(n => n.id === (typeof l.target === 'object' ? l.target.id : l.target));
          if (sObj && tObj && sObj.group === tObj.group) {
              communityInfo.get(sObj.group).innerWeight += Math.abs(l.value);
          }
      });

      communityInfo.forEach(info => {
          const e_c = info.innerWeight / totalWeight; // Edge fraction inside
          const a_c = info.totalStrength / (2 * totalWeight); // Expected random edges
          modQ += (e_c - Math.pow(a_c, 2));
      });
  }

  // 5. Average Participation Coefficient
  let totalPC = 0;
  nodes.forEach(node => {
    const degree = (adj.get(node.id) || []).length;
    if (degree === 0) return;

    const neighborLinks = links.filter(l => {
        const sId = typeof l.source === 'object' ? l.source.id : l.source;
        const tId = typeof l.target === 'object' ? l.target.id : l.target;
        return sId === node.id || tId === node.id;
    });
    
    const communityDegrees = new Map();
    neighborLinks.forEach(l => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      const neighborId = sId === node.id ? tId : sId;
      const neighbor = nodes.find(n => n.id === neighborId);
      if (neighbor) {
        communityDegrees.set(neighbor.group, (communityDegrees.get(neighbor.group) || 0) + 1);
      }
    });

    let sumSq = 0;
    communityDegrees.forEach(k_is => {
      sumSq += Math.pow(k_is / degree, 2);
    });
    totalPC += (1 - sumSq);
  });
  const avgPC = N > 0 ? totalPC / N : 0;

  // 6. Power-Law Exponent (Scale-Free via Maximum Likelihood Estimation)
  const positiveDegrees = degrees.filter(d => d > 0);
  let powerLaw = 0;
  if (positiveDegrees.length > 2) {
      const kmin = Math.min(...positiveDegrees);
      if (Math.max(...positiveDegrees) > kmin) {
          let sumLog = 0;
          positiveDegrees.forEach(k => {
              sumLog += Math.log(k / (kmin - 0.5));
          });
          if (sumLog > 0) {
              powerLaw = 1 + positiveDegrees.length / sumLog;
          }
      }
  }

  // 7. Small-Worldness Index (Sigma)
  let smallWorld = 0;
  const K = (2 * E) / N; // Mean degree
  if (K > 1 && avgPathLength > 0) {
      const C_rand = K / N;
      const L_rand = Math.log(N) / Math.log(K);
      if (C_rand > 0 && L_rand > 0) {
          const gamma = clustering / C_rand;
          const lambda = avgPathLength / L_rand;
          smallWorld = lambda > 0 ? gamma / lambda : 0;
      }
  }

  return { 
      efficiency, clustering, density, 
      centralization, assortativity, modQ, 
      powerLaw, smallWorld, avgPC 
  };
};

const calculateHubRoles = (nodes, links, nodeDegrees) => {
  const roles = new Map(); 
  
  nodes.forEach(node => {
    const degree = nodeDegrees.get(node.id) || 0;
    if (degree === 0) {
      roles.set(node.id, 'non-hub');
      return;
    }

    const neighborLinks = links.filter(l => l.source === node.id || l.target === node.id);
    const communityDegrees = new Map();
    
    neighborLinks.forEach(l => {
      const neighborId = l.source === node.id ? l.target : l.source;
      const neighbor = nodes.find(n => n.id === neighborId);
      if (neighbor) {
        const c = neighbor.group; 
        communityDegrees.set(c, (communityDegrees.get(c) || 0) + 1);
      }
    });

    let sumSq = 0;
    communityDegrees.forEach(k_is => {
      sumSq += Math.pow(k_is / degree, 2);
    });
    
    const P = 1 - sumSq;
    
    if (degree > 5 && P > 0.3) roles.set(node.id, 'connector'); 
    else if (degree > 5) roles.set(node.id, 'provincial'); 
    else roles.set(node.id, 'non-hub');
  });

  return roles;
};

// Dijkstra
const findShortestPath = (nodes, links, startId, endId) => {
  const distances = new Map();
  const previous = new Map();
  const queue = new Set(nodes.map(n => n.id));
  
  nodes.forEach(n => distances.set(n.id, Infinity));
  distances.set(startId, 0);
  
  while (queue.size > 0) {
    let u = null;
    let minDist = Infinity;
    for (const id of queue) {
      const d = distances.get(id);
      if (d < minDist) { minDist = d; u = id; }
    }
    
    if (u === null || u === endId) break;
    queue.delete(u);
    
    const neighbors = links.filter(l => l.source === u || l.target === u);
    for (const link of neighbors) {
      const v = link.source === u ? link.target : link.source;
      if (!queue.has(v)) continue;
      
      const weight = link.value || 0.001;
      const alt = distances.get(u) + (1 / weight); 
      
      if (alt < distances.get(v)) {
        distances.set(v, alt);
        previous.set(v, { id: u, linkId: link });
      }
    }
  }
  
  const path = [];
  let curr = endId;
  if (previous.has(curr) || curr === startId) {
    while (curr) {
      path.unshift(curr);
      const prev = previous.get(curr);
      curr = prev ? prev.id : null;
    }
  }
  return path.length > 1 ? path : [];
};

// --- Helper: Generate Distinct Colors ---
const generateColorMap = (nodes) => {
  const groups = [...new Set(nodes.map(n => n.group))].sort((a,b) => a-b);
  const colorMap = new Map();
  
  // Scientifically derived high-contrast palette for maximum visual distinction
  const distinctColors = [
    '#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231', 
    '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4', 
    '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000', 
    '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9'
  ];
  
  groups.forEach((group, i) => {
    if (group === -1) {
      colorMap.set(group, '#cbd5e1'); // Neutral gray for Community -1
      return;
    }
    
    // Adjust index if -1 is present so color 0 is correctly assigned to Community 0
    const colorIdx = groups.includes(-1) ? i - 1 : i; 
    
    if (colorIdx >= 0 && colorIdx < distinctColors.length) {
      colorMap.set(group, distinctColors[colorIdx]);
    } else {
      const hue = (colorIdx * 137.508) % 360; 
      const sat = 60 + (colorIdx % 3) * 15; 
      const lit = 40 + (colorIdx % 4) * 10; 
      colorMap.set(group, `hsl(${hue}, ${sat}%, ${lit}%)`);
    }
  });
  
  return colorMap;
};

// --- Connectivity Matrix Component ---

const ConnectivityMatrixModal = ({ nodes, links, onClose, colorMap, deltaMode }) => {
  const canvasRef = useRef(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [showLabels, setShowLabels] = useState(true);

  const sortedNodes = useMemo(() => {
    return [...nodes].sort((a, b) => a.group - b.group || a.id.localeCompare(b.id));
  }, [nodes]);

  const linkMap = useMemo(() => {
    const map = new Map();
    links.forEach(l => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      map.set(`${sId}-${tId}`, l.value);
      map.set(`${tId}-${sId}`, l.value); 
    });
    return map;
  }, [links]);

  const maxVal = useMemo(() => {
    let max = 0.001;
    links.forEach(l => { if (Math.abs(l.value) > max) max = Math.abs(l.value); });
    return max;
  }, [links]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const fullSize = canvas.width;
    const n = sortedNodes.length;
    
    ctx.clearRect(0, 0, fullSize, fullSize);
    
    if (n === 0) {
       ctx.fillStyle = "#94a3b8";
       ctx.font = "14px sans-serif";
       ctx.textAlign = "center";
       ctx.fillText("No nodes visible", fullSize/2, fullSize/2);
       return;
    }

    const stripThickness = 12; 
    const labelSpace = showLabels ? 90 : stripThickness + 2; 
    const matrixSize = fullSize - labelSpace;
    const cellSize = matrixSize / n;

    // 1. Draw Heatmap Cells
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const u = sortedNodes[i].id;
        const v = sortedNodes[j].id;
        const val = linkMap.get(`${u}-${v}`) || 0;

        if (u === v) {
            ctx.fillStyle = '#cbd5e1'; 
        } else if (val === 0) {
            ctx.fillStyle = '#ffffff'; 
        } else {
            const intensity = Math.min(1, Math.abs(val) / maxVal);
            if (deltaMode) {
               ctx.fillStyle = val > 0 ? `rgba(16, 185, 129, ${intensity})` : `rgba(239, 68, 68, ${intensity})`;
            } else {
               ctx.fillStyle = `rgba(0, 0, 0, ${intensity})`; 
            }
        }
        ctx.fillRect(labelSpace + j * cellSize, labelSpace + i * cellSize, cellSize + 0.5, cellSize + 0.5);
      }
    }

    // 2. Draw Group Color Axis Strips
    for (let i = 0; i < n; i++) {
       ctx.fillStyle = colorMap.get(sortedNodes[i].group) || '#000';
       ctx.fillRect(labelSpace + i * cellSize, labelSpace - stripThickness, cellSize + 0.5, stripThickness); 
       ctx.fillRect(labelSpace - stripThickness, labelSpace + i * cellSize, stripThickness, cellSize + 0.5); 
    }

    // 3. Draw Grid Lines for Group boundaries
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'; 
    ctx.lineWidth = 1.0; 
    let currentGroup = sortedNodes[0]?.group;
    for (let i = 1; i < n; i++) {
       if (sortedNodes[i].group !== currentGroup) {
           currentGroup = sortedNodes[i].group;
           const pos = labelSpace + i * cellSize;
           ctx.beginPath(); ctx.moveTo(labelSpace, pos); ctx.lineTo(fullSize, pos); ctx.stroke();
           ctx.beginPath(); ctx.moveTo(pos, labelSpace); ctx.lineTo(pos, fullSize); ctx.stroke();
       }
    }

    // 4. Draw Node Labels
    if (showLabels && cellSize >= 4) {
      ctx.fillStyle = "#475569"; 
      ctx.font = `${Math.min(11, cellSize - 1)}px sans-serif`;
      ctx.textBaseline = "middle";
      
      for (let i = 0; i < n; i++) {
         const node = sortedNodes[i];
         
         ctx.textAlign = "right";
         ctx.fillText(node.id, labelSpace - stripThickness - 4, labelSpace + i * cellSize + cellSize / 2);
         
         ctx.save();
         ctx.translate(labelSpace + i * cellSize + cellSize / 2, labelSpace - stripThickness - 4);
         ctx.rotate(-Math.PI / 2);
         ctx.textAlign = "left";
         ctx.fillText(node.id, 0, 0);
         ctx.restore();
      }
    }

  }, [sortedNodes, linkMap, maxVal, deltaMode, colorMap, showLabels]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const n = sortedNodes.length;
    if (n === 0) return;
    
    const stripThickness = 12;
    const labelSpace = showLabels ? 90 : stripThickness + 2;
    const matrixSize = canvas.width - labelSpace;
    const cellSize = matrixSize / n;

    const col = Math.floor((x - labelSpace) / cellSize);
    const row = Math.floor((y - labelSpace) / cellSize);

    if (row >= 0 && row < n && col >= 0 && col < n && x >= labelSpace && y >= labelSpace) {
       const u = sortedNodes[row];
       const v = sortedNodes[col];
       const val = linkMap.get(`${u.id}-${v.id}`) || 0;
       setHoverInfo({ x: e.clientX, y: e.clientY, u, v, val, isDiagonal: u.id === v.id });
    } else {
       setHoverInfo(null);
    }
  };

  return (
     <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl flex flex-col w-full max-w-3xl">
           <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Connectivity Matrix</h2>
                <p className="text-xs text-slate-500">Showing {nodes.length} currently visible regions</p>
              </div>
              <div className="flex items-center space-x-4">
                 <label className="flex items-center space-x-2 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <input 
                      type="checkbox" 
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer" 
                      checked={showLabels} 
                      onChange={(e) => setShowLabels(e.target.checked)} 
                    />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 select-none">Labels</span>
                 </label>
                 <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 p-2 rounded-full transition-colors"><X className="w-4 h-4"/></button>
              </div>
           </div>
           <div className="p-6 flex justify-center items-center relative bg-slate-50 dark:bg-slate-950 rounded-b-xl overflow-hidden">
              <canvas
                 ref={canvasRef}
                 width={800}
                 height={800}
                 className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm rounded"
                 onMouseMove={handleMouseMove}
                 onMouseLeave={() => setHoverInfo(null)}
                 style={{ cursor: 'crosshair', width: '100%', height: 'auto', aspectRatio: '1/1', maxWidth: '80vh' }}
              />
              {hoverInfo && (
                 <div className="fixed z-50 bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl pointer-events-none border border-slate-700 w-48" style={{ left: hoverInfo.x + 15, top: hoverInfo.y + 15 }}>
                    <div className="mb-1 pb-1 border-b border-slate-700">
                       <span className="text-slate-400">Row:</span> <span className="font-bold">{hoverInfo.u.id}</span>
                       <div className="text-[10px] text-slate-500">{hoverInfo.u.community}</div>
                    </div>
                    <div className="mb-2 pb-1 border-b border-slate-700">
                       <span className="text-slate-400">Col:</span> <span className="font-bold">{hoverInfo.v.id}</span>
                       <div className="text-[10px] text-slate-500">{hoverInfo.v.community}</div>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-slate-400">Weight:</span>
                       <span className={`font-mono font-bold ${hoverInfo.isDiagonal ? 'text-slate-500' : (deltaMode ? (hoverInfo.val > 0 ? 'text-emerald-400' : hoverInfo.val < 0 ? 'text-rose-400' : 'text-slate-300') : 'text-indigo-400')}`}>
                          {hoverInfo.isDiagonal ? 'Self' : (hoverInfo.val === 0 ? '0' : hoverInfo.val.toFixed(4))}
                       </span>
                    </div>
                 </div>
              )}
           </div>
        </div>
     </div>
  );
};

// --- Canvas Component ---

const CanvasGraph = ({ 
  nodes, 
  links, 
  activeNode, 
  onNodeClick, 
  onNodeRightClick,
  searchTerm, 
  layout,
  colorMap,
  nodeDegrees,
  is3D,
  pathData, 
  takeSnapshot,
  analysisSettings, 
  nodeRoles,
  nodeScale = 1 
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  
  const nodePositions = useRef(new Map()); 
  
  const simulationRef = useRef({
    nodes: [],
    links: [],
    camera: { x: 0, y: 0, zoom: 1, angleX: 0, angleY: 0 }, 
    isDragging: false,
    dragNode: null,
    animationId: null,
    lastMouse: { x: 0, y: 0 },
    groupAngleMap: new Map()
  });

  // Snapshot
  useEffect(() => {
    if (takeSnapshot) {
      takeSnapshot.current = (format = 'png') => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (format === 'png' || format === 'jpeg') {
            const link = document.createElement('a');
            link.download = `brain-viz-export.${format}`;
            link.href = canvas.toDataURL(`image/${format}`, 1.0);
            link.click();
        } else if (format === 'pdf') {
            const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
              <html><head><title>Print to PDF</title></head>
              <body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;">
                <img src="${dataUrl}" style="max-width:100%;max-height:100%;" onload="window.print();window.close();"/>
              </body></html>
            `);
            printWindow.document.close();
        } else if (format === 'svg') {
            const width = dimensions.width;
            const height = dimensions.height;
            const sim = simulationRef.current;

            const drawList = [];
            sim.links.forEach(l => {
              const p1 = l.sourceObj._proj;
              const p2 = l.targetObj._proj;
              if (p1 && p2 && p1.scale >= 0 && p2.scale >= 0) {
                drawList.push({ type: 'link', depth: (p1.depth + p2.depth) / 2, p1, p2, obj: l });
              }
            });

            sim.nodes.forEach(n => {
              if (n._proj && n._proj.scale >= 0) {
                drawList.push({ type: 'node', depth: n._proj.depth, proj: n._proj, obj: n });
              }
            });

            drawList.sort((a, b) => b.depth - a.depth);

            const isPathLink = (l) => {
              if (!pathData.path || pathData.path.length < 2) return false;
              for (let i = 0; i < pathData.path.length - 1; i++) {
                const u = pathData.path[i];
                const v = pathData.path[i+1];
                if ((l.source === u && l.target === v) || (l.source === v && l.target === u)) return true;
              }
              return false;
            };
            const isPathNode = (nId) => pathData.path && pathData.path.includes(nId);
            
            const getSafeEdgeColor = (hex) => {
                const lightColors = ['#ffe119', '#bfef45', '#fabed4', '#dcbeff', '#fffac8', '#aaffc3', '#ffd8b1'];
                return lightColors.includes(hex) ? '#000000' : hex;
            };

            let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
            svg += `<rect width="100%" height="100%" fill="#ffffff" />\n`;
            
            svg += `<defs>\n`;
            drawList.forEach((item, idx) => {
                if (item.type === 'link') {
                    const c1 = getSafeEdgeColor(colorMap.get(item.obj.sourceObj.group) || '#94a3b8');
                    const c2 = getSafeEdgeColor(colorMap.get(item.obj.targetObj.group) || '#94a3b8');
                    svg += `<linearGradient id="grad-${idx}" x1="${item.p1.x}" y1="${item.p1.y}" x2="${item.p2.x}" y2="${item.p2.y}" gradientUnits="userSpaceOnUse">
                              <stop offset="0%" stop-color="${c1}" />
                              <stop offset="100%" stop-color="${c2}" />
                            </linearGradient>\n`;
                }
            });
            svg += `</defs>\n`;

            const labelsToDraw = [];
            const ctx = canvas.getContext('2d'); 

            drawList.forEach((item, idx) => {
                if (item.type === 'link') {
                    const { p1, p2, obj: link } = item;
                    let alpha = is3D ? 0.3 : 0.2; 
                    let lw = 1.5 * ((p1.scale + p2.scale)/2) * nodeScale; 
                    
                    const inPath = isPathLink(link);
                    const isConnected = activeNode && (link.sourceObj.id === activeNode.id || link.targetObj.id === activeNode.id);

                    if (analysisSettings.showRichClub) {
                       const srcDeg = nodeDegrees.get(link.sourceObj.id) || 0;
                       const tgtDeg = nodeDegrees.get(link.targetObj.id) || 0;
                       if (srcDeg <= 5 || tgtDeg <= 5) alpha = 0.02; 
                    }

                    if (inPath) {
                        alpha = 1;
                        lw = 4 * ((p1.scale + p2.scale)/2) * nodeScale;
                    } else if (pathData.path.length > 0) {
                        alpha = 0.02; 
                    } else if (activeNode) {
                       alpha = isConnected ? 0.8 : 0.02;
                       if (isConnected) lw = 2.5 * ((p1.scale + p2.scale)/2) * nodeScale;
                    } else if (searchTerm) {
                       const matches = link.sourceObj.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                       link.targetObj.id.toLowerCase().includes(searchTerm.toLowerCase());
                       alpha = matches ? 0.6 : 0.05;
                    }

                    let stroke = `url(#grad-${idx})`;
                    if (analysisSettings.deltaMode && !inPath) {
                        if (link.value > 0.001) stroke = "#10b981"; 
                        else if (link.value < -0.001) stroke = "#ef4444"; 
                        else alpha = 0.05; 
                    } else if (inPath) {
                        stroke = '#f59e0b';
                    }

                    alpha = Math.min(Math.max(alpha, 0), 1);
                    lw = Math.max(0.5, lw);

                    svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${stroke}" stroke-width="${lw}" opacity="${alpha}" />\n`;

                } else if (item.type === 'node') {
                    const { proj, obj: node } = item;
                    const inPath = isPathNode(node.id);
                    const isStart = node.id === pathData.start;
                    const isEnd = node.id === pathData.end;
                    const isSelected = activeNode && activeNode.id === node.id;
                    const isMatch = searchTerm && node.id.toLowerCase().includes(searchTerm.toLowerCase());
                    const isNeighbor = activeNode && sim.links.some(l => 
                        (l.sourceObj.id === activeNode.id && l.targetObj.id === node.id) || 
                        (l.sourceObj.id === node.id && l.targetObj.id === activeNode.id)
                    );

                    let alpha = 1;
                    const degree = nodeDegrees.get(node.id) || 0;
                    let radius = (3 + Math.min(degree * 0.25, 8)) * proj.scale * nodeScale;
                    
                    if (analysisSettings.showRichClub && degree <= 5) {
                        alpha = 0.1;
                        radius = 2 * proj.scale * nodeScale;
                    }

                    if (isSelected || isMatch || isStart || isEnd) radius = Math.max(radius, 8 * proj.scale * nodeScale);
                    
                    let color = colorMap.get(node.group) || '#6366f1';
                    
                    if (pathData.path.length > 0) {
                       alpha = inPath ? 1 : 0.1;
                       if (isStart) color = '#10b981'; 
                       if (isEnd) color = '#ef4444'; 
                    } else if (searchTerm) {
                       alpha = isMatch ? 1 : 0.1;
                    } else if (activeNode) {
                       alpha = isSelected || isNeighbor ? 1 : 0.1;
                    }

                    const role = nodeRoles?.get(node.id);
                    if (analysisSettings.showHubs && role === 'connector') {
                        const r = radius * 1.5;
                        const pts = `${proj.x},${proj.y - r} ${proj.x + r},${proj.y} ${proj.x},${proj.y + r} ${proj.x - r},${proj.y}`;
                        svg += `<polygon points="${pts}" fill="#f59e0b" opacity="${alpha}" />\n`;
                        labelsToDraw.push({ node, proj, isSelected, inPath, isMatch, isNeighbor, radius: r, role });
                        return;
                    }

                    svg += `<circle cx="${proj.x}" cy="${proj.y}" r="${Math.max(0, radius)}" fill="${color}" opacity="${alpha}" />\n`;

                    if (isSelected || isStart || isEnd || (analysisSettings.showHubs && role === 'provincial')) {
                        const sc = role === 'provincial' ? "#000" : "#fff";
                        const sw = (role === 'provincial' ? 1 : 2) * proj.scale;
                        svg += `<circle cx="${proj.x}" cy="${proj.y}" r="${Math.max(0, radius)}" fill="none" stroke="${sc}" stroke-width="${sw}" opacity="${alpha}" />\n`;
                        if (isSelected) {
                            svg += `<circle cx="${proj.x}" cy="${proj.y}" r="${Math.max(0, radius)}" fill="none" stroke="#000" stroke-width="${1 * proj.scale}" opacity="${alpha}" />\n`;
                        }
                    }

                    const showLabel = isSelected || isMatch || inPath || (proj.scale > 0.6 && (isNeighbor || (!activeNode && !searchTerm && pathData.path.length === 0 && !analysisSettings.showRichClub)));
                    if (showLabel) {
                        labelsToDraw.push({ node, proj, isSelected, inPath, isMatch, isNeighbor, radius, role });
                    }
                }
            });

            labelsToDraw.sort((a, b) => {
                const scoreA = (a.isSelected ? 10000 : 0) + (a.isMatch ? 1000 : 0) + (a.inPath ? 100 : 0) + (a.isNeighbor ? 10 : 0) + a.proj.scale;
                const scoreB = (b.isSelected ? 10000 : 0) + (b.isMatch ? 1000 : 0) + (b.inPath ? 100 : 0) + (b.isNeighbor ? 10 : 0) + b.proj.scale;
                return scoreB - scoreA;
            });

            const drawnBoxes = [];

            labelsToDraw.forEach(label => {
                const fontSize = Math.max(12, 16 * label.proj.scale); 
                ctx.font = `${label.isSelected || label.inPath ? "bold " : ""}${fontSize}px sans-serif`;
                
                const textWidth = ctx.measureText(label.node.id).width;
                const textHeight = fontSize; 
                const lx = label.proj.x;
                const ly = label.proj.y - label.radius - 6; 
                
                const padding = 2;
                const box = {
                    l: lx - textWidth / 2 - padding,
                    r: lx + textWidth / 2 + padding,
                    t: ly - textHeight - padding,
                    b: ly + padding
                };

                let collision = false;
                if (!label.isSelected && !label.isMatch && !label.inPath && !label.isNeighbor) {
                    for (const dBox of drawnBoxes) {
                        if (!(box.r < dBox.l || box.l > dBox.r || box.b < dBox.t || box.t > dBox.b)) {
                            collision = true;
                            break;
                        }
                    }
                }

                if (!collision) {
                    const fw = label.isSelected || label.inPath ? "bold" : "normal";
                    const fill = label.isSelected || label.inPath ? "#000" : (is3D ? "#1e293b" : "#475569");
                    
                    svg += `<text x="${lx}" y="${ly}" font-family="sans-serif" font-weight="${fw}" font-size="${fontSize}px" fill="${fill}" text-anchor="middle" stroke="rgba(255, 255, 255, 0.85)" stroke-width="3" paint-order="stroke">${label.node.id}</text>\n`;
                    drawnBoxes.push(box);
                }
            });

            svg += `</svg>`;
            
            const blob = new Blob([svg], {type: 'image/svg+xml;charset=utf-8'});
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `brain-viz-export.svg`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        }
      };
    }
  }, [takeSnapshot, dimensions, layout, colorMap, is3D, activeNode, searchTerm, pathData, analysisSettings, nodeRoles, nodeScale, nodeDegrees]);

  const recenterCamera = () => {
    simulationRef.current.camera = { x: 0, y: 0, zoom: 1, angleX: 0, angleY: 0 };
  };

  // Init Data
  useEffect(() => {
    const width = dimensions.width;
    const height = dimensions.height;
    
    if (simulationRef.current.nodes.length > 0) {
      simulationRef.current.nodes.forEach(n => {
        nodePositions.current.set(n.id, { 
          x: n.x, y: n.y, z: n.z || 0, 
          vx: n.vx, vy: n.vy, vz: n.vz || 0 
        });
      });
    }

    const uniqueGroupsArray = [...new Set(nodes.map(n => n.group))].sort((a,b) => a-b);
    const groupAngleMap = new Map();
    uniqueGroupsArray.forEach((g, i) => {
        groupAngleMap.set(g, (2 * Math.PI * i) / uniqueGroupsArray.length);
    });
    simulationRef.current.groupAngleMap = groupAngleMap;

    const applyLayout = (node, index, total) => {
      const cached = nodePositions.current.get(node.id);
      if (cached) return { x: cached.x, y: cached.y, z: cached.z };

      if (layout === 'force') {
        const angle = (2 * Math.PI * index) / total;
        const radius = Math.min(width, height) * 0.4;
        return {
          x: width / 2 + radius * Math.cos(angle),
          y: height / 2 + radius * Math.sin(angle),
          z: (Math.random() - 0.5) * 50
        };
      }
      if (layout === 'cluster') {
         const angle = groupAngleMap.get(node.group) || 0;
         const cx = width/2 + (width * 0.32) * Math.cos(angle);
         const cy = height/2 + (height * 0.32) * Math.sin(angle);
         return {
             x: cx + (Math.random() - 0.5) * 40,
             y: cy + (Math.random() - 0.5) * 40,
             z: 0
         };
      }
      if (layout === 'circular') {
        const angle = (2 * Math.PI * index) / total;
        const radius = Math.min(width, height) * 0.35;
        return {
          x: width / 2 + radius * Math.cos(angle),
          y: height / 2 + radius * Math.sin(angle),
          z: 0
        };
      }
      if (layout === 'grid') {
        const cols = Math.ceil(Math.sqrt(total));
        const cellW = (width * 0.8) / cols;
        const col = index % cols;
        const row = Math.floor(index / cols);
        return {
          x: (width * 0.1) + col * cellW + cellW / 2,
          y: (height * 0.1) + row * (width * 0.8) / cols + cellW / 2,
          z: 0
        };
      }
      return { x: width/2, y: height/2, z: 0 };
    };

    const simNodes = nodes.map((n, i) => {
      const pos = applyLayout(n, i, nodes.length);
      return { ...n, x: pos.x, y: pos.y, z: pos.z, vx: 0, vy: 0, vz: 0 };
    });

    const nodeMap = new Map(simNodes.map(n => [n.id, n]));

    const simLinks = links
      .map(l => ({
        ...l,
        sourceObj: nodeMap.get(l.source),
        targetObj: nodeMap.get(l.target)
      }))
      .filter(l => l.sourceObj && l.targetObj);

    simulationRef.current.nodes = simNodes;
    simulationRef.current.links = simLinks;
    
  }, [nodes, links, dimensions, layout]); 

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const sim = simulationRef.current;
    
    const maxVelocity = 10; 
    const repulsion = is3D ? 1500 : 1000;
    const springLen = 150;
    
    let iterations = 0;
    const maxIterations = 500;

    const tick = () => {
      const { width, height } = dimensions;
      const { camera } = sim;
      
      // A. Physics
      if ((layout === 'force' || layout === 'cluster') && (iterations < maxIterations || sim.isDragging || is3D)) {
        sim.nodes.forEach(n => { n.fx = 0; n.fy = 0; n.fz = 0; });

        for (let i = 0; i < sim.nodes.length; i++) {
          const n1 = sim.nodes[i];
          for (let j = i + 1; j < sim.nodes.length; j++) {
            const n2 = sim.nodes[j];
            const dx = n1.x - n2.x;
            const dy = n1.y - n2.y;
            const dz = is3D ? (n1.z - n2.z) : 0;
            const distSq = dx*dx + dy*dy + dz*dz || 1;
            if (distSq > 60000) continue; 

            let repStrength = repulsion;
            if (layout === 'cluster') repStrength *= 1.5;

            const force = repStrength / distSq;
            const dist = Math.sqrt(distSq);
            n1.fx += (dx/dist) * force;
            n1.fy += (dy/dist) * force;
            n1.fz += is3D ? (dz/dist) * force : 0;

            n2.fx -= (dx/dist) * force;
            n2.fy -= (dy/dist) * force;
            n2.fz -= is3D ? (dz/dist) * force : 0;
          }
        }

        sim.links.forEach(link => {
          const s = link.sourceObj;
          const t = link.targetObj;
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dz = is3D ? (t.z - s.z) : 0;
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
          
          let factor = 0.04;
          if (layout === 'cluster') {
              if (s.group !== t.group) factor = 0.002; 
              else factor = 0.08; 
          }
          
          const force = (dist - springLen) * factor;

          s.fx += (dx/dist) * force;
          s.fy += (dy/dist) * force;
          s.fz += is3D ? (dz/dist) * force : 0;

          t.fx -= (dx/dist) * factor;
          t.fy -= (dy/dist) * force;
          t.fz -= is3D ? (dz/dist) * force : 0;
        });

        // Dynamic Gravity
        sim.nodes.forEach(n => {
          if (n === sim.dragNode) return;

          if (layout === 'cluster' && sim.groupAngleMap) {
              const angle = sim.groupAngleMap.get(n.group);
              if (angle !== undefined) {
                  const cx = width/2 + (width * 0.32) * Math.cos(angle);
                  const cy = height/2 + (height * 0.32) * Math.sin(angle);
                  n.fx += (cx - n.x) * 0.10;
                  n.fy += (cy - n.y) * 0.10;
              }
          } else {
              n.fx += (width/2 - n.x) * 0.02;
              n.fy += (height/2 - n.y) * 0.02;
          }

          if (is3D) n.fz += (0 - n.z) * 0.02;

          if (!is3D) { n.z *= 0.9; n.vz *= 0.9; }

          const padding = 40;
          if (n.x < padding) n.fx += (padding - n.x) * 0.1;
          if (n.x > width - padding) n.fx -= (n.x - (width - padding)) * 0.1;
          if (n.y < padding) n.fy += (padding - n.y) * 0.1;
          if (n.y > height - padding) n.fy -= (n.y - (height - padding)) * 0.1;

          n.vx = (n.vx + n.fx) * 0.9;
          n.vy = (n.vy + n.fy) * 0.9;
          n.vz = (n.vz + (n.fz || 0)) * 0.9;

          const vSq = n.vx*n.vx + n.vy*n.vy + n.vz*n.vz;
          if (vSq > maxVelocity * maxVelocity) {
            const scale = maxVelocity / Math.sqrt(vSq);
            n.vx *= scale;
            n.vy *= scale;
            n.vz *= scale;
          }

          n.x += n.vx;
          n.y += n.vy;
          n.z += n.vz;
        });
        iterations++;
      }

      // B. Render
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#ffffff"; 
      ctx.fillRect(0, 0, width, height); 
      ctx.save();

      const project = (x, y, z) => {
        let px = x - width/2;
        let py = y - height/2;
        let pz = z;

        if (is3D) {
            const cosY = Math.cos(camera.angleY);
            const sinY = Math.sin(camera.angleY);
            const x1 = px * cosY - pz * sinY;
            const z1 = px * sinY + pz * cosY;
            px = x1; pz = z1;

            const cosX = Math.cos(camera.angleX);
            const sinX = Math.sin(camera.angleX);
            const y2 = py * cosX - pz * sinX;
            const z2 = py * sinX + pz * cosX;
            py = y2; pz = z2;
        }

        px += camera.x;
        py += camera.y;

        const fov = 800;
        const scale = (fov / (fov + pz)) * camera.zoom;
        
        return {
          x: px * scale + width/2,
          y: py * scale + height/2,
          scale: scale,
          depth: pz 
        };
      };

      sim.nodes.forEach(n => {
        n._proj = project(n.x, n.y, n.z);
      });

      const drawList = [];
      
      sim.links.forEach(l => {
        const p1 = l.sourceObj._proj;
        const p2 = l.targetObj._proj;
        if (p1.scale < 0 || p2.scale < 0) return;
        drawList.push({
          type: 'link',
          depth: (p1.depth + p2.depth) / 2,
          p1, p2,
          obj: l
        });
      });

      sim.nodes.forEach(n => {
        if (n._proj.scale < 0) return;
        drawList.push({
          type: 'node',
          depth: n._proj.depth,
          proj: n._proj,
          obj: n
        });
      });

      drawList.sort((a, b) => b.depth - a.depth);

      const isPathLink = (l) => {
        if (!pathData.path || pathData.path.length < 2) return false;
        for (let i = 0; i < pathData.path.length - 1; i++) {
          const u = pathData.path[i];
          const v = pathData.path[i+1];
          if ((l.source === u && l.target === v) || (l.source === v && l.target === u)) return true;
        }
        return false;
      };
      const isPathNode = (nId) => pathData.path && pathData.path.includes(nId);

      const labelsToDraw = [];

      drawList.forEach(item => {
        if (item.type === 'link') {
            const { p1, p2, obj: link } = item;
            
            let alpha = is3D ? 0.3 : 0.2; 
            let width = 1.5 * ((p1.scale + p2.scale)/2) * nodeScale; 
            
            const inPath = isPathLink(link);
            const isConnected = activeNode && (link.sourceObj.id === activeNode.id || link.targetObj.id === activeNode.id);

            if (analysisSettings.showRichClub) {
               const srcDeg = nodeDegrees.get(link.sourceObj.id) || 0;
               const tgtDeg = nodeDegrees.get(link.targetObj.id) || 0;
               if (srcDeg <= 5 || tgtDeg <= 5) alpha = 0.02; 
            }

            if (inPath) {
                alpha = 1;
                width = 4 * ((p1.scale + p2.scale)/2) * nodeScale;
            } else if (pathData.path.length > 0) {
                alpha = 0.02; 
            } else if (activeNode) {
               alpha = isConnected ? 0.8 : 0.02;
               if (isConnected) width = 2.5 * ((p1.scale + p2.scale)/2) * nodeScale;
            } else if (searchTerm) {
               const matches = link.sourceObj.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               link.targetObj.id.toLowerCase().includes(searchTerm.toLowerCase());
               alpha = matches ? 0.6 : 0.05;
            }

            let strokeStyle = null;
            if (analysisSettings.deltaMode && !inPath) {
                if (link.value > 0.001) strokeStyle = "#10b981"; 
                else if (link.value < -0.001) strokeStyle = "#ef4444"; 
                else alpha = 0.05; 
            }

            ctx.globalAlpha = Math.min(Math.max(alpha, 0), 1);
            ctx.lineWidth = Math.max(0.5, width);
            
            if (!strokeStyle) {
                const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                if (inPath) {
                    grad.addColorStop(0, '#f59e0b');
                    grad.addColorStop(1, '#f59e0b');
                } else {
                    // Helper to turn extremely light community colors into black for edges to ensure visibility
                    const getSafeEdgeColor = (hex) => {
                        const lightColors = ['#ffe119', '#bfef45', '#fabed4', '#dcbeff', '#fffac8', '#aaffc3', '#ffd8b1'];
                        return lightColors.includes(hex) ? '#000000' : hex;
                    };
                    
                    const c1 = colorMap.get(link.sourceObj.group) || '#94a3b8';
                    const c2 = colorMap.get(link.targetObj.group) || '#94a3b8';

                    grad.addColorStop(0, getSafeEdgeColor(c1));
                    grad.addColorStop(1, getSafeEdgeColor(c2));
                }
                strokeStyle = grad;
            }
            ctx.strokeStyle = strokeStyle;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

        } else if (item.type === 'node') {
            const { proj, obj: node } = item;
            
            const inPath = isPathNode(node.id);
            const isStart = node.id === pathData.start;
            const isEnd = node.id === pathData.end;
            const isSelected = activeNode && activeNode.id === node.id;
            const isMatch = searchTerm && node.id.toLowerCase().includes(searchTerm.toLowerCase());
            const isNeighbor = activeNode && sim.links.some(l => 
                (l.sourceObj.id === activeNode.id && l.targetObj.id === node.id) || 
                (l.sourceObj.id === node.id && l.targetObj.id === activeNode.id)
            );

            let alpha = 1;
            const degree = nodeDegrees.get(node.id) || 0;
            let radius = (3 + Math.min(degree * 0.25, 8)) * proj.scale * nodeScale;
            
            if (analysisSettings.showRichClub && degree <= 5) {
                alpha = 0.1;
                radius = 2 * proj.scale * nodeScale;
            }

            if (isSelected || isMatch || isStart || isEnd) radius = Math.max(radius, 8 * proj.scale * nodeScale);
            
            let color = colorMap.get(node.group) || '#6366f1';
            
            if (pathData.path.length > 0) {
               alpha = inPath ? 1 : 0.1;
               if (isStart) color = '#10b981'; 
               if (isEnd) color = '#ef4444'; 
            } else if (searchTerm) {
               alpha = isMatch ? 1 : 0.1;
            } else if (activeNode) {
               alpha = isSelected || isNeighbor ? 1 : 0.1;
            }

            const role = nodeRoles?.get(node.id);
            if (analysisSettings.showHubs) {
                if (role === 'connector') {
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = "#f59e0b"; 
                    ctx.beginPath();
                    ctx.moveTo(proj.x, proj.y - radius*1.5);
                    ctx.lineTo(proj.x + radius*1.5, proj.y);
                    ctx.lineTo(proj.x, proj.y + radius*1.5);
                    ctx.lineTo(proj.x - radius*1.5, proj.y);
                    ctx.closePath();
                    ctx.fill();
                    
                    labelsToDraw.push({ node, proj, isSelected, inPath, isMatch, isNeighbor, radius: radius*1.5, role });
                    return; 
                } 
            }

            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, Math.max(0, radius), 0, 2 * Math.PI);
            ctx.fill();
            
            if (isSelected || isStart || isEnd || (analysisSettings.showHubs && role === 'provincial')) {
                ctx.strokeStyle = role === 'provincial' ? "#000" : "#fff";
                ctx.lineWidth = (role === 'provincial' ? 1 : 2) * proj.scale;
                ctx.stroke();
                if (isSelected) {
                    ctx.strokeStyle = "#000";
                    ctx.lineWidth = 1 * proj.scale;
                    ctx.stroke();
                }
            }

            const showLabel = isSelected || isMatch || inPath || (proj.scale > 0.6 && (isNeighbor || (!activeNode && !searchTerm && pathData.path.length === 0 && !analysisSettings.showRichClub)));
            if (showLabel) {
                labelsToDraw.push({ node, proj, isSelected, inPath, isMatch, isNeighbor, radius, role });
            }
        }
      });

      // --- Smart Label Rendering (Anti-Collision & Sizing) ---
      labelsToDraw.sort((a, b) => {
          const scoreA = (a.isSelected ? 10000 : 0) + (a.isMatch ? 1000 : 0) + (a.inPath ? 100 : 0) + (a.isNeighbor ? 10 : 0) + a.proj.scale;
          const scoreB = (b.isSelected ? 10000 : 0) + (b.isMatch ? 1000 : 0) + (b.inPath ? 100 : 0) + (b.isNeighbor ? 10 : 0) + b.proj.scale;
          return scoreB - scoreA;
      });

      const drawnBoxes = [];
      ctx.globalAlpha = 1;

      labelsToDraw.forEach(label => {
          const fontSize = Math.max(12, 16 * label.proj.scale); 
          ctx.font = `${label.isSelected || label.inPath ? "bold " : ""}${fontSize}px sans-serif`;
          
          const textWidth = ctx.measureText(label.node.id).width;
          const textHeight = fontSize; 
          const lx = label.proj.x;
          const ly = label.proj.y - label.radius - 6; 
          
          const padding = 2;
          const box = {
              l: lx - textWidth / 2 - padding,
              r: lx + textWidth / 2 + padding,
              t: ly - textHeight - padding,
              b: ly + padding
          };

          let collision = false;
          if (!label.isSelected && !label.isMatch && !label.inPath && !label.isNeighbor) {
              for (const dBox of drawnBoxes) {
                  if (!(box.r < dBox.l || box.l > dBox.r || box.b < dBox.t || box.t > dBox.b)) {
                      collision = true;
                      break;
                  }
              }
          }

          if (!collision) {
              ctx.lineWidth = 3;
              ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
              ctx.strokeText(label.node.id, lx, ly);

              ctx.fillStyle = label.isSelected || label.inPath ? "#000" : (is3D ? "#1e293b" : "#475569");
              ctx.textAlign = "center";
              ctx.fillText(label.node.id, lx, ly);
              drawnBoxes.push(box);
          }
      });

      ctx.restore();
      sim.animationId = requestAnimationFrame(tick);
    };

    sim.animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(sim.animationId);
  }, [dimensions, activeNode, searchTerm, nodes, layout, colorMap, nodeDegrees, is3D, pathData, analysisSettings, nodeRoles, nodeScale]); 

  const handleWheel = (e) => {
    e.preventDefault();
    const sim = simulationRef.current;
    const scaleAmount = -e.deltaY * 0.001;
    sim.camera.zoom = Math.max(0.1, Math.min(6, sim.camera.zoom * (1 + scaleAmount)));
  };

  const handleMouseDown = (e) => {
    const sim = simulationRef.current;
    sim.isDragging = true;
    sim.lastMouse = { x: e.clientX, y: e.clientY };
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let bestNode = null;
    let maxDist = 20;

    sim.nodes.forEach(n => {
       if (!n._proj) return;
       const dist = Math.sqrt((n._proj.x - mx)**2 + (n._proj.y - my)**2);
       if (dist < maxDist) { bestNode = n; maxDist = dist; }
    });

    if (bestNode) {
      if (e.button === 2) { 
         onNodeRightClick && onNodeRightClick(nodes.find(n => n.id === bestNode.id));
      } else {
         sim.dragNode = bestNode; 
         onNodeClick(nodes.find(n => n.id === bestNode.id));
      }
    } else {
       sim.dragNode = null; 
    }
  };

  const handleMouseMove = (e) => {
    const sim = simulationRef.current;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setHoverPos({ x: mx, y: my });

    if (!sim.isDragging) {
        let bestNode = null;
        let maxDist = 15;
        sim.nodes.forEach(n => {
          if (!n._proj) return;
          const dist = Math.sqrt((n._proj.x - mx)**2 + (n._proj.y - my)**2);
          if (dist < maxDist) { bestNode = n; maxDist = dist; }
        });
        setHoveredNode(bestNode ? nodes.find(n => n.id === bestNode.id) : null);
        return;
    }

    const dx = e.clientX - sim.lastMouse.x;
    const dy = e.clientY - sim.lastMouse.y;
    sim.lastMouse = { x: e.clientX, y: e.clientY };

    if (sim.dragNode && !is3D) {
        sim.dragNode.x += dx / sim.camera.zoom;
        sim.dragNode.y += dy / sim.camera.zoom;
        sim.dragNode.vx = 0; sim.dragNode.vy = 0;
    } else {
        if (is3D) {
            sim.camera.angleY += dx * 0.01; 
            sim.camera.angleX += dy * 0.01; 
            sim.camera.angleX = Math.max(-Math.PI/2, Math.min(Math.PI/2, sim.camera.angleX));
        } else {
            sim.camera.x += dx / sim.camera.zoom;
            sim.camera.y += dy / sim.camera.zoom;
        }
    }
  };

  const handleMouseUp = () => {
    simulationRef.current.isDragging = false;
    simulationRef.current.dragNode = null;
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden relative group" onContextMenu={(e) => e.preventDefault()}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ display: 'block', width: '100%', height: '100%' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setHoveredNode(null); }}
        onWheel={handleWheel}
        className={`cursor-move ${is3D ? 'cursor-grab active:cursor-grabbing' : ''}`}
      />
      
      {/* Absolute Header Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
         <div className="flex items-center space-x-2">
           <button 
             onClick={recenterCamera}
             className="p-1.5 bg-white/90 dark:bg-slate-800/90 text-slate-500 hover:text-indigo-600 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 transition-colors"
             title="Recenter Camera"
           >
             <Focus className="w-4 h-4" />
           </button>
           {is3D && <div className="px-3 py-1 bg-black/50 text-white text-xs rounded-full backdrop-blur-sm pointer-events-none">3D Mode</div>}
           {analysisSettings.deltaMode && <div className="px-3 py-1 bg-emerald-600/90 text-white text-xs font-bold rounded-full backdrop-blur-sm shadow-lg animate-pulse">Delta View</div>}
         </div>
      </div>

      <div className="absolute bottom-4 left-4 text-xs text-slate-400 bg-white/80 dark:bg-slate-800/80 p-2 rounded backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          {is3D ? "Drag to Rotate • Scroll to Zoom" : "Drag to Pan • Scroll to Zoom"}
          {analysisSettings.lesionMode && <span className="block text-red-500 font-bold">Right-click node to Lesion</span>}
      </div>

      {hoveredNode && (
        <div 
          className="absolute z-50 pointer-events-none bg-slate-900/90 text-white text-xs px-2 py-1.5 rounded shadow-lg backdrop-blur-sm transform -translate-x-1/2 -translate-y-full"
          style={{ left: hoverPos.x, top: hoverPos.y - 10 }}
        >
          <div className="font-bold">{hoveredNode.id}</div>
          <div className="text-slate-300 text-[10px]">
             {hoveredNode.community} (Group {hoveredNode.group}) • {nodeRoles?.get(hoveredNode.id) === 'connector' ? 'Connector Hub' : 'Region'}
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  // --- VERSION CONTROL STATE ---
  const [versions, setVersions] = useState([]);
  const [activeVersionId, setActiveVersionId] = useState(''); 
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize with Fetching Local Public Files (AnyNet JSONs)
  useEffect(() => {
    const loadDefaultData = async () => {
      try {
        // BUG FIX for GitHub Pages Deployment: 
        // Removed leading '/' to make paths relative to the repo sub-directory.
        const [restCorticalRes, restRes, stimCorticalRes, stimRes] = await Promise.all([
          fetch('brain_data_anynet_rest_cortical.json'),
          fetch('brain_data_anynet_rest.json'),
          fetch('brain_data_anynet_stim_cortical.json'),
          fetch('brain_data_anynet_stim.json')
        ]);
        
        if (!restCorticalRes.ok || !restRes.ok || !stimCorticalRes.ok || !stimRes.ok) {
           throw new Error("One or more local files not found");
        }
        
        const restCorticalData = await restCorticalRes.json();
        const restData = await restRes.json();
        const stimCorticalData = await stimCorticalRes.json();
        const stimData = await stimRes.json();

        [restCorticalData.nodes, restData.nodes, stimCorticalData.nodes, stimData.nodes].forEach(nodes => {
           if (!nodes) return;
           nodes.forEach(n => {
              n.group = parseInt(n.group, 10); 
              if (n.community === 'Unknown' || n.group === -1 || (n.group === 0 && n.community === 'Unknown')) {
                 n.group = -1;
                 n.community = 'Community -1';
              } else {
                 n.community = `Community ${n.group}`;
              }
           });
        });

        setVersions([
          { id: 'rest_cortical', name: 'AnyNet - Rest (Cortical Only)', data: restCorticalData },
          { id: 'rest_full', name: 'AnyNet - Rest (Full)', data: restData },
          { id: 'stim_cortical', name: 'AnyNet - Stim (Cortical Only)', data: stimCorticalData },
          { id: 'stim_full', name: 'AnyNet - Stim (Full)', data: stimData }
        ]);
        setActiveVersionId('rest_cortical');

      } catch (err) {
        console.log("Local JSON files not found. Using fallback mock for preview window.");
        const mockNodes = Array.from({ length: 472 }).map((_, i) => ({ 
            id: `Region-${i}`, group: i % 10, community: `Community ${i % 10}` 
        }));
        const mockRestLinks = Array.from({ length: 472 }).map((_, i) => ({ 
            source: `Region-${i}`, target: `Region-${(i + 3) % 472}`, value: Math.random() 
        }));
        const mockStimLinks = Array.from({ length: 472 }).map((_, i) => ({ 
            source: `Region-${i}`, target: `Region-${(i + 5) % 472}`, value: Math.random() * 1.5 
        }));

        setVersions([
          { id: 'rest_cortical', name: 'AnyNet - Rest (Cortical Mock)', data: { nodes: mockNodes, links: mockRestLinks } },
          { id: 'rest_full', name: 'AnyNet - Rest (Full Mock)', data: { nodes: mockNodes, links: mockRestLinks } },
          { id: 'stim_cortical', name: 'AnyNet - Stim (Cortical Mock)', data: { nodes: mockNodes, links: mockStimLinks } },
          { id: 'stim_full', name: 'AnyNet - Stim (Full Mock)', data: { nodes: mockNodes, links: mockStimLinks } }
        ]);
        setActiveVersionId('rest_cortical');
      }
    };
    
    loadDefaultData();
  }, []);

  const [internalThreshold, setInternalThreshold] = useState(0.05); 
  const [crossThreshold, setCrossThreshold] = useState(0.05);
  const [hideBelowThreshold, setHideBelowThreshold] = useState(true); 
  const [nodeScale, setNodeScale] = useState(1.0); 
  const [layout, setLayout] = useState('cluster'); 
  const [is3D, setIs3D] = useState(false); 
  const [showMatrix, setShowMatrix] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [hiddenGroups, setHiddenGroups] = useState(new Set([-1])); 
  
  const [mode, setMode] = useState('explore'); 
  const [lesionedNodes, setLesionedNodes] = useState(new Set());
  
  const [deltaMode, setDeltaMode] = useState(false);
  const [deltaBaseId, setDeltaBaseId] = useState('rest_cortical'); 
  const [deltaTargetId, setDeltaTargetId] = useState('stim_cortical'); 
  
  const [showHubs, setShowHubs] = useState(false);
  const [showRichClub, setShowRichClub] = useState(false);

  const [pathStart, setPathStart] = useState(null);
  const [pathEnd, setPathEnd] = useState(null);
  const [path, setPath] = useState([]);
  const [startSearch, setStartSearch] = useState("");
  const [endSearch, setEndSearch] = useState("");

  const snapshotRef = useRef(null);

  const graphData = useMemo(() => {
    if (deltaMode) {
        const baseData = versions.find(v => v.id === deltaBaseId)?.data;
        const targetData = versions.find(v => v.id === deltaTargetId)?.data;

        if (baseData && targetData) {
            const nodeMap = new Map();
            baseData.nodes.forEach(n => nodeMap.set(n.id, { ...n }));
            targetData.nodes.forEach(n => { if (!nodeMap.has(n.id)) nodeMap.set(n.id, { ...n }); });
            const mergedNodes = Array.from(nodeMap.values());

            const mapBase = new Map(baseData.links.map(l => [`${l.source}-${l.target}`, l.value]));
            const links = [];
            
            const allLinks = new Set([
                ...baseData.links.map(l => `${l.source}-${l.target}`), 
                ...targetData.links.map(l => `${l.source}-${l.target}`)
            ]);
            
            allLinks.forEach(key => {
                const [s, t] = key.split('-');
                const valBase = mapBase.get(key) || mapBase.get(`${t}-${s}`) || 0;
                
                const foundTarget = targetData.links.find(l => (l.source === s && l.target === t) || (l.source === t && l.target === s));
                const valTarget = foundTarget ? foundTarget.value : 0;
                
                const diff = valTarget - valBase;
                if (Math.abs(diff) > 0.001) {
                    links.push({ source: s, target: t, value: diff });
                }
            });
            return { nodes: mergedNodes, links };
        }
    }

    return versions.find(v => v.id === activeVersionId)?.data || { nodes: [], links: [] };
  }, [versions, activeVersionId, deltaMode, deltaBaseId, deltaTargetId]);

  const activeLinks = useMemo(() => {
      const nodeGroupMap = new Map(graphData.nodes.map(n => [n.id, n.group]));
      return graphData.links.filter(l => {
          // --- BUG FIX: Completely discard edges involving Lesioned or Hidden Nodes ---
          if (lesionedNodes.has(l.source) || lesionedNodes.has(l.target)) return false;

          const sGroup = nodeGroupMap.get(l.source);
          const tGroup = nodeGroupMap.get(l.target);
          
          if (hiddenGroups.has(sGroup) || hiddenGroups.has(tGroup)) return false;
          // -------------------------------------------------------------------------

          const val = deltaMode ? Math.abs(l.value) : l.value;
          if (sGroup === tGroup) return val >= internalThreshold;
          return val >= crossThreshold;
      });
  }, [graphData.links, internalThreshold, crossThreshold, deltaMode, graphData.nodes, hiddenGroups, lesionedNodes]);

  const nodeDegrees = useMemo(() => {
    const degrees = new Map();
    activeLinks.forEach(link => {
       degrees.set(link.source, (degrees.get(link.source) || 0) + 1);
       degrees.set(link.target, (degrees.get(link.target) || 0) + 1);
    });
    return degrees;
  }, [activeLinks]);

  const visibleNodes = useMemo(() => {
    let baseNodes = graphData.nodes;
    if (lesionedNodes.size > 0) baseNodes = baseNodes.filter(n => !lesionedNodes.has(n.id));
    if (hiddenGroups.size > 0) baseNodes = baseNodes.filter(n => !hiddenGroups.has(n.group));
    
    if (hideBelowThreshold) {
        const validNodeIds = new Set(baseNodes.map(n => n.id));
        const connected = new Set();
        activeLinks.forEach(l => { 
            if (validNodeIds.has(l.source) && validNodeIds.has(l.target)) {
                connected.add(l.source); 
                connected.add(l.target); 
            }
        });
        baseNodes = baseNodes.filter(n => connected.has(n.id));
    }
    
    return baseNodes;
  }, [graphData.nodes, activeLinks, hideBelowThreshold, hiddenGroups, lesionedNodes]);

  const metrics = useMemo(() => {
      if (mode !== 'analysis' && !lesionedNodes.size) return null;
      return calculateGraphMetrics(visibleNodes, activeLinks);
  }, [visibleNodes, activeLinks, mode, lesionedNodes]);

  const nodeRoles = useMemo(() => {
      if (!showHubs) return null;
      return calculateHubRoles(visibleNodes, activeLinks, nodeDegrees);
  }, [visibleNodes, activeLinks, nodeDegrees, showHubs]);

  const hubCommunity = useMemo(() => {
    if (visibleNodes.length === 0 || activeLinks.length === 0) return null;

    const nodeGroupMap = new Map(visibleNodes.map(n => [n.id, n.group]));
    
    const globalWeights = new Map();
    const crossWeights = new Map();
    const innerWeights = new Map();

    activeLinks.forEach(link => {
      const s = typeof link.source === 'object' ? link.source.id : link.source;
      const t = typeof link.target === 'object' ? link.target.id : link.target;

      const sGroup = nodeGroupMap.get(s);
      const tGroup = nodeGroupMap.get(t);

      if (sGroup !== undefined && tGroup !== undefined) {
          const val = Math.abs(link.value); 
          
          globalWeights.set(sGroup, (globalWeights.get(sGroup) || 0) + val);
          globalWeights.set(tGroup, (globalWeights.get(tGroup) || 0) + val);

          if (sGroup !== tGroup) {
              crossWeights.set(sGroup, (crossWeights.get(sGroup) || 0) + val);
              crossWeights.set(tGroup, (crossWeights.get(tGroup) || 0) + val);
          } else {
              innerWeights.set(sGroup, (innerWeights.get(sGroup) || 0) + (val * 2));
          }
      }
    });

    const getWinner = (weightMap) => {
        let maxWeight = -1;
        let hubId = null;

        weightMap.forEach((weight, groupId) => {
          if (weight > maxWeight) {
            maxWeight = weight;
            hubId = groupId;
          }
        });

        if (hubId === null) return null;
        
        const hubNode = visibleNodes.find(n => n.group === hubId);
        const displayName = hubNode ? hubNode.community : `Community ${hubId}`;
        
        return {
           id: hubId,
           name: displayName,
           weight: maxWeight
        };
    };

    return {
       globalHub: getWinner(globalWeights),
       crossHub: getWinner(crossWeights),
       innerHub: getWinner(innerWeights)
    };
  }, [visibleNodes, activeLinks]);

  const colorMap = useMemo(() => generateColorMap(graphData.nodes), [graphData.nodes]);
  
  const uniqueCommunities = useMemo(() => {
    const groups = new Map();
    graphData.nodes.forEach(n => {
       if (!groups.has(n.group)) groups.set(n.group, []);
       groups.get(n.group).push(n);
    });
    const communities = [];
    Array.from(groups.keys()).sort((a,b) => a - b).forEach(groupId => {
      const displayName = groups.get(groupId)[0].community || `Community ${groupId}`;
      communities.push([groupId, displayName]);
    });
    return communities;
  }, [graphData.nodes]);

  const toggleGroup = (groupId) => {
    const allGroupIds = uniqueCommunities.map(c => c[0]);
    
    if (hiddenGroups.size === 0) {
      const newHidden = new Set(allGroupIds.filter(id => id !== groupId));
      setHiddenGroups(newHidden);
    } else {
      const newHidden = new Set(hiddenGroups);
      if (newHidden.has(groupId)) newHidden.delete(groupId); 
      else newHidden.add(groupId); 
      
      if (newHidden.size === allGroupIds.length) setHiddenGroups(new Set());
      else setHiddenGroups(newHidden);
    }
  };

  const handleNodeClick = (node) => {
    if (mode === 'path') {
      if (!pathStart) { setPathStart(node.id); setStartSearch(node.id); }
      else if (!pathEnd) { setPathEnd(node.id); setEndSearch(node.id); }
      else { setPathStart(node.id); setStartSearch(node.id); setPathEnd(null); setEndSearch(""); setPath([]); }
    } else {
      setSelectedNode(node);
    }
  };

  const handleLesion = (node) => {
      if (!analysisSettings.lesionMode) return;
      const newLesions = new Set(lesionedNodes);
      if (newLesions.has(node.id)) newLesions.delete(node.id);
      else newLesions.add(node.id);
      setLesionedNodes(newLesions);
  };

  useEffect(() => {
    if (pathStart && pathEnd) {
      const calculatedPath = findShortestPath(visibleNodes, activeLinks, pathStart, pathEnd);
      setPath(calculatedPath);
    } else {
      setPath([]);
    }
  }, [pathStart, pathEnd, visibleNodes, activeLinks]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (json.nodes && Array.isArray(json.nodes)) {
          json.nodes.forEach(n => {
              n.group = parseInt(n.group, 10); 
              if (n.community === 'Unknown' || n.group === -1 || (n.group === 0 && n.community === 'Unknown')) {
                 n.group = -1;
                 n.community = 'Community -1';
              } else {
                 n.community = `Community ${n.group}`;
              }
          });

          const newVersionId = `v${Date.now()}`;
          const newVersion = {
              id: newVersionId,
              name: file.name.replace('.json', ''),
              data: { nodes: json.nodes, links: json.links || [] }
          };

          setVersions(prev => [...prev, newVersion]);
          setActiveVersionId(newVersionId);
          setDeltaMode(false);
          
          let initialThreshold = 0;
          if (json.links && json.links.length > 2000) {
             const values = json.links.map(l => l.value).sort((a,b) => b-a);
             if (values.length > 1000) initialThreshold = values[1000];
          }
          setInternalThreshold(initialThreshold);
          setCrossThreshold(initialThreshold);
          setSelectedNode(null);
          setHiddenGroups(new Set([-1])); 
        } else { alert("Invalid JSON format."); }
      } catch (err) { alert("Failed to parse JSON file."); }
      if(fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const analysisSettings = { showHubs, showRichClub, deltaMode, lesionMode: mode === 'analysis' };

  const handleVersionChange = (newVersionId) => {
    if (hiddenGroups.size > 0 && graphData.nodes) {
      const currentVisibleNodeIds = new Set(
        graphData.nodes
          .filter(n => !hiddenGroups.has(n.group))
          .map(n => n.id)
      );

      const newVersionData = versions.find(v => v.id === newVersionId)?.data;
      if (newVersionData && newVersionData.nodes) {
        const newVisibleGroups = new Set();
        newVersionData.nodes.forEach(n => {
          if (currentVisibleNodeIds.has(n.id)) {
            newVisibleGroups.add(n.group);
          }
        });

        const allNewGroups = new Set(newVersionData.nodes.map(n => n.group));
        const newHidden = new Set([...allNewGroups].filter(g => !newVisibleGroups.has(g)));
        newHidden.add(-1);
        setHiddenGroups(newHidden);
      }
    }
    setActiveVersionId(newVersionId);
    setDeltaMode(false);
  };

  const activeVersionName = versions.find(v => v.id === activeVersionId)?.name || 'Select Version';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans flex flex-col">
      
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10 shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Brain className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">BrainNet <span className="text-slate-400 font-light">Ultra</span></h1>
              <p className="text-[10px] text-slate-500 font-medium">VERSION CONTROL</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             
             {/* DYNAMIC VERSION MANAGER */}
             <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm relative">
                <GitCommit className="w-4 h-4 text-slate-400 mr-2 ml-1" />
                
                {/* CUSTOM DROPDOWN */}
                <div className="relative" onMouseLeave={() => setVersionMenuOpen(false)}>
                  <button 
                    onClick={() => setVersionMenuOpen(!versionMenuOpen)}
                    className="flex items-center bg-transparent text-sm font-bold text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer w-48 text-left hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                  >
                    <span className="truncate flex-grow">{activeVersionName}</span>
                    <ChevronDown className="w-3 h-3 ml-1 shrink-0" />
                  </button>
                  
                  {versionMenuOpen && (
                    <div className="absolute left-0 top-full pt-2 z-50">
                      <div className="w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-sm py-1">
                         {versions.map(v => (
                            <button 
                              key={v.id} 
                              onClick={() => {
                                handleVersionChange(v.id);
                                setVersionMenuOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                                activeVersionId === v.id 
                                  ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' 
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {v.name}
                            </button>
                         ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-px h-4 bg-slate-300 dark:bg-slate-500 mx-2"></div>
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="px-2 py-1 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center"
                  title="Upload New Version"
                >
                  <Plus className="w-3 h-3 mr-1" /> New
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".json" />
             </div>

             <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-lg flex space-x-1 hidden sm:flex">
                <button onClick={() => setIs3D(false)} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${!is3D ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`} title="2D View"><Grid3X3 className="w-4 h-4" /></button>
                <button onClick={() => setIs3D(true)} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${is3D ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`} title="3D View"><Box className="w-4 h-4" /></button>
             </div>

             <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

             <div className="relative hidden md:block w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input 
                    list="header-search-nodes"
                    type="text" 
                    placeholder="Search regions..." 
                    className="w-full bg-slate-100 dark:bg-slate-700 pl-9 pr-8 py-2 rounded-full text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        const match = visibleNodes.find(n => n.id === e.target.value);
                        if (match) setSelectedNode(match);
                    }}
                />
                {searchTerm && (
                    <button onClick={() => { setSearchTerm(''); setSelectedNode(null); }} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                    </button>
                )}
                <datalist id="header-search-nodes">
                    {visibleNodes.map((n, idx) => <option key={`${n.id}-${idx}`} value={n.id} />)}
                </datalist>
             </div>

             <div className="relative" onMouseLeave={() => setExportMenuOpen(false)}>
                <button 
                  onClick={() => setExportMenuOpen(!exportMenuOpen)} 
                  className="flex items-center p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" 
                  title="Export Image"
                >
                  <Camera className="w-5 h-5" />
                  <ChevronDown className="w-3 h-3 ml-1" />
                </button>
                {exportMenuOpen && (
                  <div className="absolute right-0 top-full pt-2 z-50">
                    <div className="w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-sm py-1">
                       <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium" onClick={() => { snapshotRef.current?.('png'); setExportMenuOpen(false); }}>Download PNG</button>
                       <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium" onClick={() => { snapshotRef.current?.('jpeg'); setExportMenuOpen(false); }}>Download JPEG</button>
                       <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium" onClick={() => { snapshotRef.current?.('svg'); setExportMenuOpen(false); }}>Download SVG Vector</button>
                       <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium" onClick={() => { snapshotRef.current?.('pdf'); setExportMenuOpen(false); }}>Print / PDF</button>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 gap-4 overflow-hidden h-[calc(100vh-64px)]">
        
        {/* Left Panel */}
        <aside className="w-full lg:w-80 flex flex-col gap-4 overflow-hidden shrink-0 h-full">
          
          <Card className="p-2 shrink-0 flex justify-between bg-slate-100 dark:bg-slate-800">
             {['explore', 'path', 'analysis'].map(m => (
               <button 
                 key={m}
                 onClick={() => setMode(m)}
                 className={`flex-1 py-2 text-xs font-bold rounded-md capitalize flex justify-center items-center ${mode === m ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
               >
                 {m === 'explore' && <MousePointer2 className="w-3 h-3 mr-1" />}
                 {m === 'path' && <Navigation className="w-3 h-3 mr-1" />}
                 {m === 'analysis' && <Activity className="w-3 h-3 mr-1" />}
                 {m}
               </button>
             ))}
          </Card>

          {/* MODE: ANALYSIS */}
          {mode === 'analysis' && (
            <Card className="p-5 shrink-0 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 overflow-y-auto max-h-[45vh] custom-scrollbar">
               <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                 <Activity className="w-3 h-3 mr-2" /> Network Analysis
               </h2>
               
               {/* 1. Delta View */}
               <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                 <label className="flex items-center justify-between cursor-pointer mb-2">
                     <span className="text-xs font-bold flex items-center"><GitCompare className="w-3 h-3 mr-1"/> Compare Versions</span>
                     <div className="relative inline-block w-8 h-4 align-middle select-none">
                       <input type="checkbox" className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer" checked={deltaMode} onChange={(e) => setDeltaMode(e.target.checked)}/>
                       <label className={`toggle-label block overflow-hidden h-4 rounded-full cursor-pointer ${deltaMode ? 'bg-indigo-600' : 'bg-slate-300'}`}></label>
                     </div>
                 </label>
                 
                 {deltaMode && (
                   <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg text-xs space-y-2 mt-2">
                     <div className="flex flex-col space-y-2">
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold text-slate-400">TARGET</span>
                           <select value={deltaTargetId} onChange={(e) => setDeltaTargetId(e.target.value)} className="bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded px-2 py-1 w-32 truncate">
                              {versions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                           </select>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold text-slate-400">MINUS BASE</span>
                           <select value={deltaBaseId} onChange={(e) => setDeltaBaseId(e.target.value)} className="bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded px-2 py-1 w-32 truncate">
                              {versions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                           </select>
                        </div>
                     </div>
                     <div className="flex justify-between text-[10px] text-slate-500 px-1 pt-2 border-t border-slate-200 dark:border-slate-600">
                        <span className="text-emerald-500 font-bold">● Strengthened</span>
                        <span className="text-rose-500 font-bold">● Weakened</span>
                     </div>
                   </div>
                 )}
               </div>

               {/* 2. Hubs & Rich Club */}
               <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700 space-y-2">
                 <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="w-3 h-3 rounded" checked={showHubs} onChange={(e) => setShowHubs(e.target.checked)} />
                    <span className="text-xs">Highlight Hubs (Part. Coeff)</span>
                 </label>
                 <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="w-3 h-3 rounded" checked={showRichClub} onChange={(e) => setShowRichClub(e.target.checked)} />
                    <span className="text-xs">Show Rich Club (Top 20%)</span>
                 </label>
               </div>

               {/* 3. Lesion Mode */}
               <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                 <div className="text-xs font-bold text-red-500 mb-2 flex items-center">
                    <Skull className="w-3 h-3 mr-1" /> Virtual Lesion
                 </div>
                 <p className="text-[10px] text-slate-500 mb-2">Right-click nodes to remove them and simulate damage.</p>
                 <div className="flex flex-wrap gap-1">
                    {Array.from(lesionedNodes).map(id => (
                      <span key={id} className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] rounded-full flex items-center">
                        {id} <button onClick={() => { const s = new Set(lesionedNodes); s.delete(id); setLesionedNodes(s); }} className="ml-1 hover:text-red-800">×</button>
                      </span>
                    ))}
                    {lesionedNodes.size === 0 && <span className="text-[10px] text-slate-400 italic">No lesions active</span>}
                 </div>
               </div>

               {/* 4. Scorecard */}
               <div>
                 <div className="text-xs font-bold text-slate-500 mb-3">Network Scorecard</div>
                 
                 {/* Hub Community Display */}
                 {hubCommunity && (
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50 mb-4 shadow-sm flex flex-col gap-2.5">
                       <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1.5">Dominant Hub Communities</div>
                       
                       {/* Global Hub */}
                       {hubCommunity.globalHub && (
                          <div className="flex items-center justify-between">
                             <div>
                               <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Overall Connections</div>
                               <div className="flex items-center">
                                  <div className="w-2.5 h-2.5 rounded-full mr-2 shadow-sm" style={{ backgroundColor: colorMap.get(hubCommunity.globalHub.id) }}></div>
                                  <span className="font-bold text-xs text-slate-700 dark:text-slate-200 truncate max-w-[130px]" title={hubCommunity.globalHub.name}>
                                     {hubCommunity.globalHub.name}
                                  </span>
                               </div>
                             </div>
                             <div className="font-mono text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                {hubCommunity.globalHub.weight.toFixed(2)}
                             </div>
                          </div>
                       )}

                       {/* Cross Hub */}
                       {hubCommunity.crossHub && (
                          <div className="flex items-center justify-between">
                             <div>
                               <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Cross-Community</div>
                               <div className="flex items-center">
                                  <div className="w-2.5 h-2.5 rounded-full mr-2 shadow-sm" style={{ backgroundColor: colorMap.get(hubCommunity.crossHub.id) }}></div>
                                  <span className="font-bold text-xs text-slate-700 dark:text-slate-200 truncate max-w-[130px]" title={hubCommunity.crossHub.name}>
                                     {hubCommunity.crossHub.name}
                                  </span>
                               </div>
                             </div>
                             <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                {hubCommunity.crossHub.weight.toFixed(2)}
                             </div>
                          </div>
                       )}

                       {/* Inner Hub */}
                       {hubCommunity.innerHub && (
                          <div className="flex items-center justify-between">
                             <div>
                               <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Inner-Community</div>
                               <div className="flex items-center">
                                  <div className="w-2.5 h-2.5 rounded-full mr-2 shadow-sm" style={{ backgroundColor: colorMap.get(hubCommunity.innerHub.id) }}></div>
                                  <span className="font-bold text-xs text-slate-700 dark:text-slate-200 truncate max-w-[130px]" title={hubCommunity.innerHub.name}>
                                     {hubCommunity.innerHub.name}
                                  </span>
                               </div>
                             </div>
                             <div className="font-mono text-amber-600 dark:text-amber-500 font-bold text-sm">
                                {hubCommunity.innerHub.weight.toFixed(2)}
                             </div>
                          </div>
                       )}
                    </div>
                 )}

                 <div className="space-y-4">
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Core Topology</div>
                        <div className="grid grid-cols-3 gap-2">
                            <MetricBox label="Efficiency" value={metrics?.efficiency} tooltip="Measures how efficiently information is exchanged. Higher = better global integration." assessFn={evalEfficiency} colorClass="text-blue-600 dark:text-blue-400" />
                            <MetricBox label="Clustering" value={metrics?.clustering} tooltip="Measures local neighborhood density. Higher = stronger local cliques." assessFn={evalClustering} colorClass="text-blue-600 dark:text-blue-400" />
                            <MetricBox label="Density" value={metrics?.density} tooltip="Fraction of actual edges vs possible edges." assessFn={evalDensity} colorClass="text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Hubs & Centrality</div>
                        <div className="grid grid-cols-3 gap-2">
                            <MetricBox label="Centralization" value={metrics?.centralization} tooltip="1.0 = Star network. 0.0 = Uniform. Measures if the network relies on a few central hubs." assessFn={evalCentralization} colorClass="text-emerald-600 dark:text-emerald-400" />
                            <MetricBox label="Assortativity" value={metrics?.assortativity} tooltip="Positive = Hubs connect to Hubs (Rich-Club). Negative = Hubs connect to non-hubs." assessFn={evalAssortativity} colorClass="text-emerald-600 dark:text-emerald-400" />
                            <MetricBox label="Avg Part. Coeff" value={metrics?.avgPC} tooltip="High = Nodes connect evenly across different communities. Low = Nodes connect only internally." assessFn={evalAvgPC} colorClass="text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Network Architecture</div>
                        <div className="grid grid-cols-3 gap-2">
                            <MetricBox label="Small-World (σ)" value={metrics?.smallWorld} tooltip="> 1.0 indicates a Small World network (high local clustering but short global paths)." assessFn={evalSmallWorld} colorClass="text-purple-600 dark:text-purple-400" />
                            <MetricBox label="Scale-Free (γ)" value={metrics?.powerLaw} tooltip="Between 2 and 3 indicates a scale-free network governed by strict power-law hubs." assessFn={evalPowerLaw} colorClass="text-purple-600 dark:text-purple-400" />
                            <MetricBox label="Modularity (Q)" value={metrics?.modQ} tooltip="> 0.3 indicates strong community structures. (Aligned directly with Python Resolution=1.0)." assessFn={evalModularity} colorClass="text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                 </div>

               </div>
            </Card>
          )}

          {/* MODE: PATHFINDING */}
          {mode === 'path' && (
            <Card className="p-5 shrink-0 bg-indigo-50 border-indigo-100 dark:bg-slate-800 dark:border-slate-700">
               <h2 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2 flex items-center">
                 <Navigation className="w-3 h-3 mr-2" /> Pathfinding
               </h2>
               <div className="space-y-3 text-sm">
                 <div className="relative">
                   <span className="text-xs text-slate-500 mb-1 block">Start Node</span>
                   <input list="nodes-list" className="w-full p-2 text-sm border border-slate-300 rounded" placeholder="Start..." value={startSearch} onChange={(e) => { setStartSearch(e.target.value); const match = visibleNodes.find(n => n.id === e.target.value); if (match) setPathStart(match.id); }} />
                 </div>
                 <div className="relative">
                   <span className="text-xs text-slate-500 mb-1 block">End Node</span>
                   <input list="nodes-list" className="w-full p-2 text-sm border border-slate-300 rounded" placeholder="End..." value={endSearch} onChange={(e) => { setEndSearch(e.target.value); const match = visibleNodes.find(n => n.id === e.target.value); if (match) setPathEnd(match.id); }} />
                 </div>
                 <datalist id="nodes-list">{visibleNodes.map((n, idx) => <option key={`${n.id}-${idx}`} value={n.id} />)}</datalist>
                 {path.length > 0 && <div className="mt-2 text-xs text-green-600 font-bold text-center bg-green-50 p-2 rounded">Path Found: {path.length} hops</div>}
               </div>
            </Card>
          )}

          {/* STANDARD CONTROLS (Always visible in explore/path) */}
          {mode !== 'analysis' && (
            <Card className="p-5 shrink-0 max-h-[40vh] overflow-y-auto">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center">
                <Settings className="w-3 h-3 mr-2" /> View Settings
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Layout Style</label>
                  <div className="grid grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    {['force', 'grid', 'circular', 'cluster'].map(l => (
                      <button key={l} onClick={() => setLayout(l)} className={`flex items-center justify-center p-2 rounded-md text-xs font-medium capitalize ${layout === l ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`} title={l}>
                        {l === 'force' && <Share2 className="w-3 h-3" />}
                        {l === 'grid' && <Grid3X3 className="w-3 h-3" />}
                        {l === 'circular' && <Circle className="w-3 h-3" />}
                        {l === 'cluster' && <Target className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-3 mt-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Internal Links</label>
                      <input 
                        type="number" 
                        min="0" max="1" step="0.001" 
                        value={internalThreshold} 
                        onChange={(e) => setInternalThreshold(Number(e.target.value))} 
                        className="w-16 text-xs bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded font-bold text-center outline-none focus:ring-2 focus:ring-indigo-400 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                      />
                    </div>
                    <input type="range" min="0" max="1" step="0.001" value={internalThreshold} onChange={(e) => setInternalThreshold(Number(e.target.value))} className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cross-Community</label>
                      <input 
                        type="number" 
                        min="0" max="1" step="0.001" 
                        value={crossThreshold} 
                        onChange={(e) => setCrossThreshold(Number(e.target.value))} 
                        className="w-16 text-xs bg-rose-100 text-rose-700 px-1 py-0.5 rounded font-bold text-center outline-none focus:ring-2 focus:ring-rose-400 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                      />
                    </div>
                    <input type="range" min="0" max="1" step="0.001" value={crossThreshold} onChange={(e) => setCrossThreshold(Number(e.target.value))} className="w-full accent-rose-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium">Node Size</label>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{nodeScale.toFixed(1)}x</span>
                  </div>
                  <input type="range" min="0.2" max="3" step="0.1" value={nodeScale} onChange={(e) => setNodeScale(Number(e.target.value))} className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                </div>

                <div className="mt-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={hideBelowThreshold} onChange={(e) => setHideBelowThreshold(e.target.checked)} />
                    <span className="text-sm text-slate-600">Hide Disconnected Nodes</span>
                  </label>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-0 flex-grow flex flex-col min-h-0 overflow-hidden">
             <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
               <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center">
                 <Layers className="w-3 h-3 mr-2" /> Communities
               </h2>
               <div className="flex items-center space-x-2">
                 {hiddenGroups.size > 0 ? (
                   <button 
                     onClick={() => setHiddenGroups(new Set())} 
                     className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded transition-colors"
                   >
                     Show All
                   </button>
                 ) : (
                   <span className="text-[10px] text-slate-400">{uniqueCommunities.length}</span>
                 )}
                 <button 
                   onClick={() => setShowMatrix(true)}
                   className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                   title="View Connectivity Matrix"
                 >
                   <Grid className="w-3.5 h-3.5" />
                 </button>
               </div>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-1">
               {uniqueCommunities.map(([groupId, name]) => (
                 <button key={groupId} onClick={() => toggleGroup(groupId)} className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-all ${hiddenGroups.has(groupId) ? 'opacity-40 bg-slate-100' : 'hover:bg-slate-50'}`}>
                     <div className="flex items-center truncate">
                        <div className="w-3 h-3 rounded-full mr-3 shadow-sm shrink-0" style={{ backgroundColor: colorMap.get(groupId) }} />
                        <span className="truncate max-w-[140px]" title={name}>{name}</span>
                     </div>
                     {hiddenGroups.has(groupId) && <EyeOff className="w-3 h-3 text-slate-400" />}
                 </button>
               ))}
            </div>
          </Card>
        </aside>

        {/* Visualization */}
        <div className="flex-grow flex flex-col h-full gap-4 relative">
          <div className="flex-grow rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white relative">
             <CanvasGraph 
               nodes={visibleNodes} 
               links={activeLinks}
               activeNode={selectedNode}
               onNodeClick={handleNodeClick}
               onNodeRightClick={handleLesion}
               searchTerm={searchTerm}
               layout={layout}
               colorMap={colorMap}
               nodeDegrees={nodeDegrees}
               is3D={is3D}
               pathData={{ path, start: pathStart, end: pathEnd }}
               takeSnapshot={snapshotRef}
               analysisSettings={analysisSettings}
               nodeRoles={nodeRoles}
               nodeScale={nodeScale}
             />
          </div>

          {/* Selection Details */}
          {selectedNode && (
             <div className="absolute bottom-4 right-4 w-72 bg-white/95 backdrop-blur shadow-xl rounded-xl border border-slate-200 p-4 z-50 animate-in slide-in-from-right-10 fade-in duration-200">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 truncate">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colorMap.get(selectedNode.group) }} />
                      <h3 className="font-bold truncate">{selectedNode.id}</h3>
                    </div>
                    <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-600">×</button>
                </div>
                
                <div className="text-xs font-medium text-slate-500 mb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                   <div className="flex items-center truncate mr-2">
                     <Palette className="w-3 h-3 mr-1 shrink-0" /> 
                     <span className="truncate">{selectedNode.community}</span>
                   </div>
                   <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">
                     Group {selectedNode.group}
                   </span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  <div className="flex justify-between text-xs border-b border-slate-100 pb-1 mb-2">
                    <span className="font-semibold text-slate-500">Connected Region</span>
                    <span className="font-semibold text-slate-500">Delta / Weight</span>
                  </div>
                  {activeLinks.filter(l => l.source === selectedNode.id || l.target === selectedNode.id)
                    .sort((a,b) => Math.abs(b.value) - Math.abs(a.value))
                    .slice(0, 50).map((l, idx) => {
                    const neighborId = l.source === selectedNode.id ? l.target : l.source;
                    return (
                      <div key={`${neighborId}-${idx}`} className="flex justify-between text-xs py-0.5 hover:bg-slate-50 rounded cursor-pointer" onClick={() => setSelectedNode(graphData.nodes.find(n => n.id === neighborId))}>
                        <span className="truncate w-40">{neighborId}</span>
                        <span className={`font-mono font-semibold ${deltaMode ? (l.value > 0 ? 'text-emerald-500' : 'text-rose-500') : 'text-indigo-600'}`}>
                          {deltaMode && l.value > 0 ? '+' : ''}{l.value.toFixed(3)}
                        </span>
                      </div>
                    )
                  })}
                  {activeLinks.filter(l => l.source === selectedNode.id || l.target === selectedNode.id).length === 0 && <span className="text-xs text-slate-400">No visible connections</span>}
                </div>
             </div>
          )}
        </div>
      </div>
      
      {/* Connectivity Matrix Modal */}
      {showMatrix && (
        <ConnectivityMatrixModal 
           nodes={visibleNodes} 
           links={activeLinks} 
           colorMap={colorMap} 
           deltaMode={deltaMode} 
           onClose={() => setShowMatrix(false)} 
        />
      )}

    </div>
  );
}