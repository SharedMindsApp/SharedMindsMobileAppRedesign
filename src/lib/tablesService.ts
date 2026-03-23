import { supabase } from './supabase';

export interface Table {
  id: string;
  space_id: string | null;
  space_type: 'personal' | 'shared';
  name: string;
  description: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  row_count?: number;
  column_count?: number;
}

export interface TableColumn {
  id: string;
  table_id: string;
  name: string;
  data_type: 'text' | 'number' | 'date' | 'boolean' | 'email' | 'url';
  position: number;
  created_at: string;
}

export interface TableRow {
  id: string;
  table_id: string;
  data: Record<string, any>;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTableParams {
  spaceId: string;
  spaceType: 'personal' | 'shared';
  name: string;
  description?: string;
  columnCount: number;
  rowCount: number;
}

export const tablesService = {
  async createTable(params: CreateTableParams): Promise<Table> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: table, error: tableError } = await supabase
      .from('tables')
      .insert({
        space_id: params.spaceId,
        space_type: params.spaceType,
        name: params.name,
        description: params.description || null,
        created_by_user_id: user.id,
        row_count: params.rowCount,
        column_count: params.columnCount,
      })
      .select()
      .single();

    if (tableError) throw tableError;

    // Create columns
    const columns = Array.from({ length: params.columnCount }, (_, i) => ({
      table_id: table.id,
      name: `Column ${i + 1}`,
      data_type: 'text' as const,
      position: i,
    }));

    const { error: columnsError } = await supabase
      .from('table_columns')
      .insert(columns);

    if (columnsError) throw columnsError;

    // Create rows
    const rows = Array.from({ length: params.rowCount }, (_, i) => ({
      table_id: table.id,
      data: {},
      position: i,
    }));

    const { error: rowsError } = await supabase
      .from('table_rows')
      .insert(rows);

    if (rowsError) throw rowsError;

    return table;
  },

  async getTable(tableId: string): Promise<Table | null> {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('id', tableId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getTablesBySpace(spaceId: string): Promise<Table[]> {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('space_id', spaceId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async updateTable(tableId: string, updates: Partial<Pick<Table, 'name' | 'description'>>): Promise<void> {
    const { error } = await supabase
      .from('tables')
      .update(updates)
      .eq('id', tableId);

    if (error) throw error;
  },

  async deleteTable(tableId: string): Promise<void> {
    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', tableId);

    if (error) throw error;
  },

  async getColumns(tableId: string): Promise<TableColumn[]> {
    const { data, error } = await supabase
      .from('table_columns')
      .select('*')
      .eq('table_id', tableId)
      .order('position');

    if (error) throw error;
    return data || [];
  },

  async updateColumn(columnId: string, updates: Partial<Pick<TableColumn, 'name' | 'data_type'>>): Promise<void> {
    const { error } = await supabase
      .from('table_columns')
      .update(updates)
      .eq('id', columnId);

    if (error) throw error;
  },

  async addColumn(tableId: string, name: string, dataType: TableColumn['data_type'] = 'text'): Promise<TableColumn> {
    const columns = await this.getColumns(tableId);
    const maxPosition = Math.max(...columns.map(c => c.position), -1);

    const { data, error } = await supabase
      .from('table_columns')
      .insert({
        table_id: tableId,
        name,
        data_type: dataType,
        position: maxPosition + 1,
      })
      .select()
      .single();

    if (error) throw error;

    // Update column count
    await supabase
      .from('tables')
      .update({ column_count: columns.length + 1 })
      .eq('id', tableId);

    return data;
  },

  async deleteColumn(columnId: string): Promise<void> {
    // Get table_id before deleting
    const { data: column } = await supabase
      .from('table_columns')
      .select('table_id')
      .eq('id', columnId)
      .single();

    const { error } = await supabase
      .from('table_columns')
      .delete()
      .eq('id', columnId);

    if (error) throw error;

    // Update column count
    if (column) {
      const columns = await this.getColumns(column.table_id);
      await supabase
        .from('tables')
        .update({ column_count: columns.length })
        .eq('id', column.table_id);
    }
  },

  async getRows(tableId: string): Promise<TableRow[]> {
    const { data, error } = await supabase
      .from('table_rows')
      .select('*')
      .eq('table_id', tableId)
      .order('position');

    if (error) throw error;
    return data || [];
  },

  async updateCell(rowId: string, columnId: string, value: any): Promise<void> {
    const { data: row, error: fetchError } = await supabase
      .from('table_rows')
      .select('data')
      .eq('id', rowId)
      .single();

    if (fetchError) throw fetchError;

    const updatedData = {
      ...row.data,
      [columnId]: value,
    };

    const { error } = await supabase
      .from('table_rows')
      .update({ data: updatedData })
      .eq('id', rowId);

    if (error) throw error;
  },

  async addRow(tableId: string): Promise<TableRow> {
    const rows = await this.getRows(tableId);
    const maxPosition = Math.max(...rows.map(r => r.position), -1);

    const { data, error } = await supabase
      .from('table_rows')
      .insert({
        table_id: tableId,
        data: {},
        position: maxPosition + 1,
      })
      .select()
      .single();

    if (error) throw error;

    // Update row count
    await supabase
      .from('tables')
      .update({ row_count: rows.length + 1 })
      .eq('id', tableId);

    return data;
  },

  async deleteRow(rowId: string): Promise<void> {
    // Get table_id before deleting
    const { data: row } = await supabase
      .from('table_rows')
      .select('table_id')
      .eq('id', rowId)
      .single();

    const { error } = await supabase
      .from('table_rows')
      .delete()
      .eq('id', rowId);

    if (error) throw error;

    // Update row count
    if (row) {
      const rows = await this.getRows(row.table_id);
      await supabase
        .from('tables')
        .update({ row_count: rows.length })
        .eq('id', row.table_id);
    }
  },

  async importFromCSV(
    spaceId: string,
    spaceType: 'personal' | 'shared',
    name: string,
    csvContent: string
  ): Promise<Table> {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length === 0) throw new Error('CSV file is empty');

    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const rowData: Record<string, any> = {};
      headers.forEach((header, i) => {
        rowData[header] = values[i] || '';
      });
      return rowData;
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: table, error: tableError } = await supabase
      .from('tables')
      .insert({
        space_id: spaceId,
        space_type: spaceType,
        name,
        created_by_user_id: user.id,
        row_count: dataRows.length,
        column_count: headers.length,
      })
      .select()
      .single();

    if (tableError) throw tableError;

    const columns = headers.map((header, i) => ({
      table_id: table.id,
      name: header,
      data_type: 'text' as const,
      position: i,
    }));

    const { data: insertedColumns, error: columnsError } = await supabase
      .from('table_columns')
      .insert(columns)
      .select();

    if (columnsError) throw columnsError;

    const columnIdMap: Record<string, string> = {};
    insertedColumns.forEach((col, i) => {
      columnIdMap[headers[i]] = col.id;
    });

    const rows = dataRows.map((rowData, i) => {
      const data: Record<string, any> = {};
      Object.entries(rowData).forEach(([header, value]) => {
        const columnId = columnIdMap[header];
        if (columnId) {
          data[columnId] = value;
        }
      });
      return {
        table_id: table.id,
        data,
        position: i,
      };
    });

    const { error: rowsError } = await supabase
      .from('table_rows')
      .insert(rows);

    if (rowsError) throw rowsError;

    return table;
  },

  async exportToCSV(tableId: string): Promise<string> {
    const columns = await this.getColumns(tableId);
    const rows = await this.getRows(tableId);

    const headers = columns.map(c => c.name).join(',');
    const dataRows = rows.map(row => {
      return columns.map(col => {
        const value = row.data[col.id] || '';
        const strValue = String(value);
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      }).join(',');
    });

    return [headers, ...dataRows].join('\n');
  },
};
