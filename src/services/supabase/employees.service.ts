import { supabase } from '../../lib/supabaseClient';
import { Employee } from '../../types';

// Mapeia snake_case do banco para camelCase do TypeScript
function rowToEmployee(row: Record<string, unknown>): Employee {
  return {
    id: row.id as string,
    name: row.name as string,
    email: (row.email as string) || '',
    avatar: (row.avatar as string) || '',
    role: row.role as string,
    department: row.department as Employee['department'],
    workModel: row.work_model as Employee['workModel'],
    status: row.status as Employee['status'],
    computerHost: (row.computer_host as string) || '',
    ipAddress: (row.ip_address as string) || '',
    currentApp: (row.current_app as string) || '',
    currentDomain: (row.current_domain as string) || undefined,
    productivityScore: (row.productivity_score as number) || 0,
    workedHoursToday: Number(row.worked_hours_today) || 0,
    productiveHoursToday: Number(row.productive_hours_today) || 0,
    unproductiveHoursToday: Number(row.unproductive_hours_today) || 0,
    neutralHoursToday: Number(row.neutral_hours_today) || 0,
    idleHoursToday: Number(row.idle_hours_today) || 0,
    scheduleStart: (row.schedule_start as string) || '08:00',
    scheduleEnd: (row.schedule_end as string) || '17:00',
    punchInTime: (row.punch_in_time as string) || undefined,
    punchOutTime: (row.punch_out_time as string) || undefined,
    overtimeMinutes: (row.overtime_minutes as number) || 0,
    pcLockEnabled: Boolean(row.pc_lock_enabled),
    pcLockStatus: (row.pc_lock_status as Employee['pcLockStatus']) || 'Desbloqueado',
    agentVersion: (row.agent_version as string) || '1.0.0',
  };
}

// Mapeia camelCase do TypeScript para snake_case do banco
function employeeToRow(e: Employee): Record<string, unknown> {
  return {
    id: e.id,
    name: e.name,
    email: e.email,
    avatar: e.avatar,
    role: e.role,
    department: e.department,
    work_model: e.workModel,
    status: e.status,
    computer_host: e.computerHost,
    ip_address: e.ipAddress,
    current_app: e.currentApp,
    current_domain: e.currentDomain,
    productivity_score: e.productivityScore,
    worked_hours_today: e.workedHoursToday,
    productive_hours_today: e.productiveHoursToday,
    unproductive_hours_today: e.unproductiveHoursToday,
    neutral_hours_today: e.neutralHoursToday,
    idle_hours_today: e.idleHoursToday,
    schedule_start: e.scheduleStart,
    schedule_end: e.scheduleEnd,
    punch_in_time: e.punchInTime,
    punch_out_time: e.punchOutTime,
    overtime_minutes: e.overtimeMinutes,
    pc_lock_enabled: e.pcLockEnabled,
    pc_lock_status: e.pcLockStatus,
    agent_version: e.agentVersion,
  };
}

export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name');
  if (error) {
    console.error('[employees.service] fetchEmployees error:', error.message);
    return [];
  }
  return (data || []).map(rowToEmployee);
}

export async function upsertEmployee(employee: Employee): Promise<boolean> {
  const { error } = await supabase
    .from('employees')
    .upsert(employeeToRow(employee), { onConflict: 'id' });
  if (error) {
    console.error('[employees.service] upsertEmployee error:', error.message);
    return false;
  }
  return true;
}

export async function upsertEmployees(employees: Employee[]): Promise<boolean> {
  if (!employees.length) return true;
  const { error } = await supabase
    .from('employees')
    .upsert(employees.map(employeeToRow), { onConflict: 'id' });
  if (error) {
    console.error('[employees.service] upsertEmployees error:', error.message);
    return false;
  }
  return true;
}

export async function deleteEmployee(id: string): Promise<boolean> {
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) {
    console.error('[employees.service] deleteEmployee error:', error.message);
    return false;
  }
  return true;
}
