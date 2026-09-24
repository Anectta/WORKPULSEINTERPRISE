import { supabase } from '../../lib/supabaseClient';
import { AppClassificationRule } from '../../types';

function rowToRule(row: Record<string, unknown>): AppClassificationRule {
  return {
    id: row.id as string,
    appName: row.app_name as string,
    processName: (row.process_name as string) || undefined,
    domainPattern: (row.domain_pattern as string) || undefined,
    category: row.category as AppClassificationRule['category'],
    groupName: row.group_name as string,
    targetDepartment: row.target_department as AppClassificationRule['targetDepartment'],
    description: (row.description as string) || undefined,
    isAiSuggested: Boolean(row.is_ai_suggested),
    createdAt: (row.created_at as string) || undefined,
  };
}

function ruleToRow(r: AppClassificationRule): Record<string, unknown> {
  return {
    id: r.id,
    app_name: r.appName,
    process_name: r.processName,
    domain_pattern: r.domainPattern,
    category: r.category,
    group_name: r.groupName,
    target_department: r.targetDepartment,
    description: r.description,
    is_ai_suggested: r.isAiSuggested || false,
  };
}

export async function fetchAppRules(): Promise<AppClassificationRule[]> {
  const { data, error } = await supabase
    .from('app_classification_rules')
    .select('*')
    .order('app_name');
  if (error) {
    console.error('[appRules.service] fetchAppRules error:', error.message);
    return [];
  }
  return (data || []).map(rowToRule);
}

export async function upsertAppRule(rule: AppClassificationRule): Promise<boolean> {
  const { error } = await supabase
    .from('app_classification_rules')
    .upsert(ruleToRow(rule), { onConflict: 'id' });
  if (error) {
    console.error('[appRules.service] upsertAppRule error:', error.message);
    return false;
  }
  return true;
}

export async function upsertAppRules(rules: AppClassificationRule[]): Promise<boolean> {
  if (!rules.length) return true;
  const { error } = await supabase
    .from('app_classification_rules')
    .upsert(rules.map(ruleToRow), { onConflict: 'id' });
  if (error) {
    console.error('[appRules.service] upsertAppRules error:', error.message);
    return false;
  }
  return true;
}

export async function deleteAppRule(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('app_classification_rules')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('[appRules.service] deleteAppRule error:', error.message);
    return false;
  }
  return true;
}
