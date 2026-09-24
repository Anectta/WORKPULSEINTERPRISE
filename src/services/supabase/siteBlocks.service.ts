import { supabase } from '../../lib/supabaseClient';
import { SiteBlockRule } from '../../types';

function rowToBlock(row: Record<string, unknown>): SiteBlockRule {
  return {
    id: row.id as string,
    title: row.title as string,
    categoryGroup: row.category_group as string,
    domainPattern: row.domain_pattern as string,
    blockedDepartments: (row.blocked_departments as SiteBlockRule['blockedDepartments']) || [],
    workModels: (row.work_models as SiteBlockRule['workModels']) || [],
    action: row.action as SiteBlockRule['action'],
    active: Boolean(row.active),
  };
}

function blockToRow(b: SiteBlockRule): Record<string, unknown> {
  return {
    id: b.id,
    title: b.title,
    category_group: b.categoryGroup,
    domain_pattern: b.domainPattern,
    blocked_departments: b.blockedDepartments,
    work_models: b.workModels,
    action: b.action,
    active: b.active,
  };
}

export async function fetchSiteBlocks(): Promise<SiteBlockRule[]> {
  const { data, error } = await supabase
    .from('site_block_rules')
    .select('*')
    .order('title');
  if (error) {
    console.error('[siteBlocks.service] fetchSiteBlocks error:', error.message);
    return [];
  }
  return (data || []).map(rowToBlock);
}

export async function upsertSiteBlock(block: SiteBlockRule): Promise<boolean> {
  const { error } = await supabase
    .from('site_block_rules')
    .upsert(blockToRow(block), { onConflict: 'id' });
  if (error) {
    console.error('[siteBlocks.service] upsertSiteBlock error:', error.message);
    return false;
  }
  return true;
}

export async function upsertSiteBlocks(blocks: SiteBlockRule[]): Promise<boolean> {
  if (!blocks.length) return true;
  const { error } = await supabase
    .from('site_block_rules')
    .upsert(blocks.map(blockToRow), { onConflict: 'id' });
  if (error) {
    console.error('[siteBlocks.service] upsertSiteBlocks error:', error.message);
    return false;
  }
  return true;
}

export async function deleteSiteBlock(id: string): Promise<boolean> {
  const { error } = await supabase.from('site_block_rules').delete().eq('id', id);
  if (error) {
    console.error('[siteBlocks.service] deleteSiteBlock error:', error.message);
    return false;
  }
  return true;
}
