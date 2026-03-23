export type NodeType = 'idea' | 'task' | 'note' | 'offshoot' | 'group';
export type LinkType = 'dependency' | 'supporting' | 'reference' | 'offshoot';

export interface MindMeshNode {
  id: string;
  master_project_id: string;
  track_id: string | null;
  subtrack_id: string | null;
  title: string;
  content: string;
  node_type: NodeType;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  color: string;
  is_offshoot: boolean;
  created_at: string;
  updated_at: string;
}

export interface MindMeshNodeLink {
  id: string;
  from_node_id: string;
  to_node_id: string;
  link_type: LinkType;
  source_port_id: string | null;
  target_port_id: string | null;
  created_at: string;
}

export interface CreateNodeInput {
  master_project_id: string;
  track_id?: string | null;
  subtrack_id?: string | null;
  title?: string;
  content?: string;
  node_type: NodeType;
  x_position?: number;
  y_position?: number;
  width?: number;
  height?: number;
  color?: string;
  is_offshoot?: boolean;
}

export interface UpdateNodeInput {
  title?: string;
  content?: string;
  node_type?: NodeType;
  x_position?: number;
  y_position?: number;
  width?: number;
  height?: number;
  color?: string;
  is_offshoot?: boolean;
  track_id?: string | null;
  subtrack_id?: string | null;
}

export interface CreateLinkInput {
  from_node_id: string;
  to_node_id: string;
  link_type: LinkType;
  source_port_id?: string | null;
  target_port_id?: string | null;
}

export interface MindMeshGraph {
  nodes: MindMeshNode[];
  links: MindMeshNodeLink[];
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeSize {
  width: number;
  height: number;
}

export interface OffshootAlert {
  count: number;
  recentNodes: MindMeshNode[];
  suggestedAction: 'reconnect' | 'convert' | 'archive';
  message: string;
}

export interface NodeExportData {
  node: MindMeshNode;
  outgoingLinks: MindMeshNodeLink[];
  incomingLinks: MindMeshNodeLink[];
}

export interface GraphExportData {
  nodes: MindMeshNode[];
  links: MindMeshNodeLink[];
  metadata: {
    exported_at: string;
    project_id: string;
    node_count: number;
    link_count: number;
  };
}
