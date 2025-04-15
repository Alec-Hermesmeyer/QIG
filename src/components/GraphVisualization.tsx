import React, { useEffect, useRef, useState } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import "vis-network/styles/vis-network.css";

interface GraphVisualizationProps {
  relations: string[];
}

interface NodeInfo {
  id: string;
  label: string;
  outDegree: number;
  inDegree: number;
}

interface EdgeInfo {
  id: string;
  from: string;
  to: string;
  label: string;
}

const parseGraph = (relations: string[]) => {
  const nodesMap = new Map<string, { id: string; label: string; title?: string }>();
  const edges: { id: string; from: string; to: string; label: string; title?: string }[] = [];

  relations.forEach((relation, index) => {
    const match = relation.match(/^\s*([^->]+?)\s*->\s*([^->]+?)\s*->\s*(.+?)\s*$/);
    if (match) {
      const [, source, label, target] = match.map((s) => s.trim());

      if (!nodesMap.has(source)) {
        nodesMap.set(source, { id: source, label: source });
      }
      if (!nodesMap.has(target)) {
        nodesMap.set(target, { id: target, label: target });
      }

      edges.push({
        id: `${source}-${label}-${target}-${index}`,
        from: source,
        to: target,
        label: label,
      });
    }
  });

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
  };
};

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({ relations }) => {
  const networkContainer = useRef<HTMLDivElement>(null);
  const networkInstance = useRef<Network | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<EdgeInfo | null>(null);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);

  useEffect(() => {
    if (!networkContainer.current) return;

    if (networkInstance.current) {
      networkInstance.current.destroy();
    }

    const { nodes, edges } = parseGraph(relations);

    const options = {
      nodes: {
        shape: "box",
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        font: { size: 14 },
        color: {
          background: "#e6f3ff",
          border: "#2B7CE9",
          highlight: { background: "#fff966", border: "#FFA500" },
        },
        shadow: true,
      },
      edges: {
        arrows: "to",
        font: { size: 12, color: "#343a40", background: "rgba(255, 255, 255, 0.7)" },
        color: "#6c757d",
        smooth: { enabled: true, type: "cubicBezier", roundness: 0.5 },
        length: 250,
        width: 2,
      },
      physics: {
        enabled: physicsEnabled,
        barnesHut: {
          gravitationalConstant: -2000,
          springLength: 200,
          springConstant: 0.04,
        },
      },
      interaction: { hover: true },
      layout: { improvedLayout: true },
    };

    const network = new Network(
      networkContainer.current,
      { nodes: new DataSet(nodes), edges: new DataSet(edges) },
      options
    );

    network.on("click", (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          setSelectedNode({ id: nodeId, label: node.label, outDegree: 0, inDegree: 0 });
          setSelectedEdge(null);
          network.focus(nodeId, { scale: 0.8, animation: true });
        }
      } else if (params.edges.length > 0) {
        const edgeId = params.edges[0];
        const edge = edges.find((e) => e.id === edgeId);
        if (edge) {
          setSelectedEdge(edge);
          setSelectedNode(null);
        }
      } else {
        setSelectedNode(null);
        setSelectedEdge(null);
      }
    });

    networkInstance.current = network;
    network.fit();

    return () => network.destroy();
  }, [relations, physicsEnabled]);

  return (
    <div className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute top-2 left-2 z-10 flex gap-3 bg-white bg-opacity-90 p-2 rounded-md shadow-md">
        <button onClick={() => setPhysicsEnabled(!physicsEnabled)} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
          Physics: {physicsEnabled ? "ON" : "OFF"}
        </button>
        <button onClick={() => networkInstance.current?.fit({ animation: true })} className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700">
          Fit View
        </button>
      </div>

      {/* Graph Container */}
      <div ref={networkContainer} className="w-full h-[600px] border border-gray-300 rounded-lg bg-gray-100" />

      {/* Info Panel */}
      {(selectedNode || selectedEdge) && (
        <div className="absolute top-16 left-2 bg-white bg-opacity-95 p-4 rounded-lg shadow-lg max-w-sm">
          {selectedNode && (
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-blue-600">Selected Node</h3>
              <p className="text-sm">Label: {selectedNode.label}</p>
              <button className="mt-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">
                Focus on Connections
              </button>
            </div>
          )}
          {selectedEdge && (
            <div>
              <h3 className="text-lg font-semibold text-blue-600">Selected Edge</h3>
              <p className="text-sm">Relationship: {selectedEdge.label}</p>
              <p className="text-sm">Source: {selectedEdge.from}</p>
              <p className="text-sm">Target: {selectedEdge.to}</p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {relations.length === 0 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-600 text-center">
          No graph data available. Relationships will appear here as they're generated.
        </div>
      )}
    </div>
  );
};
