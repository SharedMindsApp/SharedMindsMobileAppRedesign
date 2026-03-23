import { useState, useEffect } from 'react';
import { X, Link as LinkIcon, ArrowRight, Tag, Trash2, CheckCircle, Sparkles, Share2 } from 'lucide-react';
import { updateNode, convertNodeToRoadmapItem, getConnectedNodes } from '../../../lib/guardrails/mindmesh';
import type { MindMeshNode, MindMeshGraph, NodeType } from '../../../lib/guardrails/mindmeshTypes';
import { getTracksByCategory } from '../../../lib/guardrails';
import type { Track } from '../../../lib/guardrails';
import { syncToPersonalSpace } from '../../../lib/spacesSync';
import { ShareToSpaceModal } from '../../shared/ShareToSpaceModal';

// TODO: Migrate to Track-based architecture - these functions still use deprecated side_projects table
import { assignItemToSideProject, convertNodeToSideProject } from '../../../lib/guardrails/sideProjects';

interface Props {
  node: MindMeshNode;
  graph: MindMeshGraph;
  onClose: () => void;
  onUpdate: (node: MindMeshNode) => void;
  onRefresh: () => void;
}

interface SideProjectDisplay {
  id: string;
  title: string;
  color: string;
}

export function MindMeshSidebar({ node, graph, onClose, onUpdate, onRefresh }: Props) {
  const [title, setTitle] = useState(node.title);
  const [content, setContent] = useState(node.content);
  const [nodeType, setNodeType] = useState<NodeType>(node.node_type);
  const [isOffshoot, setIsOffshoot] = useState(node.is_offshoot);
  const [connectedNodes, setConnectedNodes] = useState<{ incoming: MindMeshNode[]; outgoing: MindMeshNode[] }>({ incoming: [], outgoing: [] });
  const [converting, setConverting] = useState(false);
  const [sideProjects, setSideProjects] = useState<SideProjectDisplay[]>([]);
  const [showSideProjectMenu, setShowSideProjectMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    setTitle(node.title);
    setContent(node.content);
    setNodeType(node.node_type);
    setIsOffshoot(node.is_offshoot);
    loadConnectedNodes();
    loadSideProjects();
  }, [node.id]);

  async function loadConnectedNodes() {
    try {
      const connected = await getConnectedNodes(node.id);
      setConnectedNodes(connected);
    } catch (error) {
      console.error('Failed to load connected nodes:', error);
    }
  }

  async function loadSideProjects() {
    try {
      const tracks = await getTracksByCategory(node.master_project_id, 'side_project');
      setSideProjects(tracks.map(t => ({
        id: t.id,
        title: t.name,
        color: t.color || '#A855F7',
      })));
    } catch (error) {
      console.error('Failed to load side projects:', error);
    }
  }

  async function handleAssignToSideProject(sideProjectId: string) {
    try {
      await assignItemToSideProject(node.id, 'node', sideProjectId);
      setShowSideProjectMenu(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to assign to side project:', error);
      alert('Failed to assign node to side project');
    }
  }

  async function handleConvertToSideProject() {
    if (!confirm('Convert this node to a new side project? The node will become a side project item.')) return;

    try {
      setConverting(true);
      await convertNodeToSideProject(node.id, node.master_project_id);
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Failed to convert to side project:', error);
      alert('Failed to convert node to side project');
    } finally {
      setConverting(false);
    }
  }

  async function handleUpdate() {
    try {
      const updated = await updateNode(node.id, {
        title,
        content,
        node_type: nodeType,
        is_offshoot: isOffshoot,
      });

      await syncToPersonalSpace('mind_mesh_node', node.id, {
        title,
        content,
        node_type: nodeType,
        is_offshoot: isOffshoot,
      });

      onUpdate(updated);
    } catch (error) {
      console.error('Failed to update node:', error);
    }
  }

  async function handleConvertToRoadmapItem() {
    if (!confirm('Convert this node to a roadmap item? The node will be removed from the Mind Mesh.')) return;

    try {
      setConverting(true);
      await convertNodeToRoadmapItem(node.id);
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Failed to convert node:', error);
      alert('Failed to convert node. Make sure a roadmap section exists for this project.');
    } finally {
      setConverting(false);
    }
  }

  const nodeTypeOptions: { value: NodeType; label: string; color: string }[] = [
    { value: 'idea', label: 'Idea', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { value: 'task', label: 'Task', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { value: 'note', label: 'Note', color: 'bg-gray-100 text-gray-800 border-gray-300' },
    { value: 'offshoot', label: 'Offshoot', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { value: 'group', label: 'Group', color: 'bg-green-100 text-green-800 border-green-300' },
  ];

  const incomingLinks = graph.links.filter(l => l.to_node_id === node.id);
  const outgoingLinks = graph.links.filter(l => l.from_node_id === node.id);

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl overflow-y-auto z-50">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Node Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleUpdate}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleUpdate}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add notes or description..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {nodeTypeOptions.map(option => (
              <button
                key={option.value}
                onClick={async () => {
                  setNodeType(option.value);
                  const updated = await updateNode(node.id, { node_type: option.value });
                  onUpdate(updated);
                }}
                className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                  nodeType === option.value
                    ? option.color
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isOffshoot}
              onChange={async (e) => {
                setIsOffshoot(e.target.checked);
                const updated = await updateNode(node.id, { is_offshoot: e.target.checked });
                onUpdate(updated);
              }}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm font-medium text-gray-700">Mark as Offshoot</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Offshoot nodes are tracked for drift detection
          </p>
        </div>

        {(incomingLinks.length > 0 || outgoingLinks.length > 0) && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <LinkIcon size={16} />
              Connections
            </h3>

            {incomingLinks.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-600 mb-2">Incoming ({incomingLinks.length})</p>
                <div className="space-y-1">
                  {connectedNodes.incoming.map(connectedNode => (
                    <div
                      key={connectedNode.id}
                      className="text-xs bg-gray-50 rounded px-2 py-1.5 border border-gray-200"
                    >
                      {connectedNode.title}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {outgoingLinks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Outgoing ({outgoingLinks.length})</p>
                <div className="space-y-1">
                  {connectedNodes.outgoing.map(connectedNode => (
                    <div
                      key={connectedNode.id}
                      className="text-xs bg-gray-50 rounded px-2 py-1.5 border border-gray-200"
                    >
                      {connectedNode.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-purple-600" />
              Side Projects
            </h3>

            {sideProjects.length > 0 ? (
              <div className="space-y-2">
                <button
                  onClick={() => setShowSideProjectMenu(!showSideProjectMenu)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Sparkles size={16} />
                  Assign to Side Project
                </button>

                {showSideProjectMenu && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 space-y-1">
                    {sideProjects.map(project => (
                      <button
                        key={project.id}
                        onClick={() => handleAssignToSideProject(project.id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-purple-100 rounded"
                        style={{
                          borderLeft: `4px solid ${project.color}`,
                        }}
                      >
                        {project.title}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleConvertToSideProject}
                  disabled={converting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles size={16} />
                  Convert to New Side Project
                </button>
              </div>
            ) : (
              <button
                onClick={handleConvertToSideProject}
                disabled={converting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} />
                Convert to Side Project
              </button>
            )}
          </div>

          <div>
            <button
              onClick={handleConvertToRoadmapItem}
              disabled={converting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {converting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Converting...
                </>
              ) : (
                <>
                  <ArrowRight size={16} />
                  Convert to Roadmap Item
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-2">
              Move to roadmap or side projects to organize your work
            </p>
          </div>

          <div>
            <button
              onClick={() => setShowShareModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              <Share2 size={16} />
              Share to Shared Space
            </button>
          </div>
        </div>
      </div>

      <ShareToSpaceModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        itemType="mind_mesh_node"
        itemId={node.id}
        itemTitle={node.title}
      />
    </div>
  );
}
