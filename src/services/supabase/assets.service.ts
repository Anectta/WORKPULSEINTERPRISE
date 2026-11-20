import { supabase } from '../../lib/supabaseClient';
import { ITAsset } from '../../types';

// Os campos pesquisáveis ficam em colunas próprias; o objeto ITAsset completo
// (todos os demais campos: localização, rede, contratos, custódia, seguro etc.)
// é preservado em custom_fields (JSONB), para que nada se perca no ida e volta.

/** Colunas DATE do Postgres não aceitam string vazia. */
function toDateOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  return value.substring(0, 10);
}

function toNumberOrNull(value: unknown): number | null {
  const n = Number(value);
  return value === undefined || value === null || value === '' || Number.isNaN(n) ? null : n;
}

export function rowToAsset(row: Record<string, unknown>): ITAsset {
  const extra = (row.custom_fields && typeof row.custom_fields === 'object' ? row.custom_fields : {}) as Partial<ITAsset>;
  return {
    ...extra,
    id: row.id as string,
    assetTag: row.asset_tag as string,
    name: row.name as string,
    category: row.category as ITAsset['category'],
    brandModel: (row.brand_model as string) || extra.brandModel || '',
    serialNumber: (row.serial_number as string) || extra.serialNumber || '',
    status: row.status as ITAsset['status'],
    lifecycleStage: (row.lifecycle_stage as ITAsset['lifecycleStage']) || extra.lifecycleStage,
    supplier: (row.supplier as string) || extra.supplier,
    invoiceNumber: (row.invoice_number as string) || extra.invoiceNumber,
    warrantyExpiry: (row.warranty_expiry as string) || extra.warrantyExpiry || '',
    acquisitionDate: (row.purchase_date as string) || extra.acquisitionDate || '',
    purchaseValue: row.purchase_price != null ? Number(row.purchase_price) : (extra.purchaseValue ?? 0),
    currentValue: row.current_value != null ? Number(row.current_value) : extra.currentValue,
    roomId: (row.room_id as string) || extra.roomId,
    roomName: (row.location as string) || extra.roomName,
    assignedEmployeeId: (row.assigned_employee_id as string) || extra.assignedEmployeeId,
    assignedEmployeeName: (row.assigned_to as string) || extra.assignedEmployeeName,
    notes: (row.notes as string) || extra.notes,
    history: (row.history as ITAsset['history']) || [],
    maintenances: (row.maintenance_records as ITAsset['maintenances']) || [],
  } as ITAsset;
}

export function assetToRow(a: ITAsset): Record<string, unknown> {
  // history e maintenances já têm colunas próprias; não duplicar no JSONB
  const { history, maintenances, ...rest } = a;
  return {
    id: a.id,
    asset_tag: a.assetTag,
    name: a.name,
    category: a.category,
    brand_model: a.brandModel || null,
    serial_number: a.serialNumber || null,
    status: a.status,
    lifecycle_stage: a.lifecycleStage || null,
    supplier: a.supplier || null,
    invoice_number: a.invoiceNumber || null,
    purchase_date: toDateOrNull(a.acquisitionDate),
    warranty_expiry: toDateOrNull(a.warrantyExpiry),
    assigned_to: a.assignedEmployeeName || null,
    assigned_employee_id: a.assignedEmployeeId || null,
    location: a.roomName || null,
    room_id: a.roomId || null,
    notes: a.notes || null,
    purchase_price: toNumberOrNull(a.purchaseValue),
    current_value: toNumberOrNull(a.currentValue),
    history: history || [],
    maintenance_records: maintenances || [],
    custom_fields: rest,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchAssets(): Promise<ITAsset[] | null> {
  const { data, error } = await supabase
    .from('it_assets')
    .select('*')
    .order('name');
  if (error) {
    console.error('[assets.service] fetchAssets error:', error.message);
    // null = falha de leitura (diferente de tabela vazia)
    return null;
  }
  return (data || []).map(rowToAsset);
}

export async function upsertAsset(asset: ITAsset): Promise<boolean> {
  const { error } = await supabase
    .from('it_assets')
    .upsert(assetToRow(asset), { onConflict: 'id' });
  if (error) {
    console.error('[assets.service] upsertAsset error:', error.message);
    return false;
  }
  return true;
}

export async function upsertAssets(assets: ITAsset[]): Promise<boolean> {
  if (!assets.length) return true;
  const { error } = await supabase
    .from('it_assets')
    .upsert(assets.map(assetToRow), { onConflict: 'id' });
  if (error) {
    console.error('[assets.service] upsertAssets error:', error.message);
    return false;
  }
  return true;
}

export async function deleteAsset(id: string): Promise<boolean> {
  const { error } = await supabase.from('it_assets').delete().eq('id', id);
  if (error) {
    console.error('[assets.service] deleteAsset error:', error.message);
    return false;
  }
  return true;
}
