import { supabase } from './supabase';
import type {
  CanvasSVGObject,
  CreateCanvasSVGData,
  UpdateCanvasSVGData,
  CanvasSVGWithFile,
} from './canvasSVGTypes';

export async function getCanvasSVGsForSpace(spaceId: string): Promise<CanvasSVGWithFile[]> {
  const { data, error } = await supabase
    .from('canvas_svg_objects')
    .select(`
      *,
      files!canvas_svg_objects_source_file_id_fkey (
        id,
        storage_path,
        display_filename
      )
    `)
    .eq('space_id', spaceId)
    .order('z_index', { ascending: true });

  if (error) throw error;

  const svgsWithUrls = await Promise.all(
    (data || []).map(async (svg: any) => {
      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(svg.files.storage_path);

      return {
        id: svg.id,
        space_id: svg.space_id,
        source_file_id: svg.source_file_id,
        x_position: svg.x_position,
        y_position: svg.y_position,
        scale: svg.scale,
        rotation: svg.rotation,
        z_index: svg.z_index,
        created_by: svg.created_by,
        created_at: svg.created_at,
        file_url: publicUrl,
        file_name: svg.files.display_filename,
      };
    })
  );

  return svgsWithUrls;
}

export async function createCanvasSVG(data: CreateCanvasSVGData): Promise<CanvasSVGObject> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const maxZIndex = await getMaxZIndex(data.space_id);

  const { data: svgObject, error } = await supabase
    .from('canvas_svg_objects')
    .insert({
      space_id: data.space_id,
      source_file_id: data.source_file_id,
      x_position: data.x_position ?? 100,
      y_position: data.y_position ?? 100,
      scale: data.scale ?? 1.0,
      rotation: data.rotation ?? 0,
      z_index: data.z_index ?? maxZIndex + 1,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return svgObject;
}

async function getMaxZIndex(spaceId: string): Promise<number> {
  const { data } = await supabase
    .from('canvas_svg_objects')
    .select('z_index')
    .eq('space_id', spaceId)
    .order('z_index', { ascending: false })
    .limit(1);

  return data && data.length > 0 ? data[0].z_index : 0;
}

export async function updateCanvasSVG(
  id: string,
  updates: UpdateCanvasSVGData
): Promise<CanvasSVGObject> {
  const { data, error } = await supabase
    .from('canvas_svg_objects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCanvasSVG(id: string): Promise<void> {
  const { error } = await supabase
    .from('canvas_svg_objects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function bringCanvasSVGForward(id: string, spaceId: string): Promise<void> {
  const { data: currentSVG, error: fetchError } = await supabase
    .from('canvas_svg_objects')
    .select('z_index')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const { data: svgsAbove } = await supabase
    .from('canvas_svg_objects')
    .select('id, z_index')
    .eq('space_id', spaceId)
    .gt('z_index', currentSVG.z_index)
    .order('z_index', { ascending: true })
    .limit(1);

  if (svgsAbove && svgsAbove.length > 0) {
    const targetZIndex = svgsAbove[0].z_index;

    await supabase
      .from('canvas_svg_objects')
      .update({ z_index: targetZIndex })
      .eq('id', id);

    await supabase
      .from('canvas_svg_objects')
      .update({ z_index: currentSVG.z_index })
      .eq('id', svgsAbove[0].id);
  }
}

export async function sendCanvasSVGBackward(id: string, spaceId: string): Promise<void> {
  const { data: currentSVG, error: fetchError } = await supabase
    .from('canvas_svg_objects')
    .select('z_index')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const { data: svgsBelow } = await supabase
    .from('canvas_svg_objects')
    .select('id, z_index')
    .eq('space_id', spaceId)
    .lt('z_index', currentSVG.z_index)
    .order('z_index', { ascending: false })
    .limit(1);

  if (svgsBelow && svgsBelow.length > 0) {
    const targetZIndex = svgsBelow[0].z_index;

    await supabase
      .from('canvas_svg_objects')
      .update({ z_index: targetZIndex })
      .eq('id', id);

    await supabase
      .from('canvas_svg_objects')
      .update({ z_index: currentSVG.z_index })
      .eq('id', svgsBelow[0].id);
  }
}
