import { supabase } from '../../lib/supabaseClient';
import { ITAsset } from '../../types';

// ITAsset has many optional fields. We store the full JSON in the DB
// using a jsonb 'extra' column approach: we map only the key indexed fields
// to dedicated columns, and the rest goes into 'custom_fields' / history / maintenances.

function rowToAsset(row: Record<string, unknown>): ITAsset {
  return {
    id: row.id as string,
    assetTag: row.asset_tag as string,
    name: row.name as string,
    category: row.category as ITAsset['category'],
    brandModel: (row.brand_model as string) || '',
    serialNumber: (row.serial_number as string) || '',
    status: row.status as ITAsset['status'],
    lifecycleStage: (row.lifecycle_stage as ITAsset['lifecycleStage']) || undefined,
    lifecycleStageDate: (row.lifecycle_stage_date as string) || undefined,
    lifecycleNotes: (row.lifecycle_notes as string) || undefined,
    supplier: (row.supplier as string) || undefined,
    supplierCnpj: (row.supplier_cnpj as string) || undefined,
    supplierContact: (row.supplier_contact as string) || undefined,
    supplierEmail: (row.supplier_email as string) || undefined,
    supplierPhone: (row.supplier_phone as string) || undefined,
    invoiceNumber: (row.invoice_number as string) || undefined,
    warrantyExpiry: (row.warranty_expiry as string) || '',
    acquisitionDate: (row.purchase_date as string) || '',
    purchaseValue: Number(row.purchase_price) || 0,
    currentValue: (row.current_value as number) || undefined,
    roomId: (row.room_id as string) || undefined,
    assignedEmployeeId: (row.assigned_employee_id as string) || undefined,
    assignedEmployeeName: (row.assigned_to as string) || undefined,
    notes: (row.notes as string) || undefined,
    history: (row.history as ITAsset['history']) || [],
    maintenances: (row.maintenance_records as ITAsset['maintenances']) || [],
    createdAt: (row.created_at as string) || new Date().toISOString(),
  } as ITAsset;
}

function assetToRow(a: ITAsset): Record<string, unknown> {
  return {
    id: a.id,
    asset_tag: a.assetTag,
    name: a.name,
    category: a.category,
    brand_model: a.brandModel,
    serial_number: a.serialNumber,
    status: a.status,
    lifecycle_stage: a.lifecycleStage,
    supplier: a.supplier,
    invoice_number: a.invoiceNumber,
    purchase_date: a.acquisitionDate,
    warranty_expiry: a.warrantyExpiry,
    assigned_to: a.assignedEmployeeName,
    assigned_employee_id: a.assignedEmployeeId,
    room_id: a.roomId,
    notes: a.notes,
    purchase_price: a.purchaseValue,
    current_value: a.currentValue,
    history: a.history || [],
    maintenance_records: a.maintenances || [],
    custom_fields: {},
  };
}

export async function fetchAssets(): Promise<ITAsset[]> {
  const { data, error } = await supabase
    .from('it_assets')
    .select('*')
    .order('name');
  if (error) {
    console.error('[assets.service] fetchAssets error:', error.message);
    return [];
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
