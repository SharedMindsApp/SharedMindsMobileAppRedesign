export interface CanvasSVGObject {
  id: string;
  space_id: string;
  source_file_id: string;
  x_position: number;
  y_position: number;
  scale: number;
  rotation: number;
  z_index: number;
  created_by: string;
  created_at: string;
}

export interface CreateCanvasSVGData {
  space_id: string;
  source_file_id: string;
  x_position?: number;
  y_position?: number;
  scale?: number;
  rotation?: number;
  z_index?: number;
}

export interface UpdateCanvasSVGData {
  x_position?: number;
  y_position?: number;
  scale?: number;
  rotation?: number;
  z_index?: number;
}

export interface CanvasSVGWithFile extends CanvasSVGObject {
  file_url: string;
  file_name: string;
}
