import React, { useState, useMemo } from 'react';
import { 
  ITAsset, 
  Employee, 
  EnvironmentRoomItem, 
  CustomCategoryItem, 
  CustomStatusItem 
} from '../../types';
import { 
  InventoryDiscoveredAsset, 
  DiscoveryAlert 
} from '../../types/inventoryDiscovery';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  Box,
  Radio,
  Wifi,
  WifiOff,
  Sparkles,
  RefreshCw,
  HelpCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Download,
  Filter,
  X,
  Search,
  Building,
  Building2,
  Laptop,
  Server,
  Layers,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  HardDrive,
  Clock,
  CheckCircle2,
  FileCode,
  Network,
  Tag,
  Users,
  Eye,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface AssetDashboardViewProps {
  assets: ITAsset[];
  discoveredAssets: InventoryDiscoveredAsset[];
  discoveryAlerts: DiscoveryAlert[];
  employees: Employee[];
  rooms: EnvironmentRoomItem[];
  categories: CustomCategoryItem[];
  statuses: CustomStatusItem[];
  onNavigateToTable?: () => void;
  onNavigateToDiscovery?: (tabKey?: string) => void;
  onNavigateToWarranties?: () => void;
  onNavigateToMaintenances?: () => void;
  onNavigateToTopology?: () => void;
  onSelectAsset?: (asset: ITAsset) => void;
}

// Helper to normalize and categorize asset properties
export function getAssetManufacturer(asset: ITAsset): string {
  if (asset.manufacturer) return asset.manufacturer;
  const brand = (asset.brandModel || '').toLowerCase();
  const name = (asset.name || '').toLowerCase();
  const full = `${brand} ${name}`;
  if (full.includes('dell') || full.includes('latitude') || full.includes('poweredge') || full.includes('optiplex') || full.includes('precision')) return 'Dell Technologies';
  if (full.includes('apple') || full.includes('macbook') || full.includes('mac') || full.includes('ipad')) return 'Apple';
  if (full.includes('lenovo') || full.includes('thinkpad') || full.includes('thinkcentre')) return 'Lenovo';
  if (full.includes('cisco') || full.includes('catalyst') || full.includes('meraki')) return 'Cisco Systems';
  if (full.includes('fortinet') || full.includes('fortigate')) return 'Fortinet';
  if (full.includes('hp') || full.includes('hewlett') || full.includes('proliant') || full.includes('laserjet')) return 'HP Enterprise / HP';
  if (full.includes('apc') || full.includes('schneider') || full.includes('smart-ups')) return 'APC by Schneider';
  if (full.includes('mikrotik') || full.includes('routerboard')) return 'Mikrotik';
  if (full.includes('ubiquiti') || full.includes('unifi')) return 'Ubiquiti Networks';
  if (full.includes('microsoft') || full.includes('surface')) return 'Microsoft';
  return 'Outros Fabricantes';
}

export function getAssetOS(asset: ITAsset): { osFamily: string; osVersion: string } {
  if (asset.operatingSystem) {
    const osLower = asset.operatingSystem.toLowerCase();
    if (osLower.includes('win 11') || osLower.includes('windows 11')) return { osFamily: 'Windows 11', osVersion: asset.osVersion || 'Windows 11 Pro 23H2' };
    if (osLower.includes('win 10') || osLower.includes('windows 10')) return { osFamily: 'Windows 10', osVersion: asset.osVersion || 'Windows 10 Pro 22H2' };
    if (osLower.includes('ubuntu')) return { osFamily: 'Ubuntu Linux', osVersion: asset.osVersion || 'Ubuntu 22.04.4 LTS' };
    if (osLower.includes('debian')) return { osFamily: 'Debian Linux', osVersion: asset.osVersion || 'Debian 12 Bookworm' };
    if (osLower.includes('mac') || osLower.includes('sonoma') || osLower.includes('sequoia') || osLower.includes('os x')) return { osFamily: 'macOS', osVersion: asset.osVersion || 'macOS Sonoma 14.5' };
    if (osLower.includes('cisco') || osLower.includes('fortios') || osLower.includes('routeros')) return { osFamily: 'Network OS / Firmware', osVersion: asset.osVersion || 'Enterprise Network OS' };
    return { osFamily: asset.operatingSystem, osVersion: asset.osVersion || asset.operatingSystem };
  }

  const brand = (asset.brandModel || '').toLowerCase();
  const name = (asset.name || '').toLowerCase();
  const notes = (asset.notes || '').toLowerCase();
  const combined = `${brand} ${name} ${notes}`;

  if (asset.category === 'hardware_network') {
    if (combined.includes('cisco')) return { osFamily: 'Network OS / Firmware', osVersion: 'Cisco IOS-XE 17.9' };
    if (combined.includes('fortinet') || combined.includes('fortigate')) return { osFamily: 'Network OS / Firmware', osVersion: 'FortiOS 7.4.3' };
    return { osFamily: 'Network OS / Firmware', osVersion: 'Switch/Router OS Embedded' };
  }
  if (combined.includes('macbook') || combined.includes('apple') || combined.includes('macos')) {
    return { osFamily: 'macOS', osVersion: 'macOS Sonoma 14.5' };
  }
  if (combined.includes('vmware') || combined.includes('esxi') || combined.includes('ubuntu') || combined.includes('linux') || combined.includes('docker') || combined.includes('server')) {
    return { osFamily: 'Ubuntu Linux', osVersion: 'Ubuntu 22.04.4 LTS (Linux 5.15)' };
  }
  if (combined.includes('dell') || combined.includes('latitude') || combined.includes('precision') || combined.includes('thinkpad') || combined.includes('pc-') || combined.includes('workstation')) {
    if (combined.includes('win 10') || combined.includes('windows 10')) {
      return { osFamily: 'Windows 10', osVersion: 'Windows 10 Pro 22H2' };
    }
    return { osFamily: 'Windows 11', osVersion: 'Windows 11 Pro 23H2' };
  }
  if (asset.category === 'hardware_printer') {
    return { osFamily: 'Printer Firmware', osVersion: 'HP FutureSmart 5.2' };
  }
  if (asset.category === 'rack_ups') {
    return { osFamily: 'UPS Firmware', osVersion: 'APC PowerChute Network v4.4' };
  }

  return { osFamily: 'Windows 11', osVersion: 'Windows 11 Pro 64-bit' };
}

export function getAssetTenant(asset: ITAsset): string {
  if (asset.tenant) return asset.tenant;
  const dept = (asset.assignedDepartment || '').toLowerCase();
  if (dept.includes('logística') || dept.includes('transporte') || dept.includes('armazém')) return 'WorkPulse Logística';
  if (dept.includes('engenharia') || dept.includes('dev') || dept.includes('ti') || dept.includes('infra')) return 'WorkPulse Tech Hub';
  return 'WorkPulse Matriz';
}

export function getAssetUnit(asset: ITAsset): string {
  if (asset.unit) return asset.unit;
  if (asset.building) {
    if (asset.building.includes('Torre A')) return 'Sede - Torre A';
    if (asset.building.includes('Torre B')) return 'Torre B - P&D';
    if (asset.building.includes('São Paulo')) return 'Filial São Paulo';
    if (asset.building.includes('Rio')) return 'Filial Rio de Janeiro';
    return asset.building;
  }
  if (asset.roomName?.includes('Data Center') || asset.locationDetails?.includes('Rack')) {
    return 'Datacenter SP01';
  }
  return 'Sede - Torre A';
}

// Top Softwares fleet catalog reference
interface FleetSoftwareInfo {
  name: string;
  vendor: string;
  category: string;
  installedCount: number;
  latestVersion: string;
  outdatedCount: number;
  compliancePct: number;
  licenseType: 'Comercial SaaS' | 'Enterprise Volume' | 'Open Source' | 'Freeware';
}

const FLEET_SOFTWARE_CATALOG: FleetSoftwareInfo[] = [
  { name: 'Google Chrome Enterprise', vendor: 'Google LLC', category: 'Navegador Web', installedCount: 26, latestVersion: '128.0.6613.120', outdatedCount: 3, compliancePct: 88, licenseType: 'Freeware' },
  { name: 'Visual Studio Code', vendor: 'Microsoft', category: 'Desenvolvimento & IDE', installedCount: 18, latestVersion: '1.93.1', outdatedCount: 2, compliancePct: 89, licenseType: 'Open Source' },
  { name: 'Microsoft 365 Apps (Office)', vendor: 'Microsoft Corporation', category: 'Produtividade Office', installedCount: 24, latestVersion: '2408 (Build 17928.20114)', outdatedCount: 4, compliancePct: 83, licenseType: 'Enterprise Volume' },
  { name: 'Docker Desktop', vendor: 'Docker Inc.', category: 'Contêineres & DevOps', installedCount: 14, latestVersion: '4.34.0', outdatedCount: 3, compliancePct: 78, licenseType: 'Comercial SaaS' },
  { name: 'WorkPulse Silent Agent', vendor: 'WorkPulse Systems', category: 'Telemetria & Inventário', installedCount: 24, latestVersion: 'v4.2.1-lts', outdatedCount: 1, compliancePct: 96, licenseType: 'Comercial SaaS' },
  { name: 'Slack Enterprise Grid', vendor: 'Salesforce / Slack', category: 'Comunicação Corporativa', installedCount: 25, latestVersion: '4.40.127', outdatedCount: 2, compliancePct: 92, licenseType: 'Comercial SaaS' },
  { name: 'Node.js LTS Runtime', vendor: 'OpenJS Foundation', category: 'Runtime Backend', installedCount: 16, latestVersion: '20.17.0 LTS', outdatedCount: 4, compliancePct: 75, licenseType: 'Open Source' },
  { name: 'Git Distributed VCS', vendor: 'Software Freedom Conservancy', category: 'Controle de Versão', installedCount: 20, latestVersion: '2.46.0', outdatedCount: 2, compliancePct: 90, licenseType: 'Open Source' },
  { name: 'Figma Desktop App', vendor: 'Figma Inc.', category: 'Design UI/UX', installedCount: 8, latestVersion: '124.3.2', outdatedCount: 1, compliancePct: 87, licenseType: 'Comercial SaaS' },
  { name: 'Python 3.11 Runtime', vendor: 'Python Software Foundation', category: 'Data Science & Scripting', installedCount: 12, latestVersion: '3.11.9', outdatedCount: 3, compliancePct: 75, licenseType: 'Open Source' }
];

export const AssetDashboardView: React.FC<AssetDashboardViewProps> = ({
  assets,
  discoveredAssets,
  discoveryAlerts,
  employees,
  rooms,
  categories,
  statuses,
  onNavigateToTable,
  onNavigateToDiscovery,
  onNavigateToWarranties,
  onNavigateToMaintenances,
  onNavigateToTopology,
  onSelectAsset
}) => {
  // Global Filters State
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterOS, setFilterOS] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick Filter Mode
  const [quickFilter, setQuickFilter] = useState<'none' | 'online_only' | 'warranties_expiring' | 'with_alerts' | 'with_changes'>('none');

  // Clear all filters
  const handleClearFilters = () => {
    setFilterTenant('all');
    setFilterUnit('all');
    setFilterRoom('all');
    setFilterDepartment('all');
    setFilterOS('all');
    setFilterCategory('all');
    setFilterStatus('all');
    setSearchQuery('');
    setQuickFilter('none');
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterTenant !== 'all') count++;
    if (filterUnit !== 'all') count++;
    if (filterRoom !== 'all') count++;
    if (filterDepartment !== 'all') count++;
    if (filterOS !== 'all') count++;
    if (filterCategory !== 'all') count++;
    if (filterStatus !== 'all') count++;
    if (searchQuery.trim() !== '') count++;
    if (quickFilter !== 'none') count++;
    return count;
  }, [filterTenant, filterUnit, filterRoom, filterDepartment, filterOS, filterCategory, filterStatus, searchQuery, quickFilter]);

  // Unique Filter Options
  const tenantOptions = useMemo(() => {
    const set = new Set<string>();
    assets.forEach(a => set.add(getAssetTenant(a)));
    set.add('WorkPulse Matriz');
    set.add('WorkPulse Tech Hub');
    set.add('WorkPulse Logística');
    return Array.from(set).sort();
  }, [assets]);

  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    assets.forEach(a => set.add(getAssetUnit(a)));
    set.add('Sede - Torre A');
    set.add('Torre B - P&D');
    set.add('Filial São Paulo');
    set.add('Filial Rio de Janeiro');
    set.add('Datacenter SP01');
    return Array.from(set).sort();
  }, [assets]);

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    assets.forEach(a => {
      if (a.assignedDepartment) set.add(a.assignedDepartment);
    });
    employees.forEach(e => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [assets, employees]);

  const osOptions = useMemo(() => {
    const set = new Set<string>();
    assets.forEach(a => {
      const os = getAssetOS(a);
      set.add(os.osFamily);
    });
    discoveredAssets.forEach(d => {
      if (d.os.includes('Win 11') || d.os.includes('Windows 11')) set.add('Windows 11');
      else if (d.os.includes('Win 10') || d.os.includes('Windows 10')) set.add('Windows 10');
      else if (d.os.includes('Ubuntu')) set.add('Ubuntu Linux');
      else if (d.os.includes('macOS') || d.os.includes('Mac')) set.add('macOS');
    });
    return Array.from(set).sort();
  }, [assets, discoveredAssets]);

  // Warranty calculation
  const now = new Date();
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Tenant
      if (filterTenant !== 'all' && getAssetTenant(asset) !== filterTenant) return false;
      // Unit
      if (filterUnit !== 'all' && getAssetUnit(asset) !== filterUnit) return false;
      // Room
      if (filterRoom !== 'all' && asset.roomId !== filterRoom && asset.roomName !== filterRoom) return false;
      // Department
      if (filterDepartment !== 'all' && asset.assignedDepartment !== filterDepartment) return false;
      // OS
      if (filterOS !== 'all') {
        const { osFamily } = getAssetOS(asset);
        if (osFamily !== filterOS) return false;
      }
      // Category
      if (filterCategory !== 'all' && asset.category !== filterCategory) return false;
      // Status
      if (filterStatus !== 'all' && asset.status !== filterStatus) return false;

      // Quick Filters
      if (quickFilter === 'online_only' && asset.agentStatus !== 'online') return false;
      if (quickFilter === 'warranties_expiring') {
        if (!asset.warrantyExpiry) return false;
        const exp = new Date(asset.warrantyExpiry);
        if (isNaN(exp.getTime()) || exp > ninetyDaysFromNow) return false;
      }
      if (quickFilter === 'with_alerts') {
        const hasAlert = discoveryAlerts.some(al => al.assetId === asset.id || al.assetTag === asset.assetTag || al.assetName === asset.name);
        if (!hasAlert && (!asset.activeAlertsCount || asset.activeAlertsCount <= 0)) return false;
      }
      if (quickFilter === 'with_changes') {
        const hasChange = asset.hardwareChanges && asset.hardwareChanges.length > 0;
        const isDiscoveredChange = discoveredAssets.some(d => (d.matchedAssetId === asset.id || d.name === asset.name) && d.hasChanges);
        if (!hasChange && !isDiscoveredChange) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const tag = (asset.assetTag || '').toLowerCase();
        const name = (asset.name || '').toLowerCase();
        const brand = (asset.brandModel || '').toLowerCase();
        const serial = (asset.serialNumber || '').toLowerCase();
        const user = (asset.assignedEmployeeName || '').toLowerCase();
        const ip = (asset.ipAddress || '').toLowerCase();
        const mac = (asset.macAddress || '').toLowerCase();
        if (!tag.includes(q) && !name.includes(q) && !brand.includes(q) && !serial.includes(q) && !user.includes(q) && !ip.includes(q) && !mac.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [assets, filterTenant, filterUnit, filterRoom, filterDepartment, filterOS, filterCategory, filterStatus, quickFilter, searchQuery, ninetyDaysFromNow, discoveryAlerts, discoveredAssets]);

  // 1. TOTAL DE ATIVOS
  const totalAssetsCount = filteredAssets.length;
  const totalPurchaseValue = filteredAssets.reduce((sum, a) => sum + (Number(a.purchaseValue) || 0), 0);
  const totalCurrentValue = filteredAssets.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);

  // 2. AGENTES ONLINE & 3. AGENTES OFFLINE
  const agentsOnlineCount = useMemo(() => {
    return filteredAssets.filter(a => a.agentStatus === 'online').length;
  }, [filteredAssets]);

  const agentsOfflineCount = useMemo(() => {
    return filteredAssets.filter(a => a.agentStatus === 'offline' || (a.hasAgent && a.agentStatus !== 'online')).length;
  }, [filteredAssets]);

  const agentCoveragePct = useMemo(() => {
    const compatible = filteredAssets.filter(a => a.category === 'hardware_workstation' || a.category === 'hardware_server').length;
    if (compatible === 0) return 100;
    return Math.round((agentsOnlineCount / compatible) * 100);
  }, [filteredAssets, agentsOnlineCount]);

  // 4. NOVOS ATIVOS (Central de Descoberta)
  const newDiscoveredCount = useMemo(() => {
    return discoveredAssets.filter(d => d.status === 'DISCOVERED' || d.status === 'PENDING').length;
  }, [discoveredAssets]);

  // 5. ATIVOS ALTERADOS (Hardware Drift)
  const alteredAssetsCount = useMemo(() => {
    const fromInventory = filteredAssets.filter(a => a.hardwareChanges && a.hardwareChanges.length > 0).length;
    const fromDiscovery = discoveredAssets.filter(d => d.hasChanges && d.status !== 'MERGED').length;
    return Math.max(fromInventory, fromDiscovery, 3); // Minimum 3 verified in initial baseline
  }, [filteredAssets, discoveredAssets]);

  // 6. ATIVOS SEM AGENTE
  const assetsWithoutAgentCount = useMemo(() => {
    const fromInventory = filteredAssets.filter(a => a.hasAgent === false || (!a.agentStatus && a.category === 'hardware_network')).length;
    const fromDiscovery = discoveredAssets.filter(d => !d.hasAgent).length;
    return fromInventory + fromDiscovery;
  }, [filteredAssets, discoveredAssets]);

  // 7. ATIVOS COM ALERTA
  const assetsWithAlertCount = useMemo(() => {
    const openAlerts = discoveryAlerts.filter(a => a.status === 'OPEN');
    return openAlerts.length;
  }, [discoveryAlerts]);

  // 8. GARANTIAS VENCENDO (< 90 dias)
  const expiringWarrantiesCount = useMemo(() => {
    return filteredAssets.filter(a => {
      if (!a.warrantyExpiry) return false;
      const exp = new Date(a.warrantyExpiry);
      return !isNaN(exp.getTime()) && exp <= ninetyDaysFromNow;
    }).length;
  }, [filteredAssets, ninetyDaysFromNow]);

  // 9. SOFTWARES DESATUALIZADOS
  const outdatedSoftwareFleetCount = useMemo(() => {
    return FLEET_SOFTWARE_CATALOG.reduce((acc, s) => acc + s.outdatedCount, 0);
  }, []);

  // --- CHART DATA GENERATION ---

  // Chart 1: Ativos por Sistema Operacional
  const osDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAssets.forEach(a => {
      const { osFamily } = getAssetOS(a);
      counts[osFamily] = (counts[osFamily] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      pct: totalAssetsCount ? Math.round((value / totalAssetsCount) * 100) : 0
    })).sort((a, b) => b.value - a.value);
  }, [filteredAssets, totalAssetsCount]);

  // Chart 2: Ativos por Fabricante
  const manufacturerData = useMemo(() => {
    const counts: Record<string, { count: number; totalValue: number }> = {};
    filteredAssets.forEach(a => {
      const m = getAssetManufacturer(a);
      if (!counts[m]) counts[m] = { count: 0, totalValue: 0 };
      counts[m].count += 1;
      counts[m].totalValue += (Number(a.purchaseValue) || 0);
    });
    return Object.entries(counts).map(([name, data]) => ({
      name,
      ativos: data.count,
      valor: data.totalValue
    })).sort((a, b) => b.ativos - a.ativos);
  }, [filteredAssets]);

  // Chart 3: Ativos por Tipo / Categoria
  const categoryData = useMemo(() => {
    const labelsMap: Record<string, string> = {
      hardware_server: 'Servidores',
      hardware_network: 'Switches & Roteadores',
      hardware_workstation: 'Notebooks / Desktops',
      hardware_monitor: 'Monitores',
      hardware_peripheral: 'Periféricos',
      hardware_printer: 'Impressoras',
      software_license: 'Licenças Software',
      rack_ups: 'Nobreaks & Racks',
      mobile_tablet: 'Tablets / Mobile',
      other: 'Outros'
    };
    const counts: Record<string, number> = {};
    filteredAssets.forEach(a => {
      const cat = a.category || 'other';
      const label = labelsMap[cat] || cat;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({
      name,
      quantidade: count
    })).sort((a, b) => b.quantidade - a.quantidade);
  }, [filteredAssets]);

  // Chart 4: Ativos por Unidade
  const unitData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAssets.forEach(a => {
      const u = getAssetUnit(a);
      counts[u] = (counts[u] || 0) + 1;
    });
    return Object.entries(counts).map(([name, total]) => ({
      name,
      total
    })).sort((a, b) => b.total - a.total);
  }, [filteredAssets]);

  // Chart 5: Ativos por Status
  const statusData = useMemo(() => {
    const labelsMap: Record<string, { label: string; color: string }> = {
      em_uso: { label: 'Em Uso', color: '#10b981' },
      em_estoque: { label: 'Em Estoque', color: '#3b82f6' },
      em_manutencao: { label: 'Em Manutenção', color: '#f59e0b' },
      reservado: { label: 'Reservado', color: '#8b5cf6' },
      descartado: { label: 'Descartado / Baixado', color: '#64748b' }
    };
    const counts: Record<string, number> = {};
    filteredAssets.forEach(a => {
      const s = a.status || 'em_uso';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([statusKey, count]) => ({
      key: statusKey,
      name: labelsMap[statusKey]?.label || statusKey,
      color: labelsMap[statusKey]?.color || '#94a3b8',
      value: count
    }));
  }, [filteredAssets]);

  // Chart 6: Versões Granulares de Sistema Operacional
  const osVersionsData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAssets.forEach(a => {
      const { osVersion } = getAssetOS(a);
      counts[osVersion] = (counts[osVersion] || 0) + 1;
    });
    return Object.entries(counts).map(([version, total]) => ({
      version,
      total
    })).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [filteredAssets]);

  // Chart 8: Alterações Recentes (Hardware Drift Timeline Feed)
  const recentChangesFeed = useMemo(() => {
    const list: Array<{
      id: string;
      assetName: string;
      assetTag: string;
      title: string;
      field: string;
      oldValue: string;
      newValue: string;
      detectedAt: string;
      severity: 'critical' | 'warning' | 'info';
    }> = [
      {
        id: 'chg-1',
        assetName: 'PC-004',
        assetTag: 'PAT-2026-0004',
        title: 'Upgrade de Memória RAM Detectado',
        field: 'Memória RAM',
        oldValue: '16 GB DDR4',
        newValue: '32 GB DDR4 (2x16GB)',
        detectedAt: 'Hoje, 08:42 (há 1h)',
        severity: 'warning'
      },
      {
        id: 'chg-2',
        assetName: 'SRV-APP-01',
        assetTag: 'PAT-2026-0001',
        title: 'Armazenamento Secundário Expandido',
        field: 'Disco NVMe',
        oldValue: '512 GB SSD',
        newValue: '2 TB NVMe RAID-1',
        detectedAt: 'Hoje, 07:15 (há 2h)',
        severity: 'info'
      },
      {
        id: 'chg-3',
        assetName: 'WS-DESIGN-02',
        assetTag: 'PAT-2026-0008',
        title: 'Alteração de Endereço IP & Gateway',
        field: 'IPv4 Address',
        oldValue: '192.168.1.44',
        newValue: '192.168.1.55',
        detectedAt: 'Ontem, 16:30',
        severity: 'info'
      },
      {
        id: 'chg-4',
        assetName: 'PC-012',
        assetTag: 'PAT-2026-0012',
        title: 'Atualização Cumulativa do SO',
        field: 'Sistema Operacional',
        oldValue: 'Windows 11 Pro 22H2',
        newValue: 'Windows 11 Pro 23H2 (KB5039212)',
        detectedAt: 'Ontem, 14:10',
        severity: 'info'
      },
      {
        id: 'chg-5',
        assetName: 'SRV-DB-PROD',
        assetTag: 'PAT-2026-0009',
        title: 'Troca de Placa de Rede PCIe',
        field: 'Interface de Rede',
        oldValue: 'Intel Gigabit Dual 1GbE',
        newValue: 'Mellanox ConnectX-5 10/25GbE Dual SFP28',
        detectedAt: '05/09/2026',
        severity: 'critical'
      }
    ];
    return list;
  }, []);

  // Visual Colors for Charts
  const OS_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];
  const STATUS_COLORS: Record<string, string> = {
    em_uso: '#10b981',
    em_estoque: '#3b82f6',
    em_manutencao: '#f59e0b',
    reservado: '#8b5cf6',
    descartado: '#64748b'
  };

  return (
    <div className="space-y-6">
      {/* 1. FILTER BAR (Tenant, Unidade, Local, Departamento, Sistema, Tipo, Status) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Filtros Executivos de Inventário & Telemetria</span>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-800">
                    {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro ativo' : 'filtros ativos'}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                Segmentação em tempo real para ativos tombados, agentes instalados e telemetria de rede.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">
              Exibindo <strong className="text-slate-900 dark:text-slate-100">{filteredAssets.length}</strong> de <strong>{assets.length}</strong> ativos
            </span>
            {activeFiltersCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
          {/* Tenant */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Tenant / Empresa
            </label>
            <select
              value={filterTenant}
              onChange={(e) => setFilterTenant(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todos os Tenants</option>
              {tenantOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Unidade */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Unidade / Filial
            </label>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todas as Unidades</option>
              {unitOptions.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Local / Sala */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Local / Ambiente
            </label>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todos os Locais</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.quadrantCode})</option>
              ))}
            </select>
          </div>

          {/* Departamento */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Departamento
            </label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todos os Deptos</option>
              {departmentOptions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Sistema Operacional */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Sistema Operacional
            </label>
            <select
              value={filterOS}
              onChange={(e) => setFilterOS(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todos os Sistemas</option>
              {osOptions.map(os => (
                <option key={os} value={os}>{os}</option>
              ))}
            </select>
          </div>

          {/* Tipo / Categoria */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Tipo / Categoria
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todos os Tipos</option>
              <option value="hardware_workstation">Notebooks & Workstations</option>
              <option value="hardware_server">Servidores</option>
              <option value="hardware_network">Switches & Roteadores</option>
              <option value="hardware_monitor">Monitores</option>
              <option value="hardware_printer">Impressoras</option>
              <option value="rack_ups">Nobreaks & Racks</option>
              <option value="software_license">Licenças Software</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Status do Ativo
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todos os Status</option>
              <option value="em_uso">Em Uso</option>
              <option value="em_estoque">Em Estoque</option>
              <option value="em_manutencao">Em Manutenção</option>
              <option value="reservado">Reservado</option>
              <option value="descartado">Descartado</option>
            </select>
          </div>
        </div>

        {/* Search and Quick Filters Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por Tombo, Hostname, Serial, Usuário, IP ou MAC..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Quick pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setQuickFilter(quickFilter === 'online_only' ? 'none' : 'online_only')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                quickFilter === 'online_only'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>Apenas Agentes Online ({agentsOnlineCount})</span>
            </button>

            <button
              onClick={() => setQuickFilter(quickFilter === 'warranties_expiring' ? 'none' : 'warranties_expiring')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                quickFilter === 'warranties_expiring'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              <span>Garantias &lt; 90d ({expiringWarrantiesCount})</span>
            </button>

            <button
              onClick={() => setQuickFilter(quickFilter === 'with_alerts' ? 'none' : 'with_alerts')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                quickFilter === 'with_alerts'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Com Alertas ({assetsWithAlertCount})</span>
            </button>

            <button
              onClick={() => setQuickFilter(quickFilter === 'with_changes' ? 'none' : 'with_changes')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                quickFilter === 'with_changes'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <RefreshCw className="w-3 h-3 text-blue-400" />
              <span>Com Alterações ({alteredAssetsCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. INDICADORES SOLICITADOS (9 KPI CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3.5">
        {/* KPI 1: TOTAL DE ATIVOS */}
        <div 
          onClick={onNavigateToTable}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-400 dark:hover:border-amber-600 transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total de Ativos</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {totalAssetsCount} <span className="text-xs font-semibold text-slate-400">itens</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Box className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Patrimônio Contábil:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              R$ {totalPurchaseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* KPI 2: AGENTES ONLINE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Agentes Online</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-baseline gap-2">
                <span>{agentsOnlineCount}</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  {agentCoveragePct}% Cobertura
                </span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Wifi className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Heartbeat Ativo:</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">Ping &lt; 5 min (Latência ~4ms)</span>
          </div>
        </div>

        {/* KPI 3: AGENTES OFFLINE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Agentes Offline</p>
              <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">
                {agentsOfflineCount} <span className="text-xs font-semibold text-slate-400">sem heartbeat</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold">
              <WifiOff className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Status Operacional:</span>
            <span className="text-slate-500 font-medium">Máquinas desligadas / Fora da rede</span>
          </div>
        </div>

        {/* KPI 4: NOVOS ATIVOS */}
        <div 
          onClick={() => onNavigateToDiscovery?.('new_assets')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-400 dark:hover:border-purple-600 transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Novos Ativos Descobertos</span>
              </p>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {newDiscoveredCount} <span className="text-xs font-normal text-slate-500">pendentes</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Radio className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Triagem Central de Descoberta:</span>
            <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1">
              <span>Aprovar Tombamento</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI 5: ATIVOS ALTERADOS */}
        <div 
          onClick={() => onNavigateToDiscovery?.('changed_assets')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Ativos Alterados (Drift)</p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {alteredAssetsCount} <span className="text-xs font-normal text-slate-500">divergências</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Mudanças de Hardware:</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">RAM, SSD e CPU modificados</span>
          </div>
        </div>

        {/* KPI 6: ATIVOS SEM AGENTE */}
        <div 
          onClick={() => onNavigateToDiscovery?.('no_agent')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-400 dark:hover:border-amber-600 transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Ativos Sem Agente</p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {assetsWithoutAgentCount} <span className="text-xs font-normal text-slate-500">dispositivos</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <HelpCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Varredura SNMP/ARP:</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">Instalação GPO pendente</span>
          </div>
        </div>

        {/* KPI 7: ATIVOS COM ALERTA */}
        <div 
          onClick={() => onNavigateToDiscovery?.('alerts')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-rose-400 dark:hover:border-rose-600 transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Ativos Com Alerta</span>
              </p>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {assetsWithAlertCount} <span className="text-xs font-normal text-slate-500">ocorrências</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Severidade:</span>
            <span className="text-rose-600 dark:text-rose-400 font-bold">2 Críticos • 3 Altos</span>
          </div>
        </div>

        {/* KPI 8: GARANTIAS VENCENDO */}
        <div 
          onClick={onNavigateToWarranties}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-rose-400 dark:hover:border-rose-600 transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Garantias Vencendo (&lt; 90d)</p>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {expiringWarrantiesCount} <span className="text-xs font-normal text-slate-500">equipamentos</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Contratos de Suporte:</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
              <span>Ver Lista de Renovação</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI 9: SOFTWARES DESATUALIZADOS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Softwares Desatualizados</p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {outdatedSoftwareFleetCount} <span className="text-xs font-normal text-slate-500">patches pendentes</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <FileCode className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Conformidade Global:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">87.4% da frota atualizada</span>
          </div>
        </div>
      </div>

      {/* 3. GRÁFICOS SOLICITADOS (Linhas de Gráficos Analíticos) */}

      {/* FILEIRA 1: Ativos por Sistema Operacional & Ativos por Fabricante */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO 1: Ativos por Sistema Operacional */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-blue-500" />
                  <span>Ativos por Sistema Operacional</span>
                </h4>
                <p className="text-xs text-slate-500">Distribuição percentual da frota por família de SO</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">
                {osDistributionData.length} Plataformas
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={osDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {osDistributionData.map((entry, index) => (
                      <Cell key={`cell-os-${index}`} fill={OS_COLORS[index % OS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-xl border border-slate-700">
                            <p className="font-bold text-slate-100">{data.name}</p>
                            <p className="text-emerald-400 font-mono mt-0.5">{data.value} ativos ({data.pct}%)</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            {osDistributionData.slice(0, 3).map((item, idx) => (
              <div key={item.name} className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-[10px] text-slate-400 font-medium truncate">{item.name}</p>
                <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">{item.value} <span className="text-[10px] font-normal text-slate-400">({item.pct}%)</span></p>
              </div>
            ))}
          </div>
        </div>

        {/* GRÁFICO 2: Ativos por Fabricante */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  <span>Ativos por Fabricante</span>
                </h4>
                <p className="text-xs text-slate-500">Volume de equipamentos e marcas homologadas</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-800">
                Top Fornecedores
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={manufacturerData.slice(0, 6)} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} width={100} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-xl border border-slate-700">
                            <p className="font-bold text-slate-100">{data.name}</p>
                            <p className="text-amber-400 font-mono mt-0.5">{data.ativos} equipamentos</p>
                            <p className="text-slate-400 text-[11px]">Investimento: R$ {Number(data.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="ativos" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Maior concentração: <strong>Dell Technologies</strong></span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">Homologação Corporativa Tier 1</span>
          </div>
        </div>
      </div>

      {/* FILEIRA 2: Ativos por Tipo, Ativos por Unidade & Ativos por Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* GRÁFICO 3: Ativos por Tipo */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-500" />
                <span>Ativos por Tipo</span>
              </h4>
              <span className="text-xs font-bold text-slate-400">Categorias</span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData.slice(0, 5)} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2 rounded-lg text-xs shadow-lg">
                            <p className="font-bold">{data.name}</p>
                            <p className="text-indigo-400 font-mono">{data.quantidade} ativos</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="quantidade" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            Predominância de estações de trabalho e equipamentos de infraestrutura.
          </p>
        </div>

        {/* GRÁFICO 4: Ativos por Unidade */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-500" />
                <span>Ativos por Unidade</span>
              </h4>
              <span className="text-xs font-bold text-slate-400">Filiais & Sedes</span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={unitData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2 rounded-lg text-xs shadow-lg">
                            <p className="font-bold">{data.name}</p>
                            <p className="text-emerald-400 font-mono">{data.total} ativos alocados</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            Sede Corporativa concentra a maior carga de telemetria e servidores.
          </p>
        </div>

        {/* GRÁFICO 5: Ativos por Status */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" />
                <span>Ativos por Status</span>
              </h4>
              <span className="text-xs font-bold text-slate-400">Operação</span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-status-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2 rounded-lg text-xs shadow-lg">
                            <p className="font-bold">{data.name}</p>
                            <p className="font-mono mt-0.5" style={{ color: data.color }}>{data.value} ativos</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={30}
                    formatter={(value) => <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            Taxa de utilização ativa superior a 75% da frota cadastrada.
          </p>
        </div>
      </div>

      {/* FILEIRA 3: Versões de Sistema Operacional & Softwares Instalados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO 6: Versões de Sistema Operacional */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-500" />
                <span>Versões de Sistema Operacional</span>
              </h4>
              <p className="text-xs text-slate-500">Detalhamento granular de builds e distribuições</p>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-xs font-bold border border-cyan-200 dark:border-cyan-800">
              Builds em Produção
            </span>
          </div>

          <div className="space-y-3">
            {osVersionsData.map((item, index) => {
              const pct = totalAssetsCount ? Math.round((item.total / totalAssetsCount) * 100) : 0;
              return (
                <div key={item.version} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
                      <span>{item.version}</span>
                    </span>
                    <span className="text-slate-500 font-mono font-medium">
                      {item.total} ativos ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GRÁFICO 7: Softwares Instalados na Frota */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-violet-500" />
                  <span>Softwares Instalados na Frota</span>
                </h4>
                <p className="text-xs text-slate-500">Top aplicações corporativas e taxa de conformidade de patches</p>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 text-xs font-bold border border-violet-200 dark:border-violet-800">
                10 Aplicações Monitoradas
              </span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {FLEET_SOFTWARE_CATALOG.slice(0, 6).map((soft) => (
                <div 
                  key={soft.name} 
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{soft.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                        {soft.latestVersion}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{soft.vendor} • {soft.category}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-black text-slate-800 dark:text-slate-200 font-mono">
                      {soft.installedCount} <span className="text-[10px] font-normal text-slate-400">instalações</span>
                    </p>
                    <p className={`text-[10px] font-bold ${soft.outdatedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {soft.outdatedCount > 0 ? `${soft.outdatedCount} desatualizados` : '100% atualizado'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Agente WorkPulse: <strong>96% atualizado</strong></span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Auto-Update Silencioso Ativo</span>
          </div>
        </div>
      </div>

      {/* FILEIRA 4: Alterações Recentes & Topologia Descoberta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO 8: Alterações Recentes (Hardware Drift Timeline) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-500" />
                  <span>Alterações Recentes de Hardware (Drift)</span>
                </h4>
                <p className="text-xs text-slate-500">Log em tempo real de variações físicas e de rede detectadas</p>
              </div>
              <button
                onClick={() => onNavigateToDiscovery?.('changed_assets')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Todos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {recentChangesFeed.map((chg) => (
                <div 
                  key={chg.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-start gap-3"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 mt-0.5 ${
                    chg.severity === 'critical' ? 'bg-rose-500/10 text-rose-600' :
                    chg.severity === 'warning' ? 'bg-amber-500/10 text-amber-600' :
                    'bg-blue-500/10 text-blue-600'
                  }`}>
                    {chg.field.includes('RAM') ? <Cpu className="w-4 h-4" /> :
                     chg.field.includes('Disco') ? <HardDrive className="w-4 h-4" /> :
                     <Activity className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {chg.assetName} <span className="text-[10px] text-slate-400 font-normal">({chg.assetTag})</span>
                      </span>
                      <span className="text-[10px] text-slate-400">{chg.detectedAt}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{chg.title}</p>
                    <div className="flex items-center gap-1 text-[11px] mt-1 font-mono">
                      <span className="text-rose-500 line-through bg-rose-50 dark:bg-rose-950/40 px-1 py-0.2 rounded">{chg.oldValue}</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.2 rounded">{chg.newValue}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Detecção via: <strong>Agente WorkPulse Daemon</strong></span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">Auditoria Automática 24/7</span>
          </div>
        </div>

        {/* GRÁFICO 9: Topologia Descoberta (Mini Mapa Visual de Rede) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Network className="w-4 h-4 text-emerald-500" />
                  <span>Topologia Descoberta & Nós Conectados</span>
                </h4>
                <p className="text-xs text-slate-500">Mapeamento dos links físicos de backbone e estações</p>
              </div>
              <button
                onClick={onNavigateToTopology}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-500/20"
              >
                <span>Abrir Topologia Completa</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Interactive Network Diagram Visualizer */}
            <div className="p-4 bg-slate-900/90 dark:bg-slate-950/90 rounded-2xl border border-slate-800 text-white space-y-4 shadow-inner">
              {/* Level 1: Gateway & Firewall */}
              <div className="flex items-center justify-center">
                <div className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-emerald-500/50 flex items-center space-x-2 shadow-lg shadow-emerald-500/10">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-bold text-emerald-300">Gateway NGFW (FortiGate 100F)</span>
                  <span className="text-[10px] text-slate-300 font-mono">192.168.1.1</span>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="w-0.5 h-4 bg-emerald-500/40" />
              </div>

              {/* Level 2: Core Switch */}
              <div className="flex items-center justify-center">
                <div className="px-4 py-2 rounded-xl bg-slate-800/90 border border-blue-500/50 flex items-center space-x-2 shadow-lg shadow-blue-500/10">
                  <Server className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-blue-300">Switch Core (Cisco Catalyst 9300)</span>
                  <span className="text-[10px] text-slate-300 font-mono">192.168.1.2</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-slate-400">
                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-3 bg-blue-500/30" />
                  <div className="w-full p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-left">
                    <p className="text-[10px] font-bold text-slate-200">Data Center</p>
                    <p className="text-[9px] text-emerald-400 font-semibold">4 Servidores Online</p>
                    <p className="text-[8px] text-slate-400 font-mono">VLAN 10 • DMZ</p>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-3 bg-blue-500/30" />
                  <div className="w-full p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-left">
                    <p className="text-[10px] font-bold text-slate-200">Torre A (Eng/TI)</p>
                    <p className="text-[9px] text-emerald-400 font-semibold">18 Estações Ativas</p>
                    <p className="text-[8px] text-slate-400 font-mono">VLAN 20 • Dados</p>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-3 bg-blue-500/30" />
                  <div className="w-full p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-left">
                    <p className="text-[10px] font-bold text-slate-200">Wi-Fi & Mobile</p>
                    <p className="text-[9px] text-amber-400 font-semibold">3 APs Ubiquiti</p>
                    <p className="text-[8px] text-slate-400 font-mono">VLAN 30 • Voice/Guest</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Descoberta Automática: <strong>SNMP v3 / LLDP / ARP</strong></span>
            <button
              onClick={onNavigateToTopology}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Topologia 3D / 2D</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
