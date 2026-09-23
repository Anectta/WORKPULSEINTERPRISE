import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { 
  Server, 
  Network, 
  Cpu, 
  HardDrive, 
  Box, 
  Router as RouterIcon, 
  Wifi, 
  Terminal, 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  Upload, 
  Play, 
  RefreshCw, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  FileCode, 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Sliders, 
  Sparkles, 
  Eye, 
  Copy, 
  ChevronDown, 
  ChevronRight, 
  Grid, 
  ShieldCheck, 
  Activity,
  Layers,
  Monitor,
  Phone,
  Cable,
  FolderTree,
  MapPin,
  Check,
  FileText,
  X,
  Search,
  Zap,
  CheckSquare,
  Boxes,
  Info,
  SlidersHorizontal,
  Compass,
  Settings2,
  Minimize2,
  Move,
  RotateCw,
  RotateCcw,
  History,
  Undo2,
  Redo2,
  Clock,
  CornerUpLeft,
  CornerUpRight,
  MousePointer,
  Printer,
  Radio,
  Shield,
  HelpCircle,
  Save,
  CheckCheck,
  Link2,
  Edit,
  Camera,
  BatteryCharging,
  Flame,
  Thermometer,
  Gauge,
  BarChart2,
  Signal,
  EyeOff,
  PanelRightClose,
  PanelRightOpen,
  Square,
  Armchair,
  LayoutGrid,
  PanelRight
} from 'lucide-react';
import { CurrentUser, ITAsset } from '../types';
import savedTopologyData from '../data/topology_saved.json';

// ==========================================
// DATA TYPES & INTERFACES
// ==========================================

export interface LayoutHistoryStep {
  id: string;
  description: string;
  timestamp: string;
  rooms: EnvironmentRoom[];
  nodes: TopologyNode[];
  links: TopologyLink[];
}

export type DeviceType = 
  | 'router' 
  | 'switch' 
  | 'server' 
  | 'firewall' 
  | 'access_point' 
  | 'workstation' 
  | 'voip' 
  | 'storage' 
  | 'patch_panel' 
  | 'rack' 
  | 'printer' 
  | 'ups' 
  | 'camera'
  | 'desk'
  | 'chair'
  | 'table'
  | 'simple_chair'
  | 'pc'
  | 'tv_display';

export type TopologyNodeType = DeviceType;
export type EnvironmentCategory = 'datacenter' | 'office' | 'meeting' | 'support' | 'telecom_closet' | 'storage' | 'rack_room' | 'corridor' | 'restroom' | 'other';
export type CableType = 'SFTP CAT6 (Azul)' | 'SFTP CAT6 (Azul - Blindado)' | 'CAT6 UTP (Cinza)' | 'Fibra OM4 Multimodo (Laranja)' | 'Fibra Monomodo (Amarelo)' | 'CAT6a Shielded (Vermelho)' | string;
export type ViewMode = 'topology_2d' | 'environments' | 'station_standards' | 'accessories' | 'discovery' | 'wing_heatmap';

export interface TopologyLink {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  cableType: CableType;
  vlan?: string;
  speed?: string;
  waypoints?: { x: number; y: number }[];
}

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  svgX: number;
  svgY: number;
  targetType: 'canvas' | 'node' | 'room' | 'link';
  targetId?: string;
}

export const ASSET_CATEGORIES = [
  {
    id: 'furniture',
    title: 'Mobiliário',
    icon: Armchair,
    items: [
      { type: 'desk' as DeviceType, label: 'Mesa de Trabalho / Escritório', icon: Square, color: 'text-amber-600 dark:text-amber-400' },
      { type: 'chair' as DeviceType, label: 'Cadeira Ergonômica', icon: Armchair, color: 'text-blue-600 dark:text-blue-400' },
      { type: 'table' as DeviceType, label: 'Mesa de Reunião', icon: LayoutGrid, color: 'text-amber-600 dark:text-amber-400' },
      { type: 'simple_chair' as DeviceType, label: 'Cadeira de Visitante', icon: Armchair, color: 'text-slate-500' },
    ]
  },
  {
    id: 'computing',
    title: 'Computadores',
    icon: Monitor,
    items: [
      { type: 'workstation' as DeviceType, label: 'Estação de Trabalho (PC)', icon: Monitor, color: 'text-blue-500' },
      { type: 'voip' as DeviceType, label: 'Telefone IP / VoIP', icon: Phone, color: 'text-purple-500' },
      { type: 'printer' as DeviceType, label: 'Impressora de Rede', icon: Printer, color: 'text-purple-500' },
    ]
  },
  {
    id: 'networking',
    title: 'Redes',
    icon: Network,
    items: [
      { type: 'switch' as DeviceType, label: 'Switch de Distribuição', icon: Network, color: 'text-blue-600' },
      { type: 'router' as DeviceType, label: 'Roteador Gateway WAN', icon: RouterIcon, color: 'text-sky-500' },
      { type: 'access_point' as DeviceType, label: 'Access Point Wi-Fi', icon: Wifi, color: 'text-amber-500' },
      { type: 'firewall' as DeviceType, label: 'Firewall NGFW', icon: Shield, color: 'text-red-500' },
    ]
  },
  {
    id: 'infra',
    title: 'Servidores & CFTV',
    icon: Server,
    items: [
      { type: 'rack' as DeviceType, label: 'Rack de Servidores', icon: Server, color: 'text-indigo-500' },
      { type: 'ups' as DeviceType, label: 'Nobreak (UPS)', icon: BatteryCharging, color: 'text-emerald-500' },
      { type: 'camera' as DeviceType, label: 'Câmera CFTV / IP', icon: Camera, color: 'text-cyan-500' },
    ]
  }
];

export interface TopologyNode {
  id: string;
  name: string;
  type: DeviceType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number; // 0, 90, 180, 270 degrees
  ip?: string;
  vlan?: string;
  connectedTo?: string; // ID of target device for cable connection
  roomId?: string; // ID of room containing this node
  assetTag?: string; // Plaqueta de patrimônio ITAM
  assetId?: string;
  details?: {
    dualMonitor?: boolean;
    voipPhone?: boolean;
    rackUnits?: number;
    status?: 'online' | 'warning' | 'offline';
    vendor?: string;
    model?: string;
    macAddress?: string;
    color?: string;
  };
}

export type DoorWall = 'bottom' | 'top' | 'left' | 'right' | 'none';
export type DoorSwing = 'inside-left' | 'inside-right' | 'outside-left' | 'outside-right';

export interface CompanyWing {
  id: string;
  name: string;
  code: string;
  color: string;
  description?: string;
  orderSequence: number;
}

export interface EnvironmentRoom {
  id: string;
  name: string;
  category: EnvironmentCategory;
  quadrantCode?: string;
  wingId?: string;
  wingName?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  wallColor?: string;
  uplinkDevice?: string;
  uplinkCableType?: CableType;
  uplinkVlan?: string;
  uplinkSpeed?: string;
  equipmentCount?: number;
  notes?: string;
  activeOnMap: boolean;
  // Door Parameters on the Wall Line
  doorWall?: DoorWall;
  doorOffset?: number;
  doorSwing?: DoorSwing;
  doorWidth?: number;
  doorAngle?: number;
  // Custom Room Name Label Offset relative to room (x, y)
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelRotation?: number; // 0, 90, 180, 270 degrees
}

export interface RoomDoorGeometry {
  wall: DoorWall;
  doorWidth: number;
  offset: number;
  swing: DoorSwing;
  doorAngle: number;
  threshold: { x1: number; y1: number; x2: number; y2: number };
  hinge: { x: number; y: number };
  leafEnd: { x: number; y: number };
  closedEnd: { x: number; y: number };
  arcPath: string;
  jamb1: { x: number; y: number; w: number; h: number };
  jamb2: { x: number; y: number; w: number; h: number };
  controlPoint: { x: number; y: number };
}

export function getRoomDoorGeometry(room: EnvironmentRoom): RoomDoorGeometry | null {
  const wall: DoorWall = room.doorWall || 'bottom';
  if (wall === 'none') return null;

  const width = room.width || 200;
  const height = room.height || 160;
  const wallLength = (wall === 'left' || wall === 'right') ? height : width;
  const doorWidth = Math.min(room.doorWidth || 32, Math.max(20, wallLength - 28));
  
  // Safe clamped offset along the wall line
  const minOffset = 12;
  const maxOffset = Math.max(minOffset, wallLength - doorWidth - 12);
  const offset = Math.min(Math.max(room.doorOffset ?? 28, minOffset), maxOffset);
  const swing: DoorSwing = room.doorSwing || 'inside-left';
  const doorAngle = Math.max(10, Math.min(170, room.doorAngle ?? 90));
  const angleRad = (doorAngle * Math.PI) / 180;

  let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
  let hingeX = 0, hingeY = 0;
  let closedEndX = 0, closedEndY = 0;
  let openLeafX = 0, openLeafY = 0;
  let arcPath = '';
  let jamb1 = { x: 0, y: 0, w: 4, h: 4 };
  let jamb2 = { x: 0, y: 0, w: 4, h: 4 };
  let controlPoint = { x: 0, y: 0 };

  const isHingeAtStart = swing.endsWith('left');
  const isInside = swing.startsWith('inside');

  if (wall === 'bottom') {
    const wy = room.y + height;
    x1 = room.x + offset;
    x2 = room.x + offset + doorWidth;
    y1 = wy;
    y2 = wy;
    controlPoint = { x: (x1 + x2) / 2, y: wy + (isInside ? -doorWidth * 0.55 : doorWidth * 0.55) };

    jamb1 = { x: x1 - 2, y: wy - 2, w: 4, h: 4 };
    jamb2 = { x: x2 - 2, y: wy - 2, w: 4, h: 4 };

    if (isHingeAtStart) {
      hingeX = x1;
      hingeY = wy;
      closedEndX = x2;
      closedEndY = wy;
      if (isInside) {
        openLeafX = x1 + doorWidth * Math.cos(angleRad);
        openLeafY = wy - doorWidth * Math.sin(angleRad);
        arcPath = `M ${x2} ${wy} A ${doorWidth} ${doorWidth} 0 0 0 ${openLeafX} ${openLeafY}`;
      } else {
        openLeafX = x1 + doorWidth * Math.cos(angleRad);
        openLeafY = wy + doorWidth * Math.sin(angleRad);
        arcPath = `M ${x2} ${wy} A ${doorWidth} ${doorWidth} 0 0 1 ${openLeafX} ${openLeafY}`;
      }
    } else {
      hingeX = x2;
      hingeY = wy;
      closedEndX = x1;
      closedEndY = wy;
      if (isInside) {
        openLeafX = x2 - doorWidth * Math.cos(angleRad);
        openLeafY = wy - doorWidth * Math.sin(angleRad);
        arcPath = `M ${x1} ${wy} A ${doorWidth} ${doorWidth} 0 0 1 ${openLeafX} ${openLeafY}`;
      } else {
        openLeafX = x2 - doorWidth * Math.cos(angleRad);
        openLeafY = wy + doorWidth * Math.sin(angleRad);
        arcPath = `M ${x1} ${wy} A ${doorWidth} ${doorWidth} 0 0 0 ${openLeafX} ${openLeafY}`;
      }
    }
  } else if (wall === 'top') {
    const wy = room.y;
    x1 = room.x + offset;
    x2 = room.x + offset + doorWidth;
    y1 = wy;
    y2 = wy;
    controlPoint = { x: (x1 + x2) / 2, y: wy + (isInside ? doorWidth * 0.55 : -doorWidth * 0.55) };

    jamb1 = { x: x1 - 2, y: wy - 2, w: 4, h: 4 };
    jamb2 = { x: x2 - 2, y: wy - 2, w: 4, h: 4 };

    if (isHingeAtStart) {
      hingeX = x1;
      hingeY = wy;
      closedEndX = x2;
      closedEndY = wy;
      if (isInside) {
        openLeafX = x1 + doorWidth * Math.cos(angleRad);
        openLeafY = wy + doorWidth * Math.sin(angleRad);
        arcPath = `M ${x2} ${wy} A ${doorWidth} ${doorWidth} 0 0 1 ${openLeafX} ${openLeafY}`;
      } else {
        openLeafX = x1 + doorWidth * Math.cos(angleRad);
        openLeafY = wy - doorWidth * Math.sin(angleRad);
        arcPath = `M ${x2} ${wy} A ${doorWidth} ${doorWidth} 0 0 0 ${openLeafX} ${openLeafY}`;
      }
    } else {
      hingeX = x2;
      hingeY = wy;
      closedEndX = x1;
      closedEndY = wy;
      if (isInside) {
        openLeafX = x2 - doorWidth * Math.cos(angleRad);
        openLeafY = wy + doorWidth * Math.sin(angleRad);
        arcPath = `M ${x1} ${wy} A ${doorWidth} ${doorWidth} 0 0 0 ${openLeafX} ${openLeafY}`;
      } else {
        openLeafX = x2 - doorWidth * Math.cos(angleRad);
        openLeafY = wy - doorWidth * Math.sin(angleRad);
        arcPath = `M ${x1} ${wy} A ${doorWidth} ${doorWidth} 0 0 1 ${openLeafX} ${openLeafY}`;
      }
    }
  } else if (wall === 'left') {
    const wx = room.x;
    x1 = wx;
    x2 = wx;
    y1 = room.y + offset;
    y2 = room.y + offset + doorWidth;
    controlPoint = { x: wx + (isInside ? doorWidth * 0.55 : -doorWidth * 0.55), y: (y1 + y2) / 2 };

    jamb1 = { x: wx - 2, y: y1 - 2, w: 4, h: 4 };
    jamb2 = { x: wx - 2, y: y2 - 2, w: 4, h: 4 };

    if (isHingeAtStart) {
      hingeX = wx;
      hingeY = y1;
      closedEndX = wx;
      closedEndY = y2;
      if (isInside) {
        openLeafX = wx + doorWidth * Math.sin(angleRad);
        openLeafY = y1 + doorWidth * Math.cos(angleRad);
        arcPath = `M ${wx} ${y2} A ${doorWidth} ${doorWidth} 0 0 0 ${openLeafX} ${openLeafY}`;
      } else {
        openLeafX = wx - doorWidth * Math.sin(angleRad);
        openLeafY = y1 + doorWidth * Math.cos(angleRad);
        arcPath = `M ${wx} ${y2} A ${doorWidth} ${doorWidth} 0 0 1 ${openLeafX} ${openLeafY}`;
      }
    } else {
      hingeX = wx;
      hingeY = y2;
      closedEndX = wx;
      closedEndY = y1;
      if (isInside) {
        openLeafX = wx + doorWidth * Math.sin(angleRad);
        openLeafY = y2 - doorWidth * Math.cos(angleRad);
        arcPath = `M ${wx} ${y1} A ${doorWidth} ${doorWidth} 0 0 1 ${openLeafX} ${openLeafY}`;
      } else {
        openLeafX = wx - doorWidth * Math.sin(angleRad);
        openLeafY = y2 - doorWidth * Math.cos(angleRad);
        arcPath = `M ${wx} ${y1} A ${doorWidth} ${doorWidth} 0 0 0 ${openLeafX} ${openLeafY}`;
      }
    }
  } else if (wall === 'right') {
    const wx = room.x + width;
    x1 = wx;
    x2 = wx;
    y1 = room.y + offset;
    y2 = room.y + offset + doorWidth;
    controlPoint = { x: wx + (isInside ? -doorWidth * 0.55 : doorWidth * 0.55), y: (y1 + y2) / 2 };

    jamb1 = { x: wx - 2, y: y1 - 2, w: 4, h: 4 };
    jamb2 = { x: wx - 2, y: y2 - 2, w: 4, h: 4 };

    if (isHingeAtStart) {
      hingeX = wx;
      hingeY = y1;
      closedEndX = wx;
      closedEndY = y2;
      if (isInside) {
        openLeafX = wx - doorWidth * Math.sin(angleRad);
        openLeafY = y1 + doorWidth * Math.cos(angleRad);
        arcPath = `M ${wx} ${y2} A ${doorWidth} ${doorWidth} 0 0 1 ${openLeafX} ${openLeafY}`;
      } else {
        openLeafX = wx + doorWidth * Math.sin(angleRad);
        openLeafY = y1 + doorWidth * Math.cos(angleRad);
        arcPath = `M ${wx} ${y2} A ${doorWidth} ${doorWidth} 0 0 0 ${openLeafX} ${openLeafY}`;
      }
    } else {
      hingeX = wx;
      hingeY = y2;
      closedEndX = wx;
      closedEndY = y1;
      if (isInside) {
        openLeafX = wx - doorWidth * Math.sin(angleRad);
        openLeafY = y2 - doorWidth * Math.cos(angleRad);
        arcPath = `M ${wx} ${y1} A ${doorWidth} ${doorWidth} 0 0 0 ${openLeafX} ${openLeafY}`;
      } else {
        openLeafX = wx + doorWidth * Math.sin(angleRad);
        openLeafY = y2 - doorWidth * Math.cos(angleRad);
        arcPath = `M ${wx} ${y1} A ${doorWidth} ${doorWidth} 0 0 1 ${openLeafX} ${openLeafY}`;
      }
    }
  }

  return {
    wall,
    doorWidth,
    offset,
    swing,
    doorAngle,
    threshold: { x1, y1, x2, y2 },
    hinge: { x: hingeX, y: hingeY },
    leafEnd: { x: openLeafX, y: openLeafY },
    closedEnd: { x: closedEndX, y: closedEndY },
    arcPath,
    jamb1,
    jamb2,
    controlPoint
  };
}

export interface QuadrantSlot {
  id: string;
  code: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  description: string;
}

export const QUADRANT_SLOTS: QuadrantSlot[] = [
  { id: 'q1', code: 'Q1', name: 'Quadrante Q1 - Norte-Oeste (Data Center / Servidores)', x: 30, y: 30, width: 260, height: 220, color: '#475569', description: 'Servidores, Core Router, Switch Principal e Racks' },
  { id: 'q2', code: 'Q2', name: 'Quadrante Q2 - Norte-Leste (Escritório Principal)', x: 300, y: 30, width: 320, height: 220, color: '#2563eb', description: 'Estações de trabalho com computadores e Access Point Wi-Fi' },
  { id: 'q3', code: 'Q3', name: 'Quadrante Q3 - Sul-Oeste (Anexo Sala Técnica / NOC)', x: 30, y: 270, width: 260, height: 220, color: '#0284c7', description: 'Operação NOC, geradores, no-breaks e suporte de rede' },
  { id: 'q4', code: 'Q4', name: 'Quadrante Q4 - Sul-Leste (Anexo Sala de Reunião)', x: 300, y: 270, width: 320, height: 220, color: '#059669', description: 'Videoconferência, reunião de diretoria e automação' },
  { id: 'q5', code: 'Q5', name: 'Quadrante Q5 - Ala Leste Norte (Anexo Suporte TI)', x: 630, y: 30, width: 250, height: 220, color: '#7c3aed', description: 'Almoxarifado de ativos, bancada de testes e manutenção' },
  { id: 'q6', code: 'Q6', name: 'Quadrante Q6 - Ala Leste Sul (Anexo Treinamento / Lab)', x: 630, y: 270, width: 250, height: 220, color: '#d97706', description: 'Laboratório de P&D, simulações de rede e treinamento' },
];

export const INITIAL_WINGS: CompanyWing[] = [
  {
    id: 'wing_sala306',
    name: 'SALA 306',
    code: 'ALA-1',
    color: '#8b5cf6',
    description: 'Planta Corporativa SALA 306 (16 Ambientes)',
    orderSequence: 1,
  }
];

export interface StationStandard {
  id: string;
  profileName: string;
  cpu: string;
  ram: string;
  storage: string;
  gpu: string;
  monitors: string;
  voipPhone: string;
  os: string;
  quantity: number;
  roomId: string;
  unitCost: number;
  accessoriesIncluded: string;
}

export interface InfrastructureAccessory {
  id: string;
  name: string;
  category: 'Energia & UPS' | 'Passivos & Patching' | 'Infraestrutura & Dutos' | 'Climatização' | 'SFP & Fibra' | 'Segurança & Monitoramento';
  brandModel: string;
  quantity: number;
  unitPrice: number;
  roomId: string;
  notes: string;
  status: 'installed' | 'planned' | 'maintenance';
}

export interface InclusionConfig {
  officeDesksCount: number;
  dualMonitors: boolean;
  voipPhones: boolean;
  hasDataCenter: boolean;
  racksCount: number;
  hasPrecisionAc: boolean;
  cableType: CableType;
  customPromptNote: string;
  room1Name: string;
  room2Name: string;
}

interface InfraTopologyProps {
  currentUser?: CurrentUser;
  assets?: ITAsset[];
  onOpenKnowledgeBase?: (articleId?: string) => void;
  onNavigateToAssetManagement?: () => void;
  snmpScanTrigger?: number;
}

export interface DiscoveredNetworkDevice {
  id: string;
  name: string;
  type: DeviceType;
  ip: string;
  mac: string;
  vendor: string;
  model: string;
  snmpVersion: 'v2c' | 'v3';
  sysDescr: string;
  portsCount: number;
  activePorts: number;
  uptime: string;
  vlan: string;
  status: 'online' | 'warning' | 'offline';
  rttMs: number;
}

export const INITIAL_DISCOVERED_DEVICES: DiscoveredNetworkDevice[] = [
  {
    id: 'snmp_sw_core_01',
    name: 'SW-CORE-01 (Cisco Catalyst 9300)',
    type: 'switch',
    ip: '192.168.10.1',
    mac: '00:1B:44:11:3A:B7',
    vendor: 'Cisco Systems',
    model: 'Catalyst 9300-48P PoE+',
    snmpVersion: 'v2c',
    sysDescr: 'Cisco IOS Software, C9300 Software (C9300-UNIVERSALK9-M), Version 17.06.03',
    portsCount: 48,
    activePorts: 36,
    uptime: '142 dias, 08:34:12',
    vlan: 'VLAN 10 (Gerenciamento)',
    status: 'online',
    rttMs: 2
  },
  {
    id: 'snmp_fw_edge_01',
    name: 'FW-FORTI-01 (FortiGate 100F)',
    type: 'firewall',
    ip: '192.168.10.254',
    mac: '70:4C:A5:89:12:D0',
    vendor: 'Fortinet',
    model: 'FortiGate 100F Security Appliance',
    snmpVersion: 'v3',
    sysDescr: 'FortiOS v7.2.4 build1396 (GA) - NGFW Stateful Inspection & SD-WAN',
    portsCount: 16,
    activePorts: 12,
    uptime: '98 dias, 14:22:01',
    vlan: 'VLAN 99 (DMZ / WAN Uplink)',
    status: 'online',
    rttMs: 1
  },
  {
    id: 'snmp_ap_unifi_01',
    name: 'AP-WIFI-DIRETORIA (UniFi U6-Pro)',
    type: 'access_point',
    ip: '192.168.10.15',
    mac: '24:5A:4C:E8:90:11',
    vendor: 'Ubiquiti Inc.',
    model: 'UniFi 6 Pro Access Point (Wi-Fi 6 AX)',
    snmpVersion: 'v2c',
    sysDescr: 'Linux 4.19.152 #1 SMP PREEMPT UniFi Firmware 6.5.62',
    portsCount: 2,
    activePorts: 1,
    uptime: '45 dias, 19:10:43',
    vlan: 'VLAN 30 (Wi-Fi Corporativo)',
    status: 'online',
    rttMs: 4
  },
  {
    id: 'snmp_srv_esxi_01',
    name: 'SRV-ESXI-01 (Dell PowerEdge R750)',
    type: 'server',
    ip: '192.168.10.20',
    mac: 'D4:BE:D9:63:F1:8A',
    vendor: 'Dell Technologies',
    model: 'PowerEdge R750 (2x Intel Xeon Gold, 256GB RAM)',
    snmpVersion: 'v3',
    sysDescr: 'VMware ESXi 8.0.2 build-22380479 iDRAC9 Enterprise SNMP Agent',
    portsCount: 4,
    activePorts: 4,
    uptime: '312 dias, 03:15:20',
    vlan: 'VLAN 20 (Servidores & BD)',
    status: 'online',
    rttMs: 1
  },
  {
    id: 'snmp_nas_syno_01',
    name: 'NAS-STORAGE-01 (Synology RS2423+)',
    type: 'storage',
    ip: '192.168.10.50',
    mac: '00:11:32:9B:4C:55',
    vendor: 'Synology',
    model: 'RackStation RS2423+ (12 Bays - 96TB RAID6)',
    snmpVersion: 'v2c',
    sysDescr: 'DSM 7.2-64570 Update 3 - Network Attached Storage Backup Vault',
    portsCount: 4,
    activePorts: 2,
    uptime: '210 dias, 11:05:30',
    vlan: 'VLAN 20 (Servidores & BD)',
    status: 'online',
    rttMs: 3
  },
  {
    id: 'snmp_ups_apc_01',
    name: 'NOBREAK-RACK-01 (APC Smart-UPS 5000)',
    type: 'ups',
    ip: '192.168.10.45',
    mac: '00:C0:B7:44:88:21',
    vendor: 'Schneider Electric / APC',
    model: 'Smart-UPS RT 5000VA RM 230V w/ NMC3',
    snmpVersion: 'v2c',
    sysDescr: 'Schneider Electric Network Management Card 3 - AOS v2.5.0.6',
    portsCount: 1,
    activePorts: 1,
    uptime: '405 dias, 22:40:11',
    vlan: 'VLAN 10 (Gerenciamento)',
    status: 'online',
    rttMs: 5
  }
];

// Initial default positions for interactive equipment nodes
const INITIAL_TOPOLOGY_NODES: TopologyNode[] = [
  { id: 'conf_table', name: 'Mesa de Reunião Diretor', type: 'desk', x: 140, y: 120, width: 100, height: 110 },
  { id: 'conf_chair_1', name: 'Cadeira Reunião 1', type: 'chair', x: 120, y: 130, rotation: 90 },
  { id: 'conf_chair_2', name: 'Cadeira Reunião 2', type: 'chair', x: 120, y: 160, rotation: 90 },
  { id: 'conf_chair_3', name: 'Cadeira Reunião 3', type: 'chair', x: 120, y: 190, rotation: 90 },
  { id: 'conf_chair_4', name: 'Cadeira Reunião 4', type: 'chair', x: 250, y: 130, rotation: 270 },
  { id: 'conf_chair_5', name: 'Cadeira Reunião 5', type: 'chair', x: 250, y: 160, rotation: 270 },
  { id: 'conf_chair_6', name: 'Cadeira Reunião 6', type: 'chair', x: 250, y: 190, rotation: 270 },
  { id: 'conf_chair_7', name: 'Cadeira Reunião Top', type: 'chair', x: 185, y: 105, rotation: 180 },
  { id: 'conf_chair_8', name: 'Cadeira Reunião Bot', type: 'chair', x: 185, y: 235, rotation: 0 },
  { id: 'conf_display', name: 'Sistema Vídeoconferência', type: 'tv_display', x: 175, y: 165, width: 30, height: 20 },
  { id: 'bench_top_desk', name: 'Bancada de Trabalho 4x', type: 'desk', x: 90, y: 285, width: 260, height: 40 },
  { id: 'bench_pc_1', name: 'PC Workstation 1', type: 'pc', x: 105, y: 288, ip: '192.168.10.101' },
  { id: 'bench_pc_2', name: 'PC Workstation 2', type: 'pc', x: 165, y: 288, ip: '192.168.10.102' },
  { id: 'bench_pc_3', name: 'PC Workstation 3', type: 'pc', x: 225, y: 288, ip: '192.168.10.103' },
  { id: 'bench_pc_4', name: 'PC Workstation 4', type: 'pc', x: 285, y: 288, ip: '192.168.10.104' },
  { id: 'bench_chair_1', name: 'Cadeira 1', type: 'chair', x: 105, y: 335 },
  { id: 'bench_chair_2', name: 'Cadeira 2', type: 'chair', x: 165, y: 335 },
  { id: 'bench_chair_3', name: 'Cadeira 3', type: 'chair', x: 225, y: 335 },
  { id: 'bench_chair_4', name: 'Cadeira 4', type: 'chair', x: 285, y: 335 },
  { id: 'supervisio_desk', name: 'Mesa Supervisão', type: 'desk', x: 50, y: 425, width: 45, height: 180 },
  { id: 'supervisio_pc_1', name: 'PC Supervisão 1', type: 'pc', x: 62, y: 450, ip: '192.168.10.105' },
  { id: 'supervisio_pc_2', name: 'PC Supervisão 2', type: 'pc', x: 62, y: 550, ip: '192.168.10.106' },
  { id: 'supervisio_chair_1', name: 'Cadeira Sup 1', type: 'chair', x: 38, y: 450, rotation: 90 },
  { id: 'supervisio_chair_2', name: 'Cadeira Sup 2', type: 'chair', x: 38, y: 550, rotation: 90 },
  { id: 'central_printer', name: 'Multifuncional Kyocera', type: 'printer', x: 200, y: 410, width: 45, height: 35, ip: '192.168.10.50' },
  { id: 'island_desk', name: 'Ilha Operacional (8 Estações)', type: 'desk', x: 175, y: 455, width: 95, height: 260 },
  { id: 'island_pc_1', name: 'PC Operacional 1', type: 'pc', x: 182, y: 470, ip: '192.168.10.111' },
  { id: 'island_pc_2', name: 'PC Operacional 2', type: 'pc', x: 182, y: 535, ip: '192.168.10.112' },
  { id: 'island_pc_3', name: 'PC Operacional 3', type: 'pc', x: 182, y: 600, ip: '192.168.10.113' },
  { id: 'island_pc_4', name: 'PC Operacional 4', type: 'pc', x: 182, y: 665, ip: '192.168.10.114' },
  { id: 'island_pc_5', name: 'PC Operacional 5', type: 'pc', x: 238, y: 470, ip: '192.168.10.115' },
  { id: 'island_pc_6', name: 'PC Operacional 6', type: 'pc', x: 238, y: 535, ip: '192.168.10.116' },
  { id: 'island_pc_7', name: 'PC Operacional 7', type: 'pc', x: 238, y: 600, ip: '192.168.10.117' },
  { id: 'island_pc_8', name: 'PC Operacional 8', type: 'pc', x: 238, y: 665, ip: '192.168.10.118' },
  { id: 'island_chair_1', name: 'Cadeira Op 1', type: 'chair', x: 148, y: 470, rotation: 90 },
  { id: 'island_chair_2', name: 'Cadeira Op 2', type: 'chair', x: 148, y: 535, rotation: 90 },
  { id: 'island_chair_3', name: 'Cadeira Op 3', type: 'chair', x: 148, y: 600, rotation: 90 },
  { id: 'island_chair_4', name: 'Cadeira Op 4', type: 'chair', x: 148, y: 665, rotation: 90 },
  { id: 'island_chair_5', name: 'Cadeira Op 5', type: 'chair', x: 278, y: 470, rotation: 270 },
  { id: 'island_chair_6', name: 'Cadeira Op 6', type: 'chair', x: 278, y: 535, rotation: 270 },
  { id: 'island_chair_7', name: 'Cadeira Op 7', type: 'chair', x: 278, y: 600, rotation: 270 },
  { id: 'island_chair_8', name: 'Cadeira Op 8', type: 'chair', x: 278, y: 665, rotation: 270 },
  { id: 'ti_rack', name: 'Rack Central TI', type: 'rack', x: 575, y: 185, width: 55, height: 35, ip: '192.168.10.10' },
  { id: 'ti_desk', name: 'Bancada TI Suporte', type: 'desk', x: 575, y: 235, width: 40, height: 180 },
  { id: 'ti_pc_1', name: 'PC TI 1', type: 'pc', x: 582, y: 245, ip: '192.168.10.201' },
  { id: 'ti_pc_2', name: 'PC TI 2', type: 'pc', x: 582, y: 305, ip: '192.168.10.202' },
  { id: 'ti_pc_3', name: 'PC TI 3', type: 'pc', x: 582, y: 365, ip: '192.168.10.203' },
  { id: 'ti_chair_1', name: 'Cadeira TI 1', type: 'chair', x: 622, y: 245, rotation: 270 },
  { id: 'ti_chair_2', name: 'Cadeira TI 2', type: 'chair', x: 622, y: 305, rotation: 270 },
  { id: 'ti_chair_3', name: 'Cadeira TI 3', type: 'chair', x: 622, y: 365, rotation: 270 }
];

export const INITIAL_TOPOLOGY_LINKS: TopologyLink[] = [
  { id: 'link_router_switch', fromNodeId: 'core_router', toNodeId: 'main_switch', cableType: 'Fibra OM4 Multimodo (Laranja)', speed: '10 Gbps SFP+' },
  { id: 'link_switch_patch', fromNodeId: 'main_switch', toNodeId: 'patch_panel', cableType: 'SFTP CAT6 (Azul - Blindado)', speed: '1 Gbps' },
  { id: 'link_patch_rack_a', fromNodeId: 'patch_panel', toNodeId: 'rack_a', cableType: 'SFTP CAT6 (Azul - Blindado)', speed: '10 Gbps SFP+' },
  { id: 'link_patch_rack_b', fromNodeId: 'patch_panel', toNodeId: 'rack_b', cableType: 'SFTP CAT6 (Azul - Blindado)', speed: '10 Gbps SFP+' },
  { id: 'link_patch_ap', fromNodeId: 'patch_panel', toNodeId: 'access_point', cableType: 'SFTP CAT6 (Azul - Blindado)', speed: '1 Gbps PoE+' },
  { id: 'link_patch_ws1', fromNodeId: 'patch_panel', toNodeId: 'ws_1', cableType: 'SFTP CAT6 (Azul - Blindado)', speed: '1 Gbps RJ45' },
  { id: 'link_patch_ws2', fromNodeId: 'patch_panel', toNodeId: 'ws_2', cableType: 'SFTP CAT6 (Azul - Blindado)', speed: '1 Gbps RJ45' },
  { id: 'link_patch_ws3', fromNodeId: 'patch_panel', toNodeId: 'ws_3', cableType: 'SFTP CAT6 (Azul - Blindado)', speed: '1 Gbps RJ45' },
  { id: 'link_patch_ws4', fromNodeId: 'patch_panel', toNodeId: 'ws_4', cableType: 'SFTP CAT6 (Azul - Blindado)', speed: '1 Gbps RJ45' },
  { id: 'link_patch_ws5', fromNodeId: 'patch_panel', toNodeId: 'ws_5', cableType: 'SFTP CAT6 (Azul - Blindado)', speed: '1 Gbps RJ45' },
  { id: 'link_patch_ws6', fromNodeId: 'patch_panel', toNodeId: 'ws_6', cableType: 'SFTP CAT6 (Azul - Blindado)', speed: '1 Gbps RJ45' }
];

const DEFAULT_INCLUSION_CONFIG: InclusionConfig = {
  officeDesksCount: 6,
  dualMonitors: true,
  voipPhones: true,
  hasDataCenter: true,
  racksCount: 2,
  hasPrecisionAc: true,
  cableType: 'SFTP CAT6 (Azul)',
  customPromptNote: '',
  room1Name: 'Sala de Servidores 1 (Data Center)',
  room2Name: 'Sala de Computadores 2 (Escritório Aberto)'
};

const INITIAL_ROOMS: EnvironmentRoom[] = [
  {
    id: 'room_novo_anexo',
    name: 'Sala de Reuniao',
    category: 'meeting',
    quadrantCode: 'Q1',
    wingId: 'wing_sala306',
    x: 30,
    y: 90,
    width: 380,
    height: 180,
    wallColor: '#3b82f6',
    uplinkDevice: 'main_switch',
    uplinkCableType: 'SFTP CAT6 (Azul - Blindado)',
    uplinkVlan: 'VLAN 100 (Workstations)',
    uplinkSpeed: '1 Gbps RJ45',
    equipmentCount: 10,
    notes: 'Sala de reuniões executiva com videoconferência.',
    activeOnMap: true,
    doorWall: 'right',
    doorOffset: 120,
    doorSwing: 'inside-left',
    doorWidth: 32
  },
  {
    id: 'room_workstations_top',
    name: 'Estações de Trabalho - Anexo',
    category: 'office',
    quadrantCode: 'Q1',
    wingId: 'wing_sala306',
    x: 30,
    y: 275,
    width: 380,
    height: 85,
    wallColor: '#3b82f6',
    uplinkDevice: 'main_switch',
    uplinkCableType: 'SFTP CAT6 (Azul - Blindado)',
    uplinkVlan: 'VLAN 100 (Workstations)',
    uplinkSpeed: '1 Gbps RJ45',
    equipmentCount: 8,
    notes: 'Bancada superior de estações de trabalho.',
    activeOnMap: true
  },
  {
    id: 'room_operacoes',
    name: 'Comercial & Operacional',
    category: 'office',
    quadrantCode: 'Q3',
    wingId: 'wing_sala306',
    x: 30,
    y: 365,
    width: 380,
    height: 385,
    wallColor: '#3b82f6',
    uplinkDevice: 'main_switch',
    uplinkCableType: 'SFTP CAT6 (Azul - Blindado)',
    uplinkVlan: 'VLAN 100 (Workstations)',
    uplinkSpeed: '1 Gbps RJ45',
    equipmentCount: 18,
    notes: 'Área operacional e comercial com ilha central.',
    activeOnMap: true,
    doorWall: 'right',
    doorOffset: 340,
    doorSwing: 'inside-left',
    doorWidth: 32
  },
  {
    id: 'room_supervisao',
    name: 'Supervisão',
    category: 'office',
    quadrantCode: 'Q3',
    wingId: 'wing_sala306',
    x: 34,
    y: 415,
    width: 110,
    height: 220,
    wallColor: '#3b82f6',
    uplinkDevice: 'main_switch',
    uplinkCableType: 'SFTP CAT6 (Azul)',
    uplinkVlan: 'VLAN 100 (Supervisão)',
    uplinkSpeed: '1 Gbps RJ45',
    equipmentCount: 4,
    notes: 'Gabinete privativo da supervisão.',
    activeOnMap: true,
    doorWall: 'right',
    doorOffset: 85,
    doorSwing: 'inside-left',
    doorWidth: 28
  },
  {
    id: 'room_corredor_top',
    name: 'Corredor',
    category: 'corridor',
    quadrantCode: 'Q2',
    wingId: 'wing_sala306',
    x: 425,
    y: 90,
    width: 380,
    height: 75,
    wallColor: '#3b82f6',
    activeOnMap: true,
    doorWall: 'right',
    doorOffset: 20,
    doorSwing: 'inside-left',
    doorWidth: 32
  },
  {
    id: 'room_wc_1',
    name: 'Banheiro',
    category: 'restroom',
    quadrantCode: 'Q2',
    wingId: 'wing_sala306',
    x: 425,
    y: 170,
    width: 125,
    height: 95,
    wallColor: '#3b82f6',
    activeOnMap: true,
    doorWall: 'left',
    doorOffset: 20,
    doorSwing: 'inside-left',
    doorWidth: 28
  },
  {
    id: 'room_wc_2',
    name: 'Banheiro',
    category: 'restroom',
    quadrantCode: 'Q2',
    wingId: 'wing_sala306',
    x: 425,
    y: 370,
    width: 125,
    height: 95,
    wallColor: '#3b82f6',
    activeOnMap: true,
    doorWall: 'left',
    doorOffset: 70,
    doorSwing: 'inside-left',
    doorWidth: 28
  },
  {
    id: 'room_corredor_mid',
    name: 'Corredor',
    category: 'corridor',
    quadrantCode: 'Q2',
    wingId: 'wing_sala306',
    x: 425,
    y: 470,
    width: 280,
    height: 65,
    wallColor: '#3b82f6',
    activeOnMap: true,
    doorWall: 'bottom',
    doorOffset: 220,
    doorSwing: 'inside-left',
    doorWidth: 32
  },
  {
    id: 'room_ti',
    name: 'SALA TI',
    category: 'datacenter',
    quadrantCode: 'Q2',
    wingId: 'wing_sala306',
    x: 555,
    y: 170,
    width: 155,
    height: 295,
    wallColor: '#3b82f6',
    activeOnMap: true,
    doorWall: 'bottom',
    doorOffset: 120,
    doorSwing: 'inside-left',
    doorWidth: 32
  },
  {
    id: 'room_corredor_lateral',
    name: 'Corredor',
    category: 'corridor',
    quadrantCode: 'Q4',
    wingId: 'wing_sala306',
    x: 715,
    y: 170,
    width: 90,
    height: 365,
    wallColor: '#3b82f6',
    activeOnMap: true,
    doorWall: 'right',
    doorOffset: 300,
    doorSwing: 'inside-left',
    doorWidth: 32
  },
  {
    id: 'room_recepcao',
    name: 'Recepção',
    category: 'office',
    quadrantCode: 'Q4',
    wingId: 'wing_sala306',
    x: 425,
    y: 540,
    width: 380,
    height: 145,
    wallColor: '#3b82f6',
    activeOnMap: true,
    doorWall: 'right',
    doorOffset: 20,
    doorSwing: 'inside-left',
    doorWidth: 32
  },
  {
    id: 'room_wc_recepcao',
    name: 'Banheiro',
    category: 'restroom',
    quadrantCode: 'Q4',
    wingId: 'wing_sala306',
    x: 425,
    y: 560,
    width: 125,
    height: 85,
    wallColor: '#3b82f6',
    activeOnMap: true,
    doorWall: 'left',
    doorOffset: 20,
    doorSwing: 'inside-left',
    doorWidth: 28
  },
  {
    id: 'room_wc_3',
    name: 'Banheiro',
    category: 'restroom',
    quadrantCode: 'Q6',
    wingId: 'wing_sala306',
    x: 425,
    y: 755,
    width: 125,
    height: 90,
    wallColor: '#3b82f6',
    activeOnMap: true,
    doorWall: 'left',
    doorOffset: 75,
    doorSwing: 'inside-left',
    doorWidth: 28
  },
  {
    id: 'room_cobranca',
    name: 'Sala Cobrança',
    category: 'office',
    quadrantCode: 'Q6',
    wingId: 'wing_sala306',
    x: 555,
    y: 650,
    width: 155,
    height: 195,
    wallColor: '#3b82f6',
    activeOnMap: true,
    doorWall: 'bottom',
    doorOffset: 120,
    doorSwing: 'inside-left',
    doorWidth: 32
  },
  {
    id: 'room_corredor_right_cob',
    name: 'Corredor',
    category: 'corridor',
    quadrantCode: 'Q6',
    wingId: 'wing_sala306',
    x: 715,
    y: 650,
    width: 90,
    height: 195,
    wallColor: '#3b82f6',
    activeOnMap: true,
    doorWall: 'top',
    doorOffset: 45,
    doorSwing: 'inside-left',
    doorWidth: 28
  },
  {
    id: 'room_corredor_bot',
    name: 'Corredor',
    category: 'corridor',
    quadrantCode: 'Q6',
    wingId: 'wing_sala306',
    x: 425,
    y: 850,
    width: 380,
    height: 80,
    wallColor: '#3b82f6',
    activeOnMap: true,
    doorWall: 'bottom',
    doorOffset: 300,
    doorSwing: 'inside-left',
    doorWidth: 32
  }
];

const INITIAL_STATION_STANDARDS: StationStandard[] = [
  {
    id: 'std_dev',
    profileName: 'Padrão Desenvolvedor / Senior',
    cpu: 'Intel Core i7-13700K 16-Core',
    ram: '32 GB DDR5 5600MHz',
    storage: '1 TB NVMe Gen4 SSD',
    gpu: 'Intel UHD Graphics 770',
    monitors: 'Monitores Duplos 27" 4K IPS (Dell U2723QE)',
    voipPhone: 'Telefone IP Grandstream GXP2170 HD',
    os: 'Windows 11 Pro Enterprise / WSL2',
    quantity: 6,
    roomId: 'room_office',
    unitCost: 8500,
    accessoriesIncluded: 'Headset Jabra USB-C, Teclado/Mouse Sem Fio Ergonomico'
  },
  {
    id: 'std_exec',
    profileName: 'Padrão Executivo (Laptop + Docking)',
    cpu: 'Apple M3 Pro 12-Core CPU / 18-Core GPU',
    ram: '36 GB Unified Memory',
    storage: '512 GB NVMe SSD',
    gpu: 'Apple Integrated 18-Core',
    monitors: 'Monitores Duplos 27" QHD Thunderbolt',
    voipPhone: 'Headset Sem Fio Jabra Evolve2 65',
    os: 'macOS Sonoma',
    quantity: 2,
    roomId: 'room_office',
    unitCost: 16200,
    accessoriesIncluded: 'Docking Station Thunderbolt 4 100W, Suporte de Alumínio'
  },
  {
    id: 'std_callcenter',
    profileName: 'Padrão Operacional / Atendimento',
    cpu: 'Intel Core i5-13400 Micro',
    ram: '16 GB DDR4',
    storage: '512 GB SSD NVMe',
    gpu: 'Intel Integrated',
    monitors: 'Monitor Único 24" FHD IPS',
    voipPhone: 'Telefone IP Cisco CP-7821 VoIP',
    os: 'Windows 11 Pro',
    quantity: 4,
    roomId: 'room_office',
    unitCost: 4200,
    accessoriesIncluded: 'Headset USB com Cancelamento de Ruído'
  }
];

const INITIAL_ACCESSORIES: InfrastructureAccessory[] = [
  {
    id: 'acc_1',
    name: 'No-Break Smart-UPS 3000VA Senoidal',
    category: 'Energia & UPS',
    brandModel: 'APC por Schneider Electric (SMT3000R2X180)',
    quantity: 2,
    unitPrice: 12500,
    roomId: 'room_dc',
    notes: 'Instalado no Rack A e Rack B para autonomia de 30 min full load.',
    status: 'installed'
  },
  {
    id: 'acc_2',
    name: 'Patch Panel 48 Portas CAT6 Gigalan',
    category: 'Passivos & Patching',
    brandModel: 'Furukawa Electric High Density',
    quantity: 4,
    unitPrice: 1100,
    roomId: 'room_dc',
    notes: 'Com guias traseiras e identificadores numéricos identificados.',
    status: 'installed'
  },
  {
    id: 'acc_3',
    name: 'Eletrocalha Perfurada Galvanizada 200x50mm',
    category: 'Infraestrutura & Dutos',
    brandModel: 'Calhas Norte - Aço Z275 3 metros',
    quantity: 15,
    unitPrice: 180,
    roomId: 'room_dc',
    notes: 'Fixada no teto atravessando o corredor entre as duas salas.',
    status: 'installed'
  },
  {
    id: 'acc_4',
    name: 'Ar Condicionado de Precisão Inverter 36k BTU',
    category: 'Climatização',
    brandModel: 'Vertiv Liebert CRV Inrow',
    quantity: 1,
    unitPrice: 28500,
    roomId: 'room_dc',
    notes: 'Mantém temperatura contínua em 19°C com controle de umidade.',
    status: 'installed'
  },
  {
    id: 'acc_5',
    name: 'Transceiver SFP+ 10GBASE-SR Multimodo',
    category: 'SFP & Fibra',
    brandModel: 'Cisco SFP-10G-SR Compatible',
    quantity: 8,
    unitPrice: 350,
    roomId: 'room_dc',
    notes: 'Para uplinks entre Core Router, Main Switch e Racks.',
    status: 'installed'
  },
  {
    id: 'acc_6',
    name: 'PDU Metrada de Rack 16A 12 Tomadas C13/C19',
    category: 'Energia & UPS',
    brandModel: 'APC AP7851 Rack PDU',
    quantity: 4,
    unitPrice: 1850,
    roomId: 'room_dc',
    notes: 'Monitoramento remoto via SNMP de corrente por fase.',
    status: 'installed'
  },
  {
    id: 'acc_7',
    name: 'Patch Cords SFTP CAT6 Azul Blindado 1.5m',
    category: 'Passivos & Patching',
    brandModel: 'Furukawa Gigalan SFTP',
    quantity: 60,
    unitPrice: 28,
    roomId: 'room_office',
    notes: 'Cabeamento direto entre Patch Panel e Workstations.',
    status: 'installed'
  }
];

export const InfraTopology: React.FC<InfraTopologyProps> = ({
  currentUser,
  assets = [],
  onOpenKnowledgeBase,
  onNavigateToAssetManagement,
  snmpScanTrigger
}) => {
  // Primary View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('topology_2d');

  // Toggle Quadrant Guides on 2D Map
  const [showQuadrantGuides, setShowQuadrantGuides] = useState<boolean>(true);

  // Ambientes (Rooms) State with Auto-Migration for Quadrant Annex Alignment
  const [rooms, setRooms] = useState<EnvironmentRoom[]>(() => {
    const saved = localStorage.getItem('applet_infra_topology_rooms');
    if (saved) {
      try {
        const parsed: EnvironmentRoom[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    if (savedTopologyData && Array.isArray((savedTopologyData as any).rooms) && (savedTopologyData as any).rooms.length > 0) {
      return (savedTopologyData as any).rooms as EnvironmentRoom[];
    }
    return INITIAL_ROOMS;
  });

  // Company Wings / Units State
  const [wings, setWings] = useState<CompanyWing[]>(() => {
    const saved = localStorage.getItem('applet_infra_topology_wings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    if (savedTopologyData && Array.isArray((savedTopologyData as any).wings) && (savedTopologyData as any).wings.length > 0) {
      return (savedTopologyData as any).wings as CompanyWing[];
    }
    return INITIAL_WINGS;
  });

  const [selectedWingFilter, setSelectedWingFilter] = useState<string>('all');
  const [isWingManagerOpen, setIsWingManagerOpen] = useState<boolean>(false);
  const [editingWing, setEditingWing] = useState<CompanyWing | null>(null);
  const [newWingForm, setNewWingForm] = useState<Partial<CompanyWing>>({
    name: '',
    code: '',
    color: '#8b5cf6',
    description: ''
  });

  // Heatmap Overlay & Analytics State
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [heatmapMetric, setHeatmapMetric] = useState<'density' | 'status' | 'hybrid'>('density');
  const [heatmapIntensity, setHeatmapIntensity] = useState<number>(0.75);
  const [hoveredHeatmapWingId, setHoveredHeatmapWingId] = useState<string | null>(null);

  // Inspector Drawer Visibility
  const [showInspector, setShowInspector] = useState<boolean>(true);

  // Station Standards State
  const [stationStandards, setStationStandards] = useState<StationStandard[]>(() => {
    const saved = localStorage.getItem('applet_infra_topology_station_standards');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    if (savedTopologyData && Array.isArray((savedTopologyData as any).stationStandards) && (savedTopologyData as any).stationStandards.length > 0) {
      return (savedTopologyData as any).stationStandards as StationStandard[];
    }
    return INITIAL_STATION_STANDARDS;
  });

  // Accessories State
  const [accessories, setAccessories] = useState<InfrastructureAccessory[]>(() => {
    const saved = localStorage.getItem('applet_infra_topology_accessories');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    if (savedTopologyData && Array.isArray((savedTopologyData as any).accessories) && (savedTopologyData as any).accessories.length > 0) {
      return (savedTopologyData as any).accessories as InfrastructureAccessory[];
    }
    return INITIAL_ACCESSORIES;
  });

  // Modals for Adding/Editing Data
  const [editingRoom, setEditingRoom] = useState<Partial<EnvironmentRoom> | null>(null);
  const [editingStation, setEditingStation] = useState<Partial<StationStandard> | null>(null);
  const [editingAccessory, setEditingAccessory] = useState<Partial<InfrastructureAccessory> | null>(null);

  // Interactive Movable Nodes State
  const [nodes, setNodes] = useState<TopologyNode[]>(() => {
    const saved = localStorage.getItem('applet_infra_topology_nodes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    if (savedTopologyData && Array.isArray((savedTopologyData as any).nodes) && (savedTopologyData as any).nodes.length > 0) {
      return (savedTopologyData as any).nodes as TopologyNode[];
    }
    return INITIAL_TOPOLOGY_NODES;
  });

  // Dynamic Free-Routing Cable Links State
  const [links, setLinks] = useState<TopologyLink[]>(() => {
    const saved = localStorage.getItem('applet_infra_topology_links');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    if (savedTopologyData && Array.isArray((savedTopologyData as any).links)) {
      return (savedTopologyData as any).links as TopologyLink[];
    }
    return INITIAL_TOPOLOGY_LINKS;
  });

  // Load layout from server API on mount
  useEffect(() => {
    fetch('/api/topology')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          if (Array.isArray(data.rooms) && data.rooms.length > 0) {
            setRooms(data.rooms);
            localStorage.setItem('applet_infra_topology_rooms', JSON.stringify(data.rooms));
          }
          if (Array.isArray(data.nodes) && data.nodes.length > 0) {
            setNodes(data.nodes);
            localStorage.setItem('applet_infra_topology_nodes', JSON.stringify(data.nodes));
          }
          if (Array.isArray(data.links)) {
            setLinks(data.links);
            localStorage.setItem('applet_infra_topology_links', JSON.stringify(data.links));
          }
          if (Array.isArray(data.wings) && data.wings.length > 0) {
            setWings(data.wings);
            localStorage.setItem('applet_infra_topology_wings', JSON.stringify(data.wings));
          }
          if (Array.isArray(data.stationStandards) && data.stationStandards.length > 0) {
            setStationStandards(data.stationStandards);
            localStorage.setItem('applet_infra_topology_station_standards', JSON.stringify(data.stationStandards));
          }
          if (Array.isArray(data.accessories) && data.accessories.length > 0) {
            setAccessories(data.accessories);
            localStorage.setItem('applet_infra_topology_accessories', JSON.stringify(data.accessories));
          }
        }
      })
      .catch(err => console.error("Error loading server topology:", err));
  }, []);

  // Debounced auto-save to server whenever key topology elements change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/api/topology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rooms, nodes, links, wings, stationStandards, accessories })
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [rooms, nodes, links, wings, stationStandards, accessories]);

  // Selection States
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(['rack_a']);
  const selectedNodeId = selectedNodeIds[0] || null;
  const setSelectedNodeId = (id: string | null) => {
    setSelectedNodeIds(id ? [id] : []);
  };
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>('room_office');
  const [activeRoomId, setActiveRoomId] = useState<string | null>('room_office');
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  // Active Connection Creation Mode
  const [connectingFromNodeId, setConnectingFromNodeId] = useState<string | null>(null);

  // Floating Context Menu State (Right-Click)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  // Categorized Asset Palette States
  const [contextCategoryTab, setContextCategoryTab] = useState<string>('furniture');
  const [openToolbarCategory, setOpenToolbarCategory] = useState<string | null>(null);

  // Ensure context menu stays 100% visible inside viewport bounds
  useLayoutEffect(() => {
    if (contextMenu && contextMenu.isOpen && contextMenuRef.current) {
      const rect = contextMenuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const padding = 12;

      let newX = contextMenu.x;
      let newY = contextMenu.y;

      if (rect.right > vw - padding) {
        newX = Math.max(padding, vw - rect.width - padding);
      }
      if (rect.left < padding) {
        newX = padding;
      }

      if (rect.bottom > vh - padding) {
        newY = Math.max(padding, vh - rect.height - padding);
      }
      if (rect.top < padding) {
        newY = padding;
      }

      if (Math.abs(newX - contextMenu.x) > 1 || Math.abs(newY - contextMenu.y) > 1) {
        setContextMenu(prev => prev ? { ...prev, x: newX, y: newY } : null);
      }
    }
  }, [contextMenu?.isOpen, contextMenu?.targetType, contextMenu?.targetId, contextCategoryTab]);

  // Floating Toolbox State
  const [toolboxOpen, setToolboxOpen] = useState<boolean>(true);
  const [activeToolboxTab, setActiveToolboxTab] = useState<'tools' | 'mappings' | 'discovery' | 'mapping' | 'rooms' | null>(null);

  // Dragging & Snapping Settings
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [gridSize, setGridSize] = useState<number>(10);
  const [showCableLines, setShowCableLines] = useState<boolean>(true);

  // Inclusion Relative Data Configuration
  const [config, setConfig] = useState<InclusionConfig>(DEFAULT_INCLUSION_CONFIG);
  const [isInclusionDrawerOpen, setIsInclusionDrawerOpen] = useState<boolean>(false);

  // Layout History / Undo & Redo System (Snapshots)
  const [layoutHistory, setLayoutHistory] = useState<LayoutHistoryStep[]>([]);
  const [layoutRedoStack, setLayoutRedoStack] = useState<LayoutHistoryStep[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  // Zoom & Viewport
  const [zoom2D, setZoom2D] = useState<number>(100);

  // Toast & Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  // Selected Objects Resolution
  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);
  const selectedRoom = useMemo(() => rooms.find(r => r.id === selectedRoomId) || null, [rooms, selectedRoomId]);
  const selectedLink = useMemo(() => links.find(l => l.id === selectedLinkId) || null, [links, selectedLinkId]);

  // Record History Snapshot (Undo step)
  const recordHistorySnapshot = useCallback((description: string) => {
    const newStep: LayoutHistoryStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      description,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      rooms: JSON.parse(JSON.stringify(rooms)),
      nodes: JSON.parse(JSON.stringify(nodes)),
      links: JSON.parse(JSON.stringify(links))
    };

    setLayoutHistory(prev => [newStep, ...prev].slice(0, 40));
    setLayoutRedoStack([]); // Clear redo stack on new action
  }, [rooms, nodes, links]);

  // Undo (Voltar Etapa Anterior)
  const handleUndo = useCallback(() => {
    if (layoutHistory.length === 0) {
      showToast('⚠️ Nenhuma etapa anterior no histórico.');
      return;
    }

    const previousStep = layoutHistory[0];
    const newHistory = layoutHistory.slice(1);

    // Save current state into redo stack
    const currentStep: LayoutHistoryStep = {
      id: `redo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      description: `Antes de desfazer: ${previousStep.description}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      rooms: JSON.parse(JSON.stringify(rooms)),
      nodes: JSON.parse(JSON.stringify(nodes)),
      links: JSON.parse(JSON.stringify(links))
    };

    setLayoutRedoStack(prev => [currentStep, ...prev].slice(0, 40));
    setLayoutHistory(newHistory);

    // Apply previous state
    setRooms(previousStep.rooms);
    setNodes(previousStep.nodes);
    setLinks(previousStep.links);

    localStorage.setItem('applet_infra_topology_rooms', JSON.stringify(previousStep.rooms));
    localStorage.setItem('applet_infra_topology_nodes', JSON.stringify(previousStep.nodes));
    localStorage.setItem('applet_infra_topology_links', JSON.stringify(previousStep.links));

    showToast(`↩️ Voltou etapa: ${previousStep.description}`);
  }, [layoutHistory, rooms, nodes, links]);

  // Redo (Refazer / Avançar Etapa)
  const handleRedo = useCallback(() => {
    if (layoutRedoStack.length === 0) {
      showToast('⚠️ Nenhuma etapa posterior para refazer.');
      return;
    }

    const nextStep = layoutRedoStack[0];
    const newRedoStack = layoutRedoStack.slice(1);

    // Save current state into history stack
    const currentStep: LayoutHistoryStep = {
      id: `undo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      description: `Antes de refazer: ${nextStep.description}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      rooms: JSON.parse(JSON.stringify(rooms)),
      nodes: JSON.parse(JSON.stringify(nodes)),
      links: JSON.parse(JSON.stringify(links))
    };

    setLayoutHistory(prev => [currentStep, ...prev].slice(0, 40));
    setLayoutRedoStack(newRedoStack);

    // Apply next state
    setRooms(nextStep.rooms);
    setNodes(nextStep.nodes);
    setLinks(nextStep.links);

    localStorage.setItem('applet_infra_topology_rooms', JSON.stringify(nextStep.rooms));
    localStorage.setItem('applet_infra_topology_nodes', JSON.stringify(nextStep.nodes));
    localStorage.setItem('applet_infra_topology_links', JSON.stringify(nextStep.links));

    showToast(`↪️ Refez etapa: ${nextStep.description}`);
  }, [layoutRedoStack, rooms, nodes, links]);

  // Restore to a specific step in history
  const handleRestoreToStep = useCallback((targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= layoutHistory.length) return;
    const targetStep = layoutHistory[targetIndex];

    const currentStep: LayoutHistoryStep = {
      id: `step_${Date.now()}`,
      description: 'Estado antes de restaurar histórico',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      rooms: JSON.parse(JSON.stringify(rooms)),
      nodes: JSON.parse(JSON.stringify(nodes)),
      links: JSON.parse(JSON.stringify(links))
    };

    const intermediateSteps = layoutHistory.slice(0, targetIndex);
    setLayoutRedoStack(prev => [currentStep, ...intermediateSteps, ...prev].slice(0, 40));
    setLayoutHistory(layoutHistory.slice(targetIndex + 1));

    // Apply targeted step
    setRooms(targetStep.rooms);
    setNodes(targetStep.nodes);
    setLinks(targetStep.links);

    localStorage.setItem('applet_infra_topology_rooms', JSON.stringify(targetStep.rooms));
    localStorage.setItem('applet_infra_topology_nodes', JSON.stringify(targetStep.nodes));
    localStorage.setItem('applet_infra_topology_links', JSON.stringify(targetStep.links));

    setIsHistoryModalOpen(false);
    showToast(`🎯 Layout restaurado para a etapa: ${targetStep.description}`);
  }, [layoutHistory, rooms, nodes, links]);

  // Clear History
  const handleClearHistory = () => {
    setLayoutHistory([]);
    setLayoutRedoStack([]);
    showToast('Histórico de etapas limpo.');
  };

  // Save to LocalStorage and Server API
  const handleSaveLayout = () => {
    localStorage.setItem('applet_infra_topology_nodes', JSON.stringify(nodes));
    localStorage.setItem('applet_infra_topology_rooms', JSON.stringify(rooms));
    localStorage.setItem('applet_infra_topology_wings', JSON.stringify(wings));
    localStorage.setItem('applet_infra_topology_links', JSON.stringify(links));
    localStorage.setItem('applet_infra_topology_station_standards', JSON.stringify(stationStandards));
    localStorage.setItem('applet_infra_topology_accessories', JSON.stringify(accessories));

    fetch('/api/topology', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rooms, nodes, links, wings, stationStandards, accessories })
    })
      .then(res => res.json())
      .then(() => {
        showToast('Layout, ambientes, alas e inventário salvos e publicados com sucesso no servidor!');
      })
      .catch(() => {
        showToast('Layout salvo localmente!');
      });
  };

  // Auto-Sequence Rooms inside Wings
  const handleAutoSequenceWings = (targetWingId?: string) => {
    recordHistorySnapshot('Auto-organizou ambientes nas alas');
    let updatedRooms: EnvironmentRoom[] = [];
    setRooms(prev => {
      const activeWings = targetWingId 
        ? wings.filter(w => w.id === targetWingId) 
        : [...wings].sort((a, b) => a.orderSequence - b.orderSequence);

      let currentX = 50;
      let currentY = 70;
      let rowMaxHeight = 0;
      const CANVAS_MAX_X = 920;
      const GAP_X = 10;
      const GAP_Y = 10;

      updatedRooms = [...prev];

      activeWings.forEach(wing => {
        const wingRooms = updatedRooms.filter(r => r.wingId === wing.id);
        if (wingRooms.length === 0) return;

        // Reset starting position for new wing row
        if (currentX > 50 && currentX + 320 > CANVAS_MAX_X) {
          currentX = 50;
          currentY += rowMaxHeight + 80;
          rowMaxHeight = 0;
        } else if (currentX > 50) {
          currentX += 48;
        }

        wingRooms.forEach((room) => {
          if (currentX + room.width > CANVAS_MAX_X && currentX > 50) {
            currentX = 50;
            currentY += rowMaxHeight + GAP_Y;
            rowMaxHeight = 0;
          }

          updatedRooms = updatedRooms.map(r => r.id === room.id ? {
            ...r,
            x: currentX,
            y: currentY
          } : r);

          currentX += room.width + GAP_X;
          if (room.height > rowMaxHeight) rowMaxHeight = room.height;
        });

        // Advance Y for the next wing with generous spacing
        currentX = 50;
        currentY += rowMaxHeight + 90;
        rowMaxHeight = 0;
      });

      return updatedRooms;
    });

    setTimeout(() => {
      handleCenterLayout();
    }, 60);

    const wingObj = wings.find(w => w.id === targetWingId);
    if (wingObj) {
      showToast(`Salas da '${wingObj.name}' organizadas e centralizadas!`);
    } else {
      showToast('Todas as alas e salas foram sequenciadas e centralizadas no mapa!');
    }
  };

  // Centralize all active rooms and nodes strictly in the canvas center
  const handleCenterLayout = useCallback(() => {
    const activeRooms = rooms.filter(r => r.activeOnMap !== false && (selectedWingFilter === 'all' || r.wingId === selectedWingFilter));
    const activeNodes = nodes.filter(n => n.activeOnMap !== false);

    if (activeRooms.length === 0 && activeNodes.length === 0) {
      showToast('Nenhum elemento no mapa para centralizar.');
      return;
    }

    recordHistorySnapshot('Centralizou o layout no ambiente');

    const roomMinX = activeRooms.length > 0 ? Math.min(...activeRooms.map(r => r.x)) : Infinity;
    const roomMaxX = activeRooms.length > 0 ? Math.max(...activeRooms.map(r => r.x + r.width)) : -Infinity;
    const roomMinY = activeRooms.length > 0 ? Math.min(...activeRooms.map(r => r.y)) : Infinity;
    const roomMaxY = activeRooms.length > 0 ? Math.max(...activeRooms.map(r => r.y + r.height)) : -Infinity;

    const nodeMinX = activeNodes.length > 0 ? Math.min(...activeNodes.map(n => n.x)) : Infinity;
    const nodeMaxX = activeNodes.length > 0 ? Math.max(...activeNodes.map(n => n.x + (n.width || 60))) : -Infinity;
    const nodeMinY = activeNodes.length > 0 ? Math.min(...activeNodes.map(n => n.y)) : Infinity;
    const nodeMaxY = activeNodes.length > 0 ? Math.max(...activeNodes.map(n => n.y + (n.height || 50))) : -Infinity;

    const contentMinX = Math.min(roomMinX, nodeMinX);
    const contentMaxX = Math.max(roomMaxX, nodeMaxX);
    const contentMinY = Math.min(roomMinY, nodeMinY);
    const contentMaxY = Math.max(roomMaxY, nodeMaxY);

    // Wing Enclosures add 45px margin on left/right/bottom and 66px on top (52px padding + 14px header badge overflow)
    const WING_TOP_HEADER_OFFSET = 66;
    const WING_BOTTOM_OFFSET = 45;
    const WING_SIDE_OFFSET = 45;

    const fullMinX = contentMinX - WING_SIDE_OFFSET;
    const fullMaxX = contentMaxX + WING_SIDE_OFFSET;
    const fullMinY = contentMinY - WING_TOP_HEADER_OFFSET;
    const fullMaxY = contentMaxY + WING_BOTTOM_OFFSET;

    const totalLayoutWidth = fullMaxX - fullMinX;
    const totalLayoutHeight = fullMaxY - fullMinY;

    // Canvas dimensions with comfortable 80px margins on all sides
    const TARGET_CANVAS_W = Math.max(1020, Math.round(totalLayoutWidth + 120));
    const TARGET_CANVAS_H = Math.max(720, Math.round(totalLayoutHeight + 120));

    // Target center coordinates for the ENTIRE layout (including wing enclosures & badges)
    const targetCenterX = TARGET_CANVAS_W / 2;
    const targetCenterY = TARGET_CANVAS_H / 2;

    const currentCenterX = fullMinX + totalLayoutWidth / 2;
    const currentCenterY = fullMinY + totalLayoutHeight / 2;

    let shiftX = Math.round(targetCenterX - currentCenterX);
    let shiftY = Math.round(targetCenterY - currentCenterY);

    // Safety check: ensure top header badge is ALWAYS at least y = 35px from top
    const newContentMinY = contentMinY + shiftY;
    const newTopHeaderY = newContentMinY - WING_TOP_HEADER_OFFSET;
    if (newTopHeaderY < 35) {
      shiftY += Math.round(35 - newTopHeaderY);
    }

    const activeRoomIds = new Set(activeRooms.map(r => r.id));
    setRooms(prev => prev.map(r => {
      if (activeRoomIds.has(r.id)) {
        return { 
          ...r, 
          x: Math.round(r.x + shiftX), 
          y: Math.round(r.y + shiftY) 
        };
      }
      return r;
    }));

    const activeNodeIds = new Set(activeNodes.map(n => n.id));
    setNodes(prev => prev.map(n => {
      if (activeNodeIds.has(n.id)) {
        return { 
          ...n, 
          x: Math.round(n.x + shiftX), 
          y: Math.round(n.y + shiftY) 
        };
      }
      return n;
    }));

    showToast('Layout e quadrantes centralizados com sucesso!');
  }, [rooms, nodes, selectedWingFilter, recordHistorySnapshot, showToast]);

  // Close context menu when clicking outside, handle Escape and Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (contextMenu && !target.closest('#floatingContextMenu')) {
        setContextMenu(null);
      }
      if (openToolbarCategory && !target.closest('#toolbarAssetMenu')) {
        setOpenToolbarCategory(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);

      // Undo: Ctrl+Z / Cmd+Z (without shift)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && !isInput) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !isInput) ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z' && !isInput)) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === 'Escape') {
        setContextMenu(null);
        setConnectingFromNodeId(null);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // If not typing in input/textarea
        if (isInput) return;
        if (selectedNodeId) handleDeleteNode(selectedNodeId);
        else if (selectedRoomId) handleDeleteRoom(selectedRoomId);
        else if (selectedLinkId) handleDeleteLink(selectedLinkId);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu, selectedNodeId, selectedRoomId, selectedLinkId, handleUndo, handleRedo]);

  // Room Handlers
  const handleSaveRoom = (roomData: Partial<EnvironmentRoom>) => {
    if (!roomData.name) {
      showToast('Informe o nome da sala / ambiente.');
      return;
    }

    recordHistorySnapshot(roomData.id ? `Alterou ambiente '${roomData.name}'` : `Criou ambiente '${roomData.name}'`);

    // Determine target wing strictly: prioritize explicit room wing, or current active wing filter (if not 'all'), or first wing
    const effectiveWingId = roomData.wingId !== undefined 
      ? roomData.wingId 
      : (selectedWingFilter !== 'all' ? selectedWingFilter : (wings[0]?.id || ''));

    if (roomData.id) {
      setRooms(prev => prev.map(r => r.id === roomData.id ? { ...r, ...roomData, wingId: effectiveWingId || undefined } as EnvironmentRoom : r));
      showToast(`Ambiente '${roomData.name}' atualizado!`);
    } else {
      // Calculate quadrant code / positioning scoped to this wing's existing rooms
      const wingExistingRooms = rooms.filter(r => (effectiveWingId ? r.wingId === effectiveWingId : !r.wingId));
      const usedCodesInWing = wingExistingRooms.map(r => r.quadrantCode);
      const freeSlot = QUADRANT_SLOTS.find(s => !usedCodesInWing.includes(s.code)) || QUADRANT_SLOTS[2];

      const qCode = roomData.quadrantCode || freeSlot.code;
      const slot = QUADRANT_SLOTS.find(s => s.code === qCode) || freeSlot;

      // Unique ID ensuring absolute independence across wings
      const newRoom: EnvironmentRoom = {
        id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: roomData.name || 'Novo Ambiente',
        category: roomData.category || 'office',
        quadrantCode: slot.code,
        wingId: effectiveWingId || undefined,
        x: Number(roomData.x ?? slot.x),
        y: Number(roomData.y ?? slot.y),
        width: Number(roomData.width ?? slot.width),
        height: Number(roomData.height ?? slot.height),
        wallColor: roomData.wallColor || slot.color,
        uplinkDevice: roomData.uplinkDevice || 'main_switch',
        uplinkCableType: roomData.uplinkCableType || 'SFTP CAT6 (Azul - Blindado)',
        uplinkVlan: roomData.uplinkVlan || 'VLAN 100',
        uplinkSpeed: roomData.uplinkSpeed || '1 Gbps RJ45',
        equipmentCount: roomData.equipmentCount || 0,
        notes: roomData.notes || `Anexo no Quadrante [${slot.code}]`,
        activeOnMap: roomData.activeOnMap ?? true
      };
      setRooms(prev => [...prev, newRoom]);
      setSelectedRoomId(newRoom.id);
      setSelectedNodeId(null);
      setSelectedLinkId(null);
      showToast(`Ambiente '${newRoom.name}' criado exclusivamente nesta Ala!`);
    }
    setEditingRoom(null);
  };

  const handleUpdateRoomPosition = (id: string, newX: number, newY: number) => {
    const currentRoom = rooms.find(r => r.id === id);
    if (!currentRoom) return;

    const dx = newX - currentRoom.x;
    const dy = newY - currentRoom.y;

    setRooms(prev => prev.map(r => r.id === id ? { ...r, x: newX, y: newY } : r));

    // Move all nodes inside this room along with the room
    setNodes(prev => prev.map(node => {
      const isInside = (
        node.roomId === id ||
        (node.x >= currentRoom.x - 10 && node.x <= currentRoom.x + currentRoom.width + 10 &&
         node.y >= currentRoom.y - 10 && node.y <= currentRoom.y + currentRoom.height + 10)
      );

      if (isInside) {
        return {
          ...node,
          roomId: id,
          x: Math.round(node.x + dx),
          y: Math.round(node.y + dy)
        };
      }
      return node;
    }));
  };

  const handleUpdateRoomSize = (id: string, newWidth: number, newHeight: number) => {
    const currentRoom = rooms.find(r => r.id === id);
    if (!currentRoom) return;

    const clampedW = Math.max(30, Math.round(newWidth));
    const clampedH = Math.max(30, Math.round(newHeight));

    setRooms(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, width: clampedW, height: clampedH } : r);
      localStorage.setItem('applet_infra_topology_rooms', JSON.stringify(updated));
      return updated;
    });

    // Positions of items and furniture inside the room are preserved exactly as they were (no automatic scaling or repositioning).
  };

  // Door Manipulation Handlers
  const handleToggleRoomDoorSwing = (roomId: string) => {
    recordHistorySnapshot('Alterou sentido da porta da sala');
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      const currentSwing: DoorSwing = r.doorSwing || 'inside-left';
      const swingTransitions: Record<DoorSwing, DoorSwing> = {
        'inside-left': 'inside-right',
        'inside-right': 'outside-left',
        'outside-left': 'outside-right',
        'outside-right': 'inside-left'
      };
      const nextSwing = swingTransitions[currentSwing] || 'inside-right';
      const isInside = nextSwing.startsWith('inside');
      const isLeft = nextSwing.endsWith('left');
      showToast(`Porta de '${r.name}': Abertura ${isInside ? 'para Dentro' : 'para Fora'} (${isLeft ? 'Esq' : 'Dir'})`);
      return { ...r, doorSwing: nextSwing };
    }));
  };

  const handleCycleRoomDoorWall = (roomId: string) => {
    recordHistorySnapshot('Moveu porta de parede');
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      const currentWall: DoorWall = r.doorWall || 'bottom';
      const wallTransitions: Record<DoorWall, DoorWall> = {
        'bottom': 'right',
        'right': 'top',
        'top': 'left',
        'left': 'bottom',
        'none': 'bottom'
      };
      const nextWall = wallTransitions[currentWall] || 'bottom';
      const wallNames: Record<DoorWall, string> = {
        bottom: 'Parede Inferior (Sul)',
        top: 'Parede Superior (Norte)',
        left: 'Parede Esquerda (Oeste)',
        right: 'Parede Direita (Leste)',
        none: 'Sem Porta'
      };
      showToast(`Porta de '${r.name}' movida para: ${wallNames[nextWall]}`);
      return { ...r, doorWall: nextWall };
    }));
  };

  const handleSetRoomDoorWall = (roomId: string, wall: DoorWall) => {
    recordHistorySnapshot(`Moveu porta para ${wall}`);
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      return { ...r, doorWall: wall };
    }));
    const wallNames: Record<DoorWall, string> = {
      bottom: 'Parede Inferior (Sul)',
      top: 'Parede Superior (Norte)',
      left: 'Parede Esquerda (Oeste)',
      right: 'Parede Direita (Leste)',
      none: 'Sem Porta'
    };
    showToast(`Porta configurada na ${wallNames[wall]}`);
  };

  const handleUpdateRoomDoor = (roomId: string, updates: Partial<EnvironmentRoom>) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, ...updates } : r));
  };

  const handleSetRoomDoorOffsetPreset = (roomId: string, preset: 'start' | 'center' | 'end') => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      const wall = r.doorWall || 'bottom';
      const wallLen = (wall === 'left' || wall === 'right') ? r.height : r.width;
      const doorW = r.doorWidth || 32;
      let newOffset = 25;
      if (preset === 'center') {
        newOffset = Math.max(16, Math.round((wallLen - doorW) / 2));
      } else if (preset === 'end') {
        newOffset = Math.max(16, wallLen - doorW - 25);
      }
      return { ...r, doorOffset: newOffset };
    }));
    showToast(`Posição da porta ajustada no ambiente!`);
  };
  const handleAutoFitNodesInQuadrants = () => {
    setNodes(prevNodes => {
      const updatedNodes = [...prevNodes];

      rooms.filter(r => r.activeOnMap).forEach(room => {
        const roomNodes = updatedNodes.filter(n =>
          n.roomId === room.id ||
          (n.x >= room.x - 10 && n.x <= room.x + room.width + 10 &&
           n.y >= room.y - 10 && n.y <= room.y + room.height + 10)
        );

        if (roomNodes.length === 0) return;

        const isDataCenter = room.category === 'datacenter' || room.category === 'rack_room';

        if (isDataCenter) {
          const routers = roomNodes.filter(n => n.type === 'router' || n.type === 'firewall');
          const switches = roomNodes.filter(n => n.type === 'switch' || n.type === 'patch_panel');
          const racks = roomNodes.filter(n => n.type === 'rack' || n.type === 'server' || n.type === 'storage');
          const others = roomNodes.filter(n => !routers.includes(n) && !switches.includes(n) && !racks.includes(n));

          let currentY = room.y + 44;

          // Routers at top
          routers.forEach(r => {
            const idx = updatedNodes.findIndex(n => n.id === r.id);
            if (idx !== -1) {
              updatedNodes[idx] = {
                ...updatedNodes[idx],
                roomId: room.id,
                x: Math.round(room.x + (room.width - (r.width || 46)) / 2),
                y: currentY
              };
            }
            currentY += (r.height || 46) + 14;
          });

          // Switches in middle column
          switches.forEach(sw => {
            const idx = updatedNodes.findIndex(n => n.id === sw.id);
            if (idx !== -1) {
              updatedNodes[idx] = {
                ...updatedNodes[idx],
                roomId: room.id,
                x: Math.round(room.x + (room.width - (sw.width || 60)) / 2),
                y: currentY
              };
            }
            currentY += (sw.height || 26) + 14;
          });

          // Racks side-by-side near bottom
          const rackWidth = 55;
          const totalRackWidth = racks.length * (rackWidth + 24) - 24;
          const startRackX = Math.max(room.x + 20, room.x + (room.width - totalRackWidth) / 2);

          racks.forEach((rack, rIdx) => {
            const idx = updatedNodes.findIndex(n => n.id === rack.id);
            if (idx !== -1) {
              updatedNodes[idx] = {
                ...updatedNodes[idx],
                roomId: room.id,
                x: Math.round(startRackX + rIdx * (rackWidth + 24)),
                y: Math.min(room.y + room.height - 75, Math.max(currentY + 6, room.y + 130))
              };
            }
          });

          // Others
          others.forEach((oth, oIdx) => {
            const idx = updatedNodes.findIndex(n => n.id === oth.id);
            if (idx !== -1) {
              updatedNodes[idx] = {
                ...updatedNodes[idx],
                roomId: room.id,
                x: Math.round(room.x + 18 + (oIdx % 2) * 75),
                y: Math.round(room.y + room.height - 52)
              };
            }
          });

        } else {
          // Office / Open Space / Meeting
          const aps = roomNodes.filter(n => n.type === 'access_point');
          const workstations = roomNodes.filter(n => n.type === 'workstation');
          const others = roomNodes.filter(n => n.type !== 'access_point' && n.type !== 'workstation');

          // Access point centered near ceiling
          aps.forEach(ap => {
            const idx = updatedNodes.findIndex(n => n.id === ap.id);
            if (idx !== -1) {
              updatedNodes[idx] = {
                ...updatedNodes[idx],
                roomId: room.id,
                x: Math.round(room.x + (room.width - (ap.width || 32)) / 2),
                y: room.y + 42
              };
            }
          });

          // Workstations in balanced matrix
          const wsW = 65;
          const wsH = 44;
          const availableW = room.width - 36;
          const cols = Math.max(1, Math.min(4, Math.floor(availableW / (wsW + 20))));
          const colGap = cols > 1 ? (availableW - cols * wsW) / (cols - 1) : 25;
          const rowGap = 20;
          const startY = room.y + (aps.length > 0 ? 82 : 46);

          workstations.forEach((ws, wIdx) => {
            const col = wIdx % cols;
            const row = Math.floor(wIdx / cols);
            const idx = updatedNodes.findIndex(n => n.id === ws.id);
            if (idx !== -1) {
              updatedNodes[idx] = {
                ...updatedNodes[idx],
                roomId: room.id,
                x: Math.round(room.x + 18 + col * (wsW + colGap)),
                y: Math.round(startY + row * (wsH + rowGap))
              };
            }
          });

          // Others (printers, voip) along perimeter
          others.forEach((oth, oIdx) => {
            const idx = updatedNodes.findIndex(n => n.id === oth.id);
            if (idx !== -1) {
              updatedNodes[idx] = {
                ...updatedNodes[idx],
                roomId: room.id,
                x: Math.round(room.x + 18 + oIdx * 65),
                y: Math.round(room.y + room.height - 52)
              };
            }
          });
        }
      });

      return updatedNodes;
    });

    showToast('Equipamentos perfeitamente ajustados aos limites de cada ambiente!');
  };

  // Organizes rooms into attached, non-overlapping layouts seamlessly
  const handleOrganizeQuadrantsAttached = () => {
    const q1W = 280;
    const q2W = 340;
    const row1H = 230;
    const row2H = 230;
    const startX = 30;
    const startY = 30;

    setRooms(prevRooms => {
      return prevRooms.map(room => {
        if (room.quadrantCode === 'Q1' || room.id === 'room_dc') {
          return { ...room, x: startX, y: startY, width: q1W, height: row1H };
        }
        if (room.quadrantCode === 'Q2' || room.id === 'room_office') {
          return { ...room, x: startX + q1W + 10, y: startY, width: q2W, height: row1H };
        }
        if (room.quadrantCode === 'Q3' || room.id === 'room_technical') {
          return { ...room, x: startX, y: startY + row1H + 15, width: q1W, height: row2H };
        }
        if (room.quadrantCode === 'Q4' || room.id === 'room_meeting') {
          return { ...room, x: startX + q1W + 10, y: startY + row1H + 15, width: q2W, height: row2H };
        }
        if (room.quadrantCode === 'Q5') {
          return { ...room, x: startX + q1W + q2W + 20, y: startY, width: 260, height: row1H };
        }
        if (room.quadrantCode === 'Q6') {
          return { ...room, x: startX + q1W + q2W + 20, y: startY + row1H + 15, width: 260, height: row2H };
        }
        return room;
      });
    });

    // Auto-fit nodes inside the newly arranged rooms
    setTimeout(() => {
      handleAutoFitNodesInQuadrants();
      showToast('Ambientes organizados e equipamentos alinhados com sucesso!');
    }, 80);
  };

  const handleAddRoomInQuadrant = (qCode: string) => {
    const slot = QUADRANT_SLOTS.find(s => s.code === qCode) || QUADRANT_SLOTS[2];
    const targetWing = selectedWingFilter !== 'all' ? selectedWingFilter : (wings[0]?.id || '');
    setEditingRoom({
      name: slot.code === 'Q3' ? 'Sala Técnica & NOC' : slot.code === 'Q4' ? 'Sala de Reunião Boardroom' : slot.code === 'Q5' ? 'Suporte TI & Almoxarifado' : 'Laboratório & Treinamento',
      category: slot.code === 'Q3' ? 'rack_room' : slot.code === 'Q4' ? 'meeting' : slot.code === 'Q5' ? 'support' : 'other',
      quadrantCode: slot.code,
      wingId: targetWing,
      x: slot.x,
      y: slot.y,
      width: slot.width,
      height: slot.height,
      wallColor: slot.color,
      uplinkDevice: 'main_switch',
      uplinkCableType: 'SFTP CAT6 (Azul - Blindado)',
      uplinkVlan: 'VLAN 100',
      uplinkSpeed: '1 Gbps RJ45',
      equipmentCount: 3,
      notes: slot.description,
      activeOnMap: true
    });
  };

  const handleDeleteRoom = (id: string) => {
    const room = rooms.find(r => r.id === id);
    recordHistorySnapshot(`Excluiu ambiente '${room?.name || id}'`);
    setRooms(prev => prev.filter(r => r.id !== id));
    if (selectedRoomId === id) setSelectedRoomId(null);
    showToast(`Ambiente '${room?.name || id}' excluído.`);
  };

  // Link / Cable Handlers
  const handleAddLink = (fromNodeId: string, toNodeId: string, cableType: CableType = 'SFTP CAT6 (Azul - Blindado)') => {
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) return;
    const exists = links.some(l => 
      (l.fromNodeId === fromNodeId && l.toNodeId === toNodeId) || 
      (l.fromNodeId === toNodeId && l.toNodeId === fromNodeId)
    );
    if (exists) {
      showToast('Estes dois equipamentos já possuem uma conexão!');
      return;
    }
    const fromNode = nodes.find(n => n.id === fromNodeId);
    const toNode = nodes.find(n => n.id === toNodeId);
    recordHistorySnapshot(`Conectou cabo entre ${fromNode?.name || fromNodeId} e ${toNode?.name || toNodeId}`);
    const newLink: TopologyLink = {
      id: `link_${Date.now()}`,
      fromNodeId,
      toNodeId,
      cableType,
      speed: '1 Gbps RJ45'
    };
    setLinks(prev => [...prev, newLink]);
    setSelectedLinkId(newLink.id);
    setSelectedNodeId(null);
    setSelectedRoomId(null);
    setConnectingFromNodeId(null);
    showToast(`Cabo ligado: ${fromNode?.name || fromNodeId} ↔ ${toNode?.name || toNodeId}`);
  };

  const handleDeleteLink = (id: string) => {
    recordHistorySnapshot('Removeu cabo de rede');
    setLinks(prev => prev.filter(l => l.id !== id));
    if (selectedLinkId === id) setSelectedLinkId(null);
    showToast('Cabo de rede desconectado.');
  };

  const handleUpdateLink = (id: string, partial: Partial<TopologyLink>) => {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, ...partial } : l));
  };

  const handleUpdateLinkWaypoint = (linkId: string, index: number, x: number, y: number) => {
    setLinks(prev => prev.map(l => {
      if (l.id !== linkId) return l;
      const waypoints = [...(l.waypoints || [])];
      waypoints[index] = { x, y };
      return { ...l, waypoints };
    }));
  };

  const handleAddLinkWaypoint = (linkId: string, x: number, y: number) => {
    recordHistorySnapshot('Adicionou ponto de curva no cabo');
    setLinks(prev => prev.map(l => {
      if (l.id !== linkId) return l;
      const waypoints = [...(l.waypoints || []), { x, y }];
      return { ...l, waypoints };
    }));
    showToast('Ponto de curva adicionado! Arraste-o para moldar a rota.');
  };

  // Station Standard Handlers
  const handleSaveStation = (stationData: Partial<StationStandard>) => {
    if (!stationData.profileName) {
      showToast('Informe o nome do padrão da estação.');
      return;
    }

    if (stationData.id) {
      setStationStandards(prev => prev.map(s => s.id === stationData.id ? { ...s, ...stationData } as StationStandard : s));
      showToast(`Padrão '${stationData.profileName}' atualizado!`);
    } else {
      const newStation: StationStandard = {
        id: `std_${Date.now()}`,
        profileName: stationData.profileName || 'Novo Padrão',
        cpu: stationData.cpu || 'Intel Core i7 13th Gen',
        ram: stationData.ram || '16 GB DDR5',
        storage: stationData.storage || '512 GB NVMe SSD',
        gpu: stationData.gpu || 'Integrated',
        monitors: stationData.monitors || 'Monitores Duplos 24"',
        voipPhone: stationData.voipPhone || 'Telefone IP VoIP',
        os: stationData.os || 'Windows 11 Pro',
        quantity: Number(stationData.quantity || 1),
        roomId: stationData.roomId || (rooms[0]?.id || 'room_office'),
        unitCost: Number(stationData.unitCost || 5000),
        accessoriesIncluded: stationData.accessoriesIncluded || 'Teclado/Mouse Ergonomico'
      };
      setStationStandards(prev => [...prev, newStation]);
      showToast(`Novo padrão '${newStation.profileName}' cadastrado com sucesso!`);
    }
    setEditingStation(null);
  };

  const handleDeleteStation = (id: string) => {
    setStationStandards(prev => prev.filter(s => s.id !== id));
    showToast('Padrão de estação removido.');
  };

  // Accessory Handlers
  const handleSaveAccessory = (accData: Partial<InfrastructureAccessory>) => {
    if (!accData.name) {
      showToast('Informe o nome do acessório.');
      return;
    }

    if (accData.id) {
      setAccessories(prev => prev.map(a => a.id === accData.id ? { ...a, ...accData } as InfrastructureAccessory : a));
      showToast(`Acessório '${accData.name}' atualizado!`);
    } else {
      const newAcc: InfrastructureAccessory = {
        id: `acc_${Date.now()}`,
        name: accData.name || 'Novo Acessório',
        category: accData.category || 'Passivos & Patching',
        brandModel: accData.brandModel || 'Genérico',
        quantity: Number(accData.quantity || 1),
        unitPrice: Number(accData.unitPrice || 100),
        roomId: accData.roomId || (rooms[0]?.id || 'room_dc'),
        notes: accData.notes || '',
        status: accData.status || 'installed'
      };
      setAccessories(prev => [...prev, newAcc]);
      showToast(`Acessório '${newAcc.name}' incluído no inventário!`);
    }
    setEditingAccessory(null);
  };

  const handleDeleteAccessory = (id: string) => {
    setAccessories(prev => prev.filter(a => a.id !== id));
    showToast('Acessório removido.');
  };

  // Auto-align nodes cleanly
  const handleAutoAlign = () => {
    recordHistorySnapshot('Alinhou nós à grade de 20px');
    setNodes(prev => {
      return prev.map(node => {
        return {
          ...node,
          x: Math.round(node.x / 20) * 20,
          y: Math.round(node.y / 20) * 20
        };
      });
    });
    showToast('Equipamentos alinhados à grade ortogonal de 20px.');
  };

  // Helper to check if two rects overlap with an extra buffer margin
  const checkOverlap = (
    r1: { x: number; y: number; width: number; height: number },
    r2: { x: number; y: number; width: number; height: number },
    margin: number = 10
  ) => {
    return !(
      r1.x + r1.width + margin <= r2.x ||
      r1.x >= r2.x + r2.width + margin ||
      r1.y + r1.height + margin <= r2.y ||
      r1.y >= r2.y + r2.height + margin
    );
  };

  // Helper to find a smart non-overlapping position inside room or canvas
  const findNonOverlappingPosition = (
    targetRoom: EnvironmentRoom | undefined,
    width: number,
    height: number,
    preferredX?: number,
    preferredY?: number,
    existingNodes: TopologyNode[] = nodes
  ): { x: number; y: number } => {
    const margin = 10;

    if (targetRoom) {
      const minX = Math.round(targetRoom.x + 14);
      const maxX = Math.max(minX + 4, Math.round(targetRoom.x + targetRoom.width - width - 14));
      const minY = Math.round(targetRoom.y + 36); // Below 28px header banner + padding
      const maxY = Math.max(minY + 4, Math.round(targetRoom.y + targetRoom.height - height - 12));

      // 1. If user provided a specific preferred coordinate inside this room, check if it's free
      if (preferredX !== undefined && preferredY !== undefined) {
        const clampedX = Math.max(minX, Math.min(maxX, preferredX));
        const clampedY = Math.max(minY, Math.min(maxY, preferredY));
        const candidate = { x: clampedX, y: clampedY, width, height };
        const hasOverlap = existingNodes.some(n => checkOverlap(candidate, { x: n.x, y: n.y, width: n.width || 50, height: n.height || 40 }, margin));
        if (!hasOverlap) {
          return { x: clampedX, y: clampedY };
        }
      }

      // 2. Systematic matrix scan inside targetRoom (row by row, col by col with 10px margin)
      for (let y = minY; y <= maxY; y += 12) {
        for (let x = minX; x <= maxX; x += 14) {
          const candidate = { x, y, width, height };
          const hasOverlap = existingNodes.some(n => checkOverlap(candidate, { x: n.x, y: n.y, width: n.width || 50, height: n.height || 40 }, margin));
          if (!hasOverlap) {
            return { x, y };
          }
        }
      }

      // 3. If standard margin couldn't find space, try tighter margin (4px)
      for (let y = minY; y <= maxY; y += 8) {
        for (let x = minX; x <= maxX; x += 8) {
          const candidate = { x, y, width, height };
          const hasOverlap = existingNodes.some(n => checkOverlap(candidate, { x: n.x, y: n.y, width: n.width || 50, height: n.height || 40 }, 4));
          if (!hasOverlap) {
            return { x, y };
          }
        }
      }

      // 4. Safe fallback strictly constrained within the room bounding box
      const roomNodes = existingNodes.filter(n => n.roomId === targetRoom.id);
      const roomNodesCount = roomNodes.length;
      const spanX = Math.max(8, maxX - minX);
      const spanY = Math.max(8, maxY - minY);
      const cols = Math.max(1, Math.floor(spanX / (width + 6)));
      const col = roomNodesCount % cols;
      const row = Math.floor(roomNodesCount / cols) % Math.max(1, Math.floor(spanY / (height + 6)));
      
      const fallbackX = minX + (col * (width + 6)) % spanX;
      const fallbackY = minY + (row * (height + 6)) % spanY;

      return { 
        x: Math.round(Math.max(minX, Math.min(maxX, fallbackX))), 
        y: Math.round(Math.max(minY, Math.min(maxY, fallbackY))) 
      };
    }

    // No target room: Global canvas search
    if (preferredX !== undefined && preferredY !== undefined) {
      const candidate = { x: preferredX, y: preferredY, width, height };
      const hasOverlap = existingNodes.some(n => checkOverlap(candidate, { x: n.x, y: n.y, width: n.width || 50, height: n.height || 40 }, margin));
      if (!hasOverlap) {
        return { x: preferredX, y: preferredY };
      }
    }

    // Default global search
    const startX = 320;
    const startY = 180;
    for (let r = 0; r < 25; r++) {
      for (let c = 0; c < 25; c++) {
        const testX = startX + c * (width + 20);
        const testY = startY + r * (height + 20);
        const candidate = { x: testX, y: testY, width, height };
        const hasOverlap = existingNodes.some(n => checkOverlap(candidate, { x: n.x, y: n.y, width: n.width || 50, height: n.height || 40 }, margin));
        if (!hasOverlap) {
          return { x: testX, y: testY };
        }
      }
    }

    return { x: startX + (existingNodes.length % 5) * 30, y: startY + (existingNodes.length % 5) * 30 };
  };

  // Add new equipment (with optional custom coordinates or smart placement in selected room)
  const handleAddEquipment = (type: DeviceType, customX?: number, customY?: number, roomId?: string) => {
    const nextNum = nodes.filter(n => n.type === type).length + 1;
    let newName = '';
    let newWidth = 50;
    let newHeight = 40;
    let defaultIp = `192.168.10.${100 + nodes.length}`;

    switch (type) {
      case 'desk':
        newName = `Mesa ${nextNum}`;
        newWidth = 70;
        newHeight = 44;
        break;
      case 'chair':
        newName = `Cadeira ${nextNum}`;
        newWidth = 68;
        newHeight = 68;
        break;
      case 'table':
        newName = `Mesa de Reunião ${nextNum}`;
        newWidth = 100;
        newHeight = 54;
        break;
      case 'simple_chair':
        newName = `Cadeira Reunião ${nextNum}`;
        newWidth = 56;
        newHeight = 56;
        break;
      case 'workstation':
        newName = `Estação ${nextNum}`;
        newWidth = 104;
        newHeight = 70;
        break;
      case 'rack':
        newName = `Rack ${String.fromCharCode(65 + nodes.filter(n => n.type === 'rack').length)}`;
        newWidth = 55;
        newHeight = 110;
        break;
      case 'switch':
        newName = `Switch ${nextNum} (24P)`;
        newWidth = 60;
        newHeight = 26;
        break;
      case 'router':
        newName = `Roteador Gateway ${nextNum}`;
        newWidth = 48;
        newHeight = 44;
        break;
      case 'access_point':
        newName = `AP Wi-Fi ${nextNum}`;
        newWidth = 36;
        newHeight = 36;
        break;
      case 'ups':
        newName = `Nobreak UPS ${nextNum}`;
        newWidth = 44;
        newHeight = 52;
        break;
      case 'camera':
        newName = `Câmera CFTV ${nextNum}`;
        newWidth = 40;
        newHeight = 40;
        break;
      case 'voip':
        newName = `Telefone IP ${nextNum}`;
        newWidth = 44;
        newHeight = 44;
        break;
      case 'printer':
        newName = `Impressora ${nextNum}`;
        newWidth = 90;
        newHeight = 80;
        break;
      case 'firewall':
        newName = `Firewall NGFW ${nextNum}`;
        newWidth = 55;
        newHeight = 30;
        break;
      case 'patch_panel':
        newName = `Patch Panel ${nextNum}`;
        newWidth = 60;
        newHeight = 20;
        break;
      default:
        newName = `Dispositivo ${nextNum}`;
    }

    // Determine target room with robust priority:
    // 1. Explicit roomId parameter
    // 2. Currently selected room (selectedRoomId)
    // 3. activeRoomId
    // 4. Room of currently selected node (selectedNodeId -> activeNode.roomId)
    // 5. Room containing customX, customY coordinates
    // 6. First active room on the map
    let targetRoom: EnvironmentRoom | undefined = undefined;
    if (roomId) {
      targetRoom = rooms.find(r => r.id === roomId);
    } else if (selectedRoomId) {
      targetRoom = rooms.find(r => r.id === selectedRoomId);
    } else if (activeRoomId) {
      targetRoom = rooms.find(r => r.id === activeRoomId);
    } else if (selectedNodeId) {
      const selNode = nodes.find(n => n.id === selectedNodeId);
      if (selNode?.roomId) {
        targetRoom = rooms.find(r => r.id === selNode.roomId);
      }
    }
    
    if (!targetRoom && customX !== undefined && customY !== undefined) {
      targetRoom = rooms.find(r => 
        customX >= r.x && customX <= r.x + r.width &&
        customY >= r.y && customY <= r.y + r.height
      );
    }

    if (!targetRoom && rooms.length > 0) {
      targetRoom = rooms.find(r => r.activeOnMap) || rooms[0];
    }

    // Compute smart non-overlapping position strictly inside target room
    const { x: finalX, y: finalY } = findNonOverlappingPosition(
      targetRoom,
      newWidth,
      newHeight,
      customX,
      customY,
      nodes
    );

    const newNode: TopologyNode = {
      id: `dev_${Date.now()}`,
      name: newName,
      type: type,
      x: finalX,
      y: finalY,
      width: newWidth,
      height: newHeight,
      ip: defaultIp,
      vlan: targetRoom?.uplinkVlan || 'VLAN 100',
      connectedTo: 'patch_panel',
      roomId: targetRoom ? targetRoom.id : (roomId || undefined),
      details: {
        status: 'online',
        dualMonitor: config.dualMonitors,
        voipPhone: config.voipPhones,
        vendor: 'Genérico TI'
      }
    };

    recordHistorySnapshot(`Adicionou equipamento '${newName}'`);
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    if (targetRoom) {
      setSelectedRoomId(targetRoom.id);
      setActiveRoomId(targetRoom.id);
    }
    setSelectedLinkId(null);
    
    if (targetRoom) {
      showToast(`${newName} inserido no ambiente '${targetRoom.name}'!`);
    } else {
      showToast(`${newName} inserido! Arraste-o para posicionar.`);
    }
  };

  // Duplicate equipment with non-overlapping placement
  const handleDuplicateNode = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    recordHistorySnapshot(`Duplicou equipamento '${node.name}'`);
    const targetRoom = node.roomId ? rooms.find(r => r.id === node.roomId) : (selectedRoomId ? rooms.find(r => r.id === selectedRoomId) : undefined);
    const { x: newX, y: newY } = findNonOverlappingPosition(
      targetRoom,
      node.width || 50,
      node.height || 40,
      node.x + 30,
      node.y + 30,
      nodes
    );
    const newNode: TopologyNode = {
      ...node,
      id: `dev_${Date.now()}`,
      name: `${node.name} (Cópia)`,
      x: newX,
      y: newY,
      roomId: targetRoom ? targetRoom.id : node.roomId,
      ip: `192.168.10.${100 + nodes.length + 1}`,
      assetTag: undefined,
      assetId: undefined
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    if (targetRoom) {
      setSelectedRoomId(targetRoom.id);
    }
    setSelectedLinkId(null);
    showToast(`Equipamento '${newNode.name}' duplicado sem sobreposição.`);
  };

  // Rotate equipment/furniture node
  const handleRotateNode = (id: string, customDeg?: number) => {
    setNodes(prev => prev.map(n => {
      if (n.id !== id) return n;
      const currentRot = n.rotation || 0;
      const nextRot = customDeg !== undefined ? customDeg : (currentRot + 90) % 360;
      return { ...n, rotation: nextRot };
    }));
    const node = nodes.find(n => n.id === id);
    const nextDeg = customDeg !== undefined ? customDeg : (((node?.rotation || 0) + 90) % 360);
    recordHistorySnapshot(`Rotacionou item '${node?.name || id}' para ${nextDeg}°`);
    showToast(`Item rotacionado para ${nextDeg}°!`);
  };

  // Rotate Group relative to its center (+90°, -90°, 180°, etc.)
  const handleRotateGroup = (targetIds: string[], angleDeg: number = 90) => {
    if (!targetIds || targetIds.length === 0) return;
    if (targetIds.length === 1) {
      handleRotateNode(targetIds[0]);
      return;
    }

    const targetNodes = nodes.filter(n => targetIds.includes(n.id));
    if (targetNodes.length === 0) return;

    let minCX = Infinity, minCY = Infinity, maxCX = -Infinity, maxCY = -Infinity;
    targetNodes.forEach(n => {
      const sw = (n.width || 50) * 0.5;
      const sh = (n.height || 40) * 0.5;
      const cx = n.x + sw / 2;
      const cy = n.y + sh / 2;
      if (cx < minCX) minCX = cx;
      if (cy < minCY) minCY = cy;
      if (cx > maxCX) maxCX = cx;
      if (cy > maxCY) maxCY = cy;
    });

    const groupCX = (minCX + maxCX) / 2;
    const groupCY = (minCY + maxCY) / 2;
    const rad = (angleDeg * Math.PI) / 180;

    setNodes(prev => prev.map(n => {
      if (!targetIds.includes(n.id)) return n;
      const sw = (n.width || 50) * 0.5;
      const sh = (n.height || 40) * 0.5;
      const cx = n.x + sw / 2;
      const cy = n.y + sh / 2;

      const relX = cx - groupCX;
      const relY = cy - groupCY;

      const newRelX = relX * Math.cos(rad) - relY * Math.sin(rad);
      const newRelY = relX * Math.sin(rad) + relY * Math.cos(rad);

      const newCX = groupCX + newRelX;
      const newCY = groupCY + newRelY;

      const newX = newCX - sw / 2;
      const newY = newCY - sh / 2;
      const currentRot = n.rotation || 0;
      let nextRot = (currentRot + angleDeg) % 360;
      if (nextRot < 0) nextRot += 360;

      return {
        ...n,
        x: Math.max(10, Math.round(newX)),
        y: Math.max(10, Math.round(newY)),
        rotation: nextRot
      };
    }));

    recordHistorySnapshot(`Rotacionou grupo de ${targetNodes.length} objetos (${angleDeg}°)`);
    showToast(`🔄 Grupo de ${targetNodes.length} objetos rotacionado (${angleDeg}°)!`);
  };

  // Flip / Invert Group Horizontally
  const handleFlipGroupHorizontal = (targetIds: string[]) => {
    if (!targetIds || targetIds.length === 0) return;
    const targetNodes = nodes.filter(n => targetIds.includes(n.id));
    if (targetNodes.length === 0) return;

    let minCX = Infinity, maxCX = -Infinity;
    targetNodes.forEach(n => {
      const sw = (n.width || 50) * 0.5;
      const cx = n.x + sw / 2;
      if (cx < minCX) minCX = cx;
      if (cx > maxCX) maxCX = cx;
    });
    const groupCX = (minCX + maxCX) / 2;

    setNodes(prev => prev.map(n => {
      if (!targetIds.includes(n.id)) return n;
      const sw = (n.width || 50) * 0.5;
      const cx = n.x + sw / 2;
      const dist = cx - groupCX;
      const newCX = groupCX - dist;
      const newX = newCX - sw / 2;

      const curRot = n.rotation || 0;
      let newRot = curRot;
      if (curRot === 0) newRot = 180;
      else if (curRot === 180) newRot = 0;
      else if (curRot === 90) newRot = 270;
      else if (curRot === 270) newRot = 90;

      return {
        ...n,
        x: Math.max(10, Math.round(newX)),
        rotation: newRot
      };
    }));

    recordHistorySnapshot(`Inverteu grupo na horizontal (${targetNodes.length} objetos)`);
    showToast(`↔️ Posição do grupo invertida na Horizontal!`);
  };

  // Flip / Invert Group Vertically
  const handleFlipGroupVertical = (targetIds: string[]) => {
    if (!targetIds || targetIds.length === 0) return;
    const targetNodes = nodes.filter(n => targetIds.includes(n.id));
    if (targetNodes.length === 0) return;

    let minCY = Infinity, maxCY = -Infinity;
    targetNodes.forEach(n => {
      const sh = (n.height || 40) * 0.5;
      const cy = n.y + sh / 2;
      if (cy < minCY) minCY = cy;
      if (cy > maxCY) maxCY = cy;
    });
    const groupCY = (minCY + maxCY) / 2;

    setNodes(prev => prev.map(n => {
      if (!targetIds.includes(n.id)) return n;
      const sh = (n.height || 40) * 0.5;
      const cy = n.y + sh / 2;
      const dist = cy - groupCY;
      const newCY = groupCY - dist;
      const newY = newCY - sh / 2;

      const curRot = n.rotation || 0;
      let newRot = curRot;
      if (curRot === 0) newRot = 180;
      else if (curRot === 180) newRot = 0;
      else if (curRot === 90) newRot = 270;
      else if (curRot === 270) newRot = 90;

      return {
        ...n,
        y: Math.max(10, Math.round(newY)),
        rotation: newRot
      };
    }));

    recordHistorySnapshot(`Inverteu grupo na vertical (${targetNodes.length} objetos)`);
    showToast(`↕️ Posição do grupo invertida na Vertical!`);
  };

  // Rotate individual orientation of items in group
  const handleRotateGroupItemsInPlace = (targetIds: string[], deg?: number) => {
    setNodes(prev => prev.map(n => {
      if (!targetIds.includes(n.id)) return n;
      const curRot = n.rotation || 0;
      const nextRot = deg !== undefined ? deg : (curRot + 90) % 360;
      return { ...n, rotation: nextRot };
    }));
    showToast(`Orientação dos objetos ajustada!`);
  };

  // Delete node
  const handleDeleteNode = (id: string) => {
    const node = nodes.find(n => n.id === id);
    recordHistorySnapshot(`Excluiu equipamento '${node?.name || id}'`);
    setNodes(prev => prev.filter(n => n.id !== id));
    setLinks(prev => prev.filter(l => l.fromNodeId !== id && l.toNodeId !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    showToast('Equipamento removido do layout.');
  };

  // Select all nodes inside a room (group selection)
  const handleSelectAllNodesInRoom = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const roomNodes = nodes.filter(n => {
      if (n.roomId === roomId) return true;
      return n.x >= room.x - 10 && n.x <= room.x + room.width + 10 &&
             n.y >= room.y - 10 && n.y <= room.y + room.height + 10;
    });
    if (roomNodes.length === 0) {
      showToast(`Nenhum objeto encontrado na sala '${room.name}'.`);
      return;
    }
    const ids = roomNodes.map(n => n.id);
    setSelectedNodeIds(ids);
    setSelectedRoomId(roomId);
    setSelectedLinkId(null);
    showToast(`🎯 ${ids.length} objetos da sala '${room.name}' selecionados! Arraste qualquer um para movê-los em grupo.`);
  };

  // Update node position from drag
  const handleUpdateNodePosition = (id: string, x: number, y: number) => {
    setNodes(prev => prev.map(node => {
      if (node.id === id) {
        return { ...node, x, y };
      }
      return node;
    }));
  };

  // Update multiple node positions simultaneously (group movement)
  const handleUpdateNodePositions = (updates: { id: string; x: number; y: number }[]) => {
    const updateMap = new Map(updates.map(u => [u.id, u]));
    setNodes(prev => prev.map(node => {
      const upd = updateMap.get(node.id);
      return upd ? { ...node, x: upd.x, y: upd.y } : node;
    }));
  };

  // Update node dimensions (width, height in pixels)
  const handleUpdateNodeSize = (id: string, width: number, height: number) => {
    setNodes(prev => prev.map(node => {
      if (node.id === id) {
        return { 
          ...node, 
          width: Math.max(16, Math.min(800, Math.round(width))), 
          height: Math.max(16, Math.min(800, Math.round(height))) 
        };
      }
      return node;
    }));
  };

  // Scale node proportionally (+20%, -20%, etc.)
  const handleScaleNode = (id: string, factor: number) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const currentW = node.width || (node.type === 'desk' ? 70 : node.type === 'chair' ? 68 : node.type === 'simple_chair' ? 56 : node.type === 'workstation' ? 83 : node.type === 'printer' ? 90 : node.type === 'table' ? 100 : 50);
    const currentH = node.height || (node.type === 'desk' ? 44 : node.type === 'chair' ? 68 : node.type === 'simple_chair' ? 56 : node.type === 'workstation' ? 56 : node.type === 'printer' ? 80 : node.type === 'table' ? 54 : 40);
    const newW = Math.max(16, Math.min(600, Math.round(currentW * factor)));
    const newH = Math.max(16, Math.min(600, Math.round(currentH * factor)));
    handleUpdateNodeSize(id, newW, newH);
    recordHistorySnapshot(`Redimensionou item '${node.name}' (${newW}x${newH}px)`);
    showToast(`Tamanho atualizado: ${newW} × ${newH} px`);
  };

  // Reset node to default dimensions
  const handleResetNodeSize = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    let defW = 50;
    let defH = 40;
    if (node.type === 'desk') { defW = 70; defH = 44; }
    else if (node.type === 'chair') { defW = 68; defH = 68; }
    else if (node.type === 'table') { defW = 100; defH = 54; }
    else if (node.type === 'simple_chair') { defW = 56; defH = 56; }
    else if (node.type === 'workstation') { defW = 83; defH = 56; }
    else if (node.type === 'rack') { defW = 55; defH = 110; }
    else if (node.type === 'switch') { defW = 60; defH = 26; }
    else if (node.type === 'router') { defW = 48; defH = 44; }
    else if (node.type === 'ups') { defW = 44; defH = 52; }
    else if (node.type === 'camera') { defW = 40; defH = 40; }
    else if (node.type === 'voip') { defW = 44; defH = 44; }
    else if (node.type === 'access_point') { defW = 36; defH = 36; }
    else if (node.type === 'printer') { defW = 90; defH = 80; }
    else if (node.type === 'firewall') { defW = 55; defH = 30; }

    handleUpdateNodeSize(id, defW, defH);
    showToast(`Tamanho padrão restaurado: ${defW} × ${defH} px`);
  };

  // Update node data (name, ip, vlan)
  const handleUpdateNodeData = (id: string, updates: Partial<TopologyNode>) => {
    setNodes(prev => prev.map(node => {
      if (node.id === id) {
        return { ...node, ...updates, details: { ...node.details, ...(updates.details || {}) } };
      }
      return node;
    }));
  };

  // Context Menu Trigger
  const handleContextMenu = (e: React.MouseEvent, type: 'canvas' | 'node' | 'room' | 'link', id?: string) => {
    e.preventDefault();
    e.stopPropagation();

    const svgEl = document.querySelector('#topologySvgCanvas') as SVGSVGElement | null;
    let svgX = 350;
    let svgY = 200;
    if (svgEl) {
      const pt = svgEl.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const transformed = pt.matrixTransform(svgEl.getScreenCTM()?.inverse());
      svgX = Math.round(transformed.x);
      svgY = Math.round(transformed.y);
    }

    if (type === 'node' && id) {
      setSelectedNodeId(id);
      const clickedNode = nodes.find(n => n.id === id);
      if (clickedNode?.roomId) {
        setSelectedRoomId(clickedNode.roomId);
        setActiveRoomId(clickedNode.roomId);
      }
      setSelectedLinkId(null);
    } else if (type === 'room' && id) {
      setSelectedRoomId(id);
      setActiveRoomId(id);
      setSelectedNodeId(null);
      setSelectedLinkId(null);
    } else if (type === 'link' && id) {
      setSelectedLinkId(id);
      setSelectedNodeId(null);
      setSelectedRoomId(null);
    }

    const estimatedWidth = 320;
    const estimatedHeight = 440;
    const initialX = Math.max(12, Math.min(window.innerWidth - estimatedWidth - 12, e.clientX));
    const initialY = Math.max(12, Math.min(window.innerHeight - estimatedHeight - 12, e.clientY));

    setContextMenu({
      isOpen: true,
      x: initialX,
      y: initialY,
      svgX,
      svgY,
      targetType: type,
      targetId: id
    });
  };

  // Discovery & SNMP Scanner State
  const [isScanningSubnet, setIsScanningSubnet] = useState<boolean>(false);
  const [scanSubnetIp, setScanSubnetIp] = useState<string>('192.168.10.0/24');
  const [scanCommunity, setScanCommunity] = useState<string>('public_ro');
  const [snmpVersion, setSnmpVersion] = useState<'v2c' | 'v3'>('v2c');
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredNetworkDevice[]>(INITIAL_DISCOVERED_DEVICES);
  const [scanLogs, setScanLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Sistema de Topologia 2D Interativa inicializado.`,
    `[${new Date().toLocaleTimeString()}] ${nodes.length} equipamentos carregados no editor de layout móvel.`,
    `[${new Date().toLocaleTimeString()}] Pronto para varredura SNMP na porta 161/UDP.`
  ]);

  // Dynamic Prompt Generation
  const promptText = useMemo(() => {
    const dcText = config.hasDataCenter 
      ? `A '${config.room1Name.split('(')[0].trim()}' à esquerda possui ${nodes.filter(n => n.type === 'rack').length} racks altos com cabos azuis (${config.cableType.split('(')[0].trim()}) saindo de patch panels e correndo em bandejas no teto, atravessando o corredor. `
      : `O escritório possui um rack de parede com patch panels e cabeamento ${config.cableType}. `;
    
    const wsCount = nodes.filter(n => n.type === 'workstation').length;
    const monitorText = config.dualMonitors ? 'monitores duplos' : 'monitor único';
    const voipText = config.voipPhones ? ' e telefones VoIP' : '';
    const customNote = config.customPromptNote ? ` Detalhe: ${config.customPromptNote}.` : '';

    return `Uma planta baixa técnica 2D interativa de um escritório de TI, com duas salas separadas por um corredor. ${dcText}A '${config.room2Name.split('(')[0].trim()}' é um escritório aberto com ${wsCount} mesas customizadas e posicionadas, cada uma com desktops pretos, ${monitorText}${voipText}, com cabos ${config.cableType.includes('SFTP') ? 'CAT6' : 'estruturados'} descendo de forma limpa do teto. Estilo diagrama técnico top-down nítido e sem cruzamentos.${customNote}`;
  }, [config, nodes]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    showToast('Prompt copiado para a área de transferência!');
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleExportDiagram = () => {
    showToast('Exportando diagrama 2D (posições personalizadas) em formato SVG vetorial...');
  };

  const handleStartSnmpScan = () => {
    setIsScanningSubnet(true);
    setScanProgress(10);
    setScanLogs([
      `[${new Date().toLocaleTimeString()}] Iniciando varredura SNMP/LLDP na subnet ${scanSubnetIp}...`,
      `[${new Date().toLocaleTimeString()}] Parâmetros: Community='${scanCommunity}' | Protocolo=${snmpVersion.toUpperCase()} | Timeout=1000ms`,
      `[${new Date().toLocaleTimeString()}] Disparando broadcast ARP e sondas ICMP Ping para 254 nós IPv4...`
    ]);

    setTimeout(() => {
      setScanProgress(35);
      setScanLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Enviando requisições SNMP-GET SysDescr (OID 1.3.6.1.2.1.1.1.0) para porta 161/UDP...`,
        `[${new Date().toLocaleTimeString()}] Host respondeu em 192.168.10.1 (RTT: 2ms): Cisco Catalyst 9300-48P PoE+ (SW-CORE)`,
        `[${new Date().toLocaleTimeString()}] Host respondeu em 192.168.10.254 (RTT: 1ms): Fortinet FortiGate 100F (FW-EDGE)`
      ]);
    }, 600);

    setTimeout(() => {
      setScanProgress(70);
      setScanLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Consultando tabelas LLDP-MIB / CDP-MIB de nós vizinhos e enlaces...`,
        `[${new Date().toLocaleTimeString()}] Host respondeu em 192.168.10.15 (RTT: 4ms): Ubiquiti UniFi 6 Pro AP`,
        `[${new Date().toLocaleTimeString()}] Host respondeu em 192.168.10.20 (RTT: 1ms): Dell PowerEdge R750 VMware ESXi`,
        `[${new Date().toLocaleTimeString()}] Host respondeu em 192.168.10.50 (RTT: 3ms): Synology RackStation RS2423+ Storage`
      ]);
    }, 1300);

    setTimeout(() => {
      setScanProgress(90);
      setScanLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Host respondeu em 192.168.10.45 (RTT: 5ms): APC Smart-UPS RT 5000VA Nobreak`,
        `[${new Date().toLocaleTimeString()}] Mapeando status de interfaces físicas (ifOperStatus) e MAC addresses...`,
        `[${new Date().toLocaleTimeString()}] 6 ativos gerenciáveis com agente SNMP ativo identificados.`
      ]);
    }, 1900);

    setTimeout(() => {
      setScanProgress(100);
      setScanLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [CONCLUÍDO] Varredura SNMP finalizada com sucesso! Todos os ativos disponíveis para mapeamento.`
      ]);
      setIsScanningSubnet(false);
      showToast('Varredura SNMP finalizada! 6 dispositivos de infraestrutura identificados.');
    }, 2400);
  };

  // Trigger SNMP Scan when Header button is clicked in App
  useEffect(() => {
    if (snmpScanTrigger && snmpScanTrigger > 0) {
      setViewMode('discovery');
      handleStartSnmpScan();
    }
  }, [snmpScanTrigger]);

  const handleMapDiscoveredDeviceToTopology = (device: DiscoveredNetworkDevice) => {
    const existingNode = nodes.find(n => n.ip === device.ip || n.name.toLowerCase() === device.name.toLowerCase());
    if (existingNode) {
      showToast(`O dispositivo '${device.name}' (${device.ip}) já está mapeado na Topologia 2D!`);
      setSelectedNodeId(existingNode.id);
      setViewMode('topology_2d');
      return;
    }

    const targetRoom = rooms.find(r => 
      r.category === 'server_room' || 
      r.category === 'datacenter' || 
      r.name.toLowerCase().includes('data') || 
      r.name.toLowerCase().includes('ti')
    ) || rooms[0];

    const targetX = targetRoom ? targetRoom.x + 30 + ((nodes.length % 5) * 50) : 320;
    const targetY = targetRoom ? targetRoom.y + 40 + (Math.floor(nodes.length / 5) * 55) : 260;

    let w = 50;
    let h = 30;
    if (device.type === 'switch' || device.type === 'patch_panel') {
      w = 60;
      h = 24;
    } else if (device.type === 'firewall') {
      w = 55;
      h = 28;
    } else if (device.type === 'server' || device.type === 'storage') {
      w = 45;
      h = 45;
    } else if (device.type === 'access_point') {
      w = 36;
      h = 36;
    } else if (device.type === 'ups') {
      w = 40;
      h = 25;
    }

    const newNode: TopologyNode = {
      id: `snmp_node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: device.name,
      type: device.type,
      x: targetX,
      y: targetY,
      width: w,
      height: h,
      ip: device.ip,
      vlan: device.vlan,
      roomId: targetRoom?.id,
      assetTag: `SNMP-${device.ip.split('.').pop()?.padStart(3, '0')}`,
      details: {
        vendor: device.vendor,
        model: device.model,
        macAddress: device.mac,
        status: device.status
      }
    };

    recordHistorySnapshot(`Adicionou dispositivo SNMP '${device.name}'`);
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    showToast(`Dispositivo '${device.name}' (${device.ip}) adicionado à Topologia 2D com sucesso!`);
  };

  const handleMapAllDiscoveredDevices = () => {
    let addedCount = 0;
    const newNodesToAdd: TopologyNode[] = [];
    const targetRoom = rooms.find(r => 
      r.category === 'server_room' || 
      r.category === 'datacenter' || 
      r.name.toLowerCase().includes('data') || 
      r.name.toLowerCase().includes('ti')
    ) || rooms[0];

    discoveredDevices.forEach((device, index) => {
      const exists = nodes.some(n => n.ip === device.ip || n.name.toLowerCase() === device.name.toLowerCase());
      if (!exists) {
        const targetX = targetRoom ? targetRoom.x + 30 + ((index % 4) * 60) : 300 + (index * 50);
        const targetY = targetRoom ? targetRoom.y + 40 + (Math.floor(index / 4) * 55) : 250 + (index * 30);

        let w = 50;
        let h = 30;
        if (device.type === 'switch' || device.type === 'patch_panel') { w = 60; h = 24; }
        else if (device.type === 'firewall') { w = 55; h = 28; }
        else if (device.type === 'server' || device.type === 'storage') { w = 45; h = 45; }
        else if (device.type === 'access_point') { w = 36; h = 36; }
        else if (device.type === 'ups') { w = 40; h = 25; }

        newNodesToAdd.push({
          id: `snmp_node_${Date.now()}_${index}`,
          name: device.name,
          type: device.type,
          x: targetX,
          y: targetY,
          width: w,
          height: h,
          ip: device.ip,
          vlan: device.vlan,
          roomId: targetRoom?.id,
          assetTag: `SNMP-${device.ip.split('.').pop()?.padStart(3, '0')}`,
          details: {
            vendor: device.vendor,
            model: device.model,
            macAddress: device.mac,
            status: device.status
          }
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      recordHistorySnapshot(`Adicionou ${addedCount} dispositivos SNMP à topologia`);
      setNodes(prev => [...prev, ...newNodesToAdd]);
      showToast(`${addedCount} novos equipamentos descobertos foram inseridos na Topologia 2D!`);
    } else {
      showToast('Todos os dispositivos descobertos já estão presentes no Mapa da Topologia!');
    }
  };

  const renderTopNavTabs = () => (
    <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
      <button
        onClick={() => setViewMode('topology_2d')}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
          viewMode === 'topology_2d'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
      >
        <Move className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
        <span>Layout Editor 2D</span>
        <span className="px-1.5 py-0.5 text-[9px] bg-white/20 rounded font-black tracking-wider">MAPA</span>
      </button>

      <button
        onClick={() => setViewMode('environments')}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
          viewMode === 'environments'
            ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
      >
        <Building2 className="w-3.5 h-3.5 text-amber-300" />
        <span>Tabela de Ambientes</span>
        <span className="px-1.5 py-0.5 text-[9px] bg-amber-950/40 text-amber-200 border border-amber-400/30 rounded font-black">{rooms.length}</span>
      </button>

      <button
        onClick={() => setViewMode('station_standards')}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
          viewMode === 'station_standards'
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
      >
        <Monitor className="w-3.5 h-3.5 text-indigo-300" />
        <span>Padrão de Estações</span>
        <span className="px-1.5 py-0.5 text-[9px] bg-indigo-950/40 text-indigo-200 border border-indigo-400/30 rounded font-black">{stationStandards.length}</span>
      </button>

      <button
        onClick={() => setViewMode('accessories')}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
          viewMode === 'accessories'
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
      >
        <Zap className="w-3.5 h-3.5 text-emerald-300" />
        <span>Acessórios & Infra</span>
        <span className="px-1.5 py-0.5 text-[9px] bg-emerald-950/40 text-emerald-200 border border-emerald-400/30 rounded font-black">{accessories.length}</span>
      </button>

      <button
        onClick={() => setViewMode('discovery')}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
          viewMode === 'discovery'
            ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
      >
        <Radio className="w-3.5 h-3.5 text-teal-300 animate-pulse" />
        <span>Scanner SNMP</span>
        <span className="px-1.5 py-0.5 text-[9px] bg-teal-950/40 text-teal-200 border border-teal-400/30 rounded font-black">SUBNET</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-6 font-sans text-slate-800 dark:text-slate-100">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900/95 dark:bg-slate-950/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center space-x-2.5 animate-in fade-in slide-in-from-top-4 duration-200">
          <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ==========================================
          MAIN INTERACTIVE CANVAS VIEW
         ========================================== */}
      {viewMode === 'topology_2d' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
          
          {/* Integrated Canvas Toolbar: Row 1 Navigation Tabs & Row 2 Insertion Tools */}
          <div className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700/80 divide-y divide-slate-200/80 dark:divide-slate-700/60">
            
            {/* ROW 1: Navigation Tabs & Undo / Redo / History Action Bar */}
            <div className="px-3.5 py-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              {renderTopNavTabs()}

              {/* Quick Undo / Redo / History Action Bar */}
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={layoutHistory.length === 0}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer border transition-all ${
                    layoutHistory.length > 0
                      ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/20'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-60'
                  }`}
                  title={layoutHistory.length > 0 ? `Voltar última modificação: ${layoutHistory[0]?.description || 'Atalho: Ctrl+Z'}` : 'Nenhuma modificação para voltar (Atalho: Ctrl+Z)'}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Voltar Modificação</span>
                  {layoutHistory.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-black/20 rounded-full text-[10px] font-black">
                      {layoutHistory.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={layoutRedoStack.length === 0}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer border transition-all ${
                    layoutRedoStack.length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-md shadow-blue-600/20'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-60'
                  }`}
                  title={layoutRedoStack.length > 0 ? `Refazer etapa: ${layoutRedoStack[0]?.description || 'Atalho: Ctrl+Y'}` : 'Nenhuma etapa para refazer (Atalho: Ctrl+Y)'}
                >
                  <Redo2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Refazer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                  title="Ver Histórico Completo de Alterações do Layout"
                >
                  <History className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span className="hidden md:inline">Histórico</span>
                </button>
              </div>
            </div>

            {/* ROW 2: Asset Insertion & Canvas Tools */}
            <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2.5">
            
            {/* Left Tools: Add Equipment & Rooms */}
            <div className="flex items-center flex-wrap gap-1.5 relative" id="toolbarAssetMenu">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center mr-1">
                <Plus className="w-3.5 h-3.5 text-blue-500 mr-1" />
                Inserir:
              </span>

              {ASSET_CATEGORIES.map(cat => {
                const IconComp = cat.icon;
                const isOpen = openToolbarCategory === cat.id;
                return (
                  <div key={cat.id} className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenToolbarCategory(isOpen ? null : cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 cursor-pointer transition-colors border shadow-2xs ${
                        isOpen
                          ? 'bg-blue-600 text-white border-blue-700 dark:border-blue-500'
                          : 'bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      <IconComp className={`w-3.5 h-3.5 ${isOpen ? 'text-white' : 'text-blue-500'}`} />
                      <span>{cat.title}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                    </button>

                    {isOpen && (
                      <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1.5 min-w-[200px] text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                        {cat.items.map(item => {
                          const ItemIcon = item.icon;
                          return (
                            <button
                              key={item.type}
                              type="button"
                              onClick={() => {
                                handleAddEquipment(item.type);
                                setOpenToolbarCategory(null);
                              }}
                              className="w-full px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-700/80 rounded-lg flex items-center space-x-2 text-left cursor-pointer transition-colors"
                            >
                              <ItemIcon className={`w-3.5 h-3.5 ${item.color}`} />
                              <span className="font-bold text-slate-800 dark:text-slate-100">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Room Button */}
              <button
                onClick={() => setEditingRoom({ 
                  activeOnMap: true, 
                  uplinkSpeed: '1 Gbps RJ45', 
                  equipmentCount: 2, 
                  wingId: selectedWingFilter !== 'all' ? selectedWingFilter : (wings[0]?.id || '') 
                })}
                className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-lg text-[11px] font-black flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                title="Criar novo ambiente / sala anexa na planta"
              >
                <Building2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span>+ Sala / Ambiente</span>
              </button>


              {/* Unified Cable Controls (Ligar Cabo + Mostrar/Ocultar Sub-items) */}
              <div className="relative flex items-center bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-700 rounded-lg text-[11px] font-bold text-cyan-800 dark:text-cyan-200 shadow-2xs overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (connectingFromNodeId) {
                      setConnectingFromNodeId(null);
                    } else if (selectedNodeId) {
                      setConnectingFromNodeId(selectedNodeId);
                      showToast('Modo de Ligação: Clique no segundo equipamento para conectar o cabo!');
                    } else {
                      showToast('Selecione primeiro um equipamento para iniciar a ligação de cabo.');
                    }
                  }}
                  className={`px-2.5 py-1 flex items-center space-x-1 cursor-pointer transition-colors ${
                    connectingFromNodeId
                      ? 'bg-amber-500 text-white font-black animate-pulse'
                      : 'hover:bg-cyan-100 dark:hover:bg-cyan-900/80 text-cyan-800 dark:text-cyan-200'
                  }`}
                  title="Conectar dois equipamentos com cabo de rede"
                >
                  <Link2 className={`w-3.5 h-3.5 ${connectingFromNodeId ? 'text-white' : 'text-cyan-600 dark:text-cyan-400'}`} />
                  <span>{connectingFromNodeId ? 'Clique no Alvo...' : 'Ligar Cabo'}</span>
                </button>

                <div className="h-4 w-[1px] bg-cyan-200 dark:bg-cyan-800" />

                <button
                  type="button"
                  onClick={() => setShowCableLines(prev => !prev)}
                  className={`px-2.5 py-1 flex items-center space-x-1 cursor-pointer transition-colors ${
                    showCableLines
                      ? 'hover:bg-cyan-100 dark:hover:bg-cyan-900/80 text-cyan-800 dark:text-cyan-200'
                      : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                  title="Exibir ou ocultar linhas de cabeamento estruturado"
                >
                  <Activity className={`w-3.5 h-3.5 ${showCableLines ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                  <span>{showCableLines ? 'Ocultar Cabos' : 'Mostrar Cabos'}</span>
                </button>
              </div>
            </div>

            {/* Right Tools: Wing Selector, Inspector Toggle, Zoom Controls & Save Layout (All in one horizontal line) */}
            <div className="flex items-center space-x-2 shrink-0 flex-nowrap overflow-x-auto scrollbar-none py-0.5">
              {/* Wing / Unit Management & Filter Controls (Unified) */}
              <div className="relative flex items-center bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-700 rounded-lg text-[11px] font-black text-purple-700 dark:text-purple-300 shadow-2xs overflow-hidden shrink-0">
                <div className="flex items-center space-x-1 pl-2 pr-0.5 py-1 pointer-events-none">
                  <Building2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="hidden sm:inline font-black text-purple-800 dark:text-purple-200">Alas:</span>
                </div>

                <select
                  value={selectedWingFilter}
                  onChange={(e) => {
                    if (e.target.value === '__manage__') {
                      setIsWingManagerOpen(true);
                    } else {
                      setSelectedWingFilter(e.target.value);
                    }
                  }}
                  className="py-1 pl-1 pr-1 bg-transparent text-purple-900 dark:text-purple-100 font-bold focus:outline-none cursor-pointer text-[11px]"
                  title="Filtrar por Ala/Unidade ou Gerenciar Unidades"
                >
                  <option value="all" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold">
                    Todas as Alas ({wings.length})
                  </option>
                  {wings.map(w => (
                    <option key={w.id} value={w.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium">
                      {w.name}
                    </option>
                  ))}
                  <option disabled className="bg-white dark:bg-slate-800 text-slate-400">────────────────</option>
                  <option value="__manage__" className="bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 font-bold">
                    ⚙️ Gerenciar / Criar Alas...
                  </option>
                </select>

                <button
                  type="button"
                  onClick={() => setIsWingManagerOpen(true)}
                  className="p-1 px-1.5 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/80 cursor-pointer border-l border-purple-200 dark:border-purple-800 flex items-center justify-center"
                  title="Gerenciar Alas e Unidades"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Separator Line */}
              <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 shrink-0" />

              {/* Toggle Inspector Panel */}
              <button
                onClick={() => setShowInspector(prev => !prev)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer border transition-colors shadow-2xs shrink-0 ${
                  showInspector
                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                }`}
                title="Ocultar ou Mostrar o Painel Inspetor"
              >
                <Sliders className="w-3 h-3 text-purple-500" />
                <span>{showInspector ? 'Ocultar Inspetor' : 'Mostrar Inspetor'}</span>
              </button>

              {/* Zoom & Save Layout Group (positioned right beside Ocultar Inspetor) */}
              <div className="flex items-center space-x-1 pl-1.5 border-l border-slate-300 dark:border-slate-700">
                {/* Zoom 100% */}
                <button
                  onClick={() => setZoom2D(100)}
                  className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-md text-[10px] font-bold cursor-pointer"
                  title="Redefinir Zoom para 100%"
                >
                  {zoom2D}%
                </button>

                {/* Zoom In / Out */}
                <button
                  onClick={() => setZoom2D(prev => Math.min(180, prev + 15))}
                  className="p-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-md text-xs cursor-pointer"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoom2D(prev => Math.max(40, prev - 15))}
                  className="p-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-md text-xs cursor-pointer"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                {/* Centralizar Layout Button */}
                <button
                  type="button"
                  onClick={handleCenterLayout}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md shadow-indigo-600/20 transition-all ml-1"
                  title="Centralizar todo o layout e salas no ambiente"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Centralizar Layout</span>
                </button>

                {/* Voltar Button removed per user request */}

                {/* Salvar Layout Button */}
                <button
                  onClick={handleSaveLayout}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-600/20 transition-all ml-1"
                  title="Salvar Layout da Topologia"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Layout</span>
                </button>
              </div>
            </div>
          </div>
        </div>

          {/* Interactive Work Area */}
          <div className="flex flex-col lg:flex-row flex-1 min-h-[640px] bg-slate-50 dark:bg-slate-950 relative">
            
            {/* Interactive Movable Canvas Area */}
            <div 
              className="flex-1 p-3 sm:p-5 relative overflow-auto flex items-start justify-center min-h-[560px]"
              onContextMenu={(e) => handleContextMenu(e, 'canvas')}
            >
              
              {/* Scalable Container */}
              <div 
                className="w-full transition-transform duration-100 select-none relative"
                style={{ transform: `scale(${zoom2D/100})`, transformOrigin: 'top center' }}
              >
                <InteractiveMovableCanvas 
                  nodes={nodes}
                  rooms={rooms}
                  links={links}
                  selectedNodeId={selectedNodeId}
                  selectedNodeIds={selectedNodeIds}
                  selectedRoomId={selectedRoomId}
                  selectedLinkId={selectedLinkId}
                  connectingFromNodeId={connectingFromNodeId}
                  onSelectNode={(id, isMulti) => {
                    if (isMulti) {
                      setSelectedNodeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                    } else {
                      setSelectedNodeIds([id]);
                    }
                    const clickedNode = nodes.find(n => n.id === id);
                    if (clickedNode?.roomId) {
                      setSelectedRoomId(clickedNode.roomId);
                      setActiveRoomId(clickedNode.roomId);
                    }
                    setSelectedLinkId(null);
                    if (connectingFromNodeId && connectingFromNodeId !== id) {
                      handleAddLink(connectingFromNodeId, id);
                    }
                  }}
                  onSelectNodes={(ids) => {
                    setSelectedNodeIds(ids);
                    if (ids.length === 1) {
                      const clickedNode = nodes.find(n => n.id === ids[0]);
                      if (clickedNode?.roomId) {
                        setSelectedRoomId(clickedNode.roomId);
                        setActiveRoomId(clickedNode.roomId);
                      }
                    }
                    setSelectedLinkId(null);
                  }}
                  onSelectRoom={(id) => {
                    setSelectedRoomId(id);
                    setActiveRoomId(id);
                    setSelectedNodeIds([]);
                    setSelectedLinkId(null);
                  }}
                  onSelectLink={(id) => {
                    setSelectedLinkId(id);
                    setSelectedNodeIds([]);
                    setSelectedRoomId(null);
                  }}
                  onUpdateNodePosition={handleUpdateNodePosition}
                  onUpdateNodePositions={handleUpdateNodePositions}
                  onRotateGroup={handleRotateGroup}
                  onFlipGroupH={handleFlipGroupHorizontal}
                  onFlipGroupV={handleFlipGroupVertical}
                  onRotateGroupItemsInPlace={handleRotateGroupItemsInPlace}
                  onUpdateNodeSize={handleUpdateNodeSize}
                  onUpdateRoomPosition={handleUpdateRoomPosition}
                  onUpdateRoomSize={handleUpdateRoomSize}
                  onUpdateLinkWaypoint={handleUpdateLinkWaypoint}
                  onAddLinkWaypoint={handleAddLinkWaypoint}
                  onStartConnecting={(nodeId) => setConnectingFromNodeId(nodeId)}
                  onCancelConnecting={() => setConnectingFromNodeId(null)}
                  onContextMenu={handleContextMenu}
                  snapToGrid={snapToGrid}
                  gridSize={gridSize}
                  showCableLines={showCableLines}
                  showQuadrantGuides={showQuadrantGuides}
                  toolboxOpen={toolboxOpen}
                  onToggleToolbox={() => setToolboxOpen(prev => !prev)}
                  activeToolboxTab={activeToolboxTab}
                  onSetActiveToolboxTab={setActiveToolboxTab}
                  onAddEquipment={handleAddEquipment}
                  onOpenAddRoom={() => setEditingRoom({ activeOnMap: true, uplinkSpeed: '1 Gbps RJ45' })}
                  onOpenDiscovery={() => setViewMode('discovery')}
                  onAutoAlign={handleAutoAlign}
                  onAutoFitNodes={handleAutoFitNodesInQuadrants}
                  onOrganizeQuadrants={handleOrganizeQuadrantsAttached}
                  onSaveLayout={handleSaveLayout}
                  onToggleDoorSwing={handleToggleRoomDoorSwing}
                  onCycleDoorWall={handleCycleRoomDoorWall}
                  onSetDoorOffsetPreset={handleSetRoomDoorOffsetPreset}
                  onUpdateRoomDoor={handleUpdateRoomDoor}
                  onShowToast={showToast}
                  wings={wings}
                  selectedWingFilter={selectedWingFilter}
                  showHeatmap={showHeatmap}
                  heatmapMetric={heatmapMetric}
                  heatmapIntensity={heatmapIntensity}
                  hoveredHeatmapWingId={hoveredHeatmapWingId}
                  onSetHoveredHeatmapWingId={setHoveredHeatmapWingId}
                  onToggleHeatmap={() => setShowHeatmap(prev => !prev)}
                  onChangeHeatmapMetric={(m) => setHeatmapMetric(m)}
                  onChangeHeatmapIntensity={(val) => setHeatmapIntensity(val)}
                  onOpenWingManager={() => setIsWingManagerOpen(true)}
                  onOpenWingHeatmapTab={() => setViewMode('wing_heatmap')}
                  onEditWing={(wing) => {
                    setEditingWing(wing);
                    setNewWingForm({ name: wing.name, code: wing.code, color: wing.color, description: wing.description || '' });
                    setIsWingManagerOpen(true);
                  }}
                  onAutoSequenceWings={handleAutoSequenceWings}
                  onRecordHistorySnapshot={recordHistorySnapshot}
                />

                {/* Floating "Mostrar Inspetor" button when Inspector is closed */}
                {!showInspector && (
                  <button
                    onClick={() => setShowInspector(true)}
                    className="absolute top-3 right-3 z-30 px-3 py-1.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-1.5 cursor-pointer transition-all hover:scale-105"
                    title="Mostrar Inspetor Geral / Sala / Equipamento"
                  >
                    <PanelRight className="w-3.5 h-3.5 text-blue-500" />
                    <span>Mostrar Inspetor</span>
                    {(selectedNode || selectedRoom || selectedLink) && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    )}
                  </button>
                )}
              </div>

            </div>

            {/* Right Side Inspector & Node Details Drawer */}
            {showInspector && (
              <div className="w-full lg:w-80 bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 p-4 space-y-4 shrink-0 overflow-y-auto max-h-[700px] transition-all">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      {selectedNode ? <Monitor className="w-4 h-4" /> : selectedRoom ? <Building2 className="w-4 h-4" /> : selectedLink ? <Activity className="w-4 h-4" /> : <MousePointer className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {selectedNode ? 'Inspetor de Equipamento' : selectedRoom ? 'Inspetor de Sala / Ambiente' : selectedLink ? 'Inspetor de Cabeamento' : 'Inspetor Geral'}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {selectedNode ? selectedNode.name : selectedRoom ? selectedRoom.name : selectedLink ? 'Link Ativo' : 'Clique com o botão direito para opções'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    {/* Room Visibility Toggle Button (Mostrar / Ocultar Sala do Mapa) */}
                    {selectedRoom && (
                      <button
                        type="button"
                        onClick={() => {
                          setRooms(prev => {
                            const updated = prev.map(r => r.id === selectedRoom.id ? { ...r, activeOnMap: !r.activeOnMap } : r);
                            localStorage.setItem('applet_infra_topology_rooms', JSON.stringify(updated));
                            return updated;
                          });
                          showToast(selectedRoom.activeOnMap ? `Ambiente '${selectedRoom.name}' ocultado do mapa` : `Ambiente '${selectedRoom.name}' exibido no mapa`);
                        }}
                        className={`p-1.5 rounded-md transition-colors ${
                          selectedRoom.activeOnMap
                            ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={selectedRoom.activeOnMap ? "Ocultar este ambiente da planta 2D" : "Mostrar este ambiente na planta 2D"}
                      >
                        {selectedRoom.activeOnMap ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                      </button>
                    )}

                    {selectedNode && (
                      <button
                        onClick={() => handleDeleteNode(selectedNode.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
                        title="Excluir equipamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {selectedRoom && (
                      <>
                        <button
                          onClick={() => setEditingRoom(selectedRoom)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md transition-colors"
                          title="Editar ambiente em modal completo"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(selectedRoom.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
                          title="Excluir ambiente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {selectedLink && (
                      <button
                        onClick={() => handleDeleteLink(selectedLink.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
                        title="Desconectar cabo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Hide Inspector Button */}
                    <button
                      type="button"
                      onClick={() => setShowInspector(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors ml-1 border-l border-slate-200 dark:border-slate-700 pl-1.5"
                      title="Ocultar painel Inspetor"
                    >
                      <PanelRightClose className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              {/* 0. MULTI-SELECTION GROUP INSPECTOR */}
              {selectedNodeIds.length > 1 && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl space-y-3 border border-purple-500/30">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg">
                          <Boxes className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white">Grupo Selecionado</h3>
                          <p className="text-[10px] text-purple-300 font-medium">{selectedNodeIds.length} objetos marcados</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedNodeIds([])}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xs cursor-pointer"
                        title="Desmarcar seleção"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-2.5 bg-slate-800/80 rounded-xl text-[11px] text-slate-300 space-y-1">
                      <p className="font-bold text-purple-200">🚚 Como Mover em Grupo:</p>
                      <p className="text-[10.5px] text-slate-400 leading-relaxed">Arraste qualquer um dos objetos marcados no mapa 2D para mover todo o grupo simultaneamente mantendo a posição relativa.</p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider">Ações do Grupo:</label>
                      
                      {/* Atribuir a uma sala */}
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Mudar Sala de Todos os {selectedNodeIds.length} Itens:</label>
                        <select
                          onChange={(e) => {
                            const targetRoomId = e.target.value;
                            if (!targetRoomId) return;
                            setNodes(prev => prev.map(n => selectedNodeIds.includes(n.id) ? { ...n, roomId: targetRoomId } : n));
                            const rName = rooms.find(r => r.id === targetRoomId)?.name || 'Nova Sala';
                            showToast(`${selectedNodeIds.length} objetos associados à sala '${rName}'!`);
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Selecionar Sala para o Grupo --</option>
                          {rooms.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Rotacionar Arranjo do Grupo */}
                      <div className="p-2 bg-slate-800/90 rounded-xl border border-purple-500/20 space-y-1.5">
                        <label className="block text-[10px] font-bold text-purple-300 uppercase tracking-wider">🔄 Rotacionar Arranjo do Grupo:</label>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            type="button"
                            onClick={() => handleRotateGroup(selectedNodeIds, 90)}
                            className="py-1 px-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                            title="Girar todo o arranjo +90° no sentido horário"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>Girar +90°</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRotateGroup(selectedNodeIds, -90)}
                            className="py-1 px-1.5 bg-slate-700 hover:bg-slate-600 text-purple-200 rounded text-[10px] font-bold flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                            title="Girar todo o arranjo -90° (anti-horário)"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Girar -90°</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRotateGroup(selectedNodeIds, 180)}
                            className="py-1 px-1.5 bg-slate-700 hover:bg-slate-600 text-purple-200 rounded text-[10px] font-bold flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                            title="Girar todo o arranjo 180°"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Girar 180°</span>
                          </button>
                        </div>
                      </div>

                      {/* Inverter / Espelhar Posição do Grupo */}
                      <div className="p-2 bg-slate-800/90 rounded-xl border border-purple-500/20 space-y-1.5">
                        <label className="block text-[10px] font-bold text-purple-300 uppercase tracking-wider">↔️ Inverter / Espelhar Grupo:</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleFlipGroupHorizontal(selectedNodeIds)}
                            className="py-1.5 px-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-[10.5px] font-bold flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                            title="Inverter posições relativas na Horizontal (Esquerda / Direita)"
                          >
                            <span>↔️ Inverter Horizontal (X)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFlipGroupVertical(selectedNodeIds)}
                            className="py-1.5 px-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-[10.5px] font-bold flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                            title="Inverter posições relativas na Vertical (Cima / Baixo)"
                          >
                            <span>↕️ Inverter Vertical (Y)</span>
                          </button>
                        </div>
                      </div>

                      {/* Ajustar Orientação dos Objetos em Grupo */}
                      <div className="p-2 bg-slate-800/90 rounded-xl border border-slate-700 space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-300">Orientação Individual dos Objetos:</label>
                        <div className="grid grid-cols-4 gap-1">
                          {[0, 90, 180, 270].map(deg => (
                            <button
                              key={deg}
                              type="button"
                              onClick={() => handleRotateGroupItemsInPlace(selectedNodeIds, deg)}
                              className="py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                              title={`Ajustar orientação individual de todos os itens para ${deg}°`}
                            >
                              {deg}°
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Alinhar Objetos */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const firstY = nodes.find(n => n.id === selectedNodeIds[0])?.y || 0;
                            setNodes(prev => prev.map(n => selectedNodeIds.includes(n.id) ? { ...n, y: firstY } : n));
                            showToast('Objetos alinhados horizontalmente!');
                          }}
                          className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10.5px] font-bold flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <span>↔️ Alinhar no Y</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const firstX = nodes.find(n => n.id === selectedNodeIds[0])?.x || 0;
                            setNodes(prev => prev.map(n => selectedNodeIds.includes(n.id) ? { ...n, x: firstX } : n));
                            showToast('Objetos alinhados verticalmente!');
                          }}
                          className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10.5px] font-bold flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <span>↕️ Alinhar no X</span>
                        </button>
                      </div>

                      {/* Duplicar Grupo */}
                      <button
                        type="button"
                        onClick={() => {
                          const newNodes: TopologyNode[] = [];
                          const newIds: string[] = [];
                          selectedNodeIds.forEach(id => {
                            const orig = nodes.find(n => n.id === id);
                            if (orig) {
                              const dupId = `${orig.id}_copy_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
                              newNodes.push({
                                ...orig,
                                id: dupId,
                                name: `${orig.name} (Cópia)`,
                                x: orig.x + 30,
                                y: orig.y + 30
                              });
                              newIds.push(dupId);
                            }
                          });
                          setNodes(prev => [...prev, ...newNodes]);
                          setSelectedNodeIds(newIds);
                          showToast(`📋 Grupo de ${newNodes.length} objetos duplicado!`);
                        }}
                        className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Duplicar Grupo ({selectedNodeIds.length} objetos)</span>
                      </button>

                      {/* Excluir Grupo */}
                      <button
                        type="button"
                        onClick={() => {
                          const count = selectedNodeIds.length;
                          setNodes(prev => prev.filter(n => !selectedNodeIds.includes(n.id)));
                          setLinks(prev => prev.filter(l => !selectedNodeIds.includes(l.fromNodeId) && !selectedNodeIds.includes(l.toNodeId)));
                          setSelectedNodeIds([]);
                          showToast(`🗑️ ${count} objetos removidos.`);
                        }}
                        className="w-full py-1.5 px-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir {selectedNodeIds.length} Objetos Marcados</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 1. NODE INSPECTOR */}
              {selectedNode && selectedNodeIds.length <= 1 && (
                <div className="space-y-3 text-xs">
                  {/* Name & Type */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Nome do Item / Equipamento:</label>
                    <input
                      type="text"
                      value={selectedNode.name}
                      onChange={(e) => handleUpdateNodeData(selectedNode.id, { name: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Tipo de Elemento */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Tipo de Item:</label>
                    <select
                      value={selectedNode.type}
                      onChange={(e) => {
                        const newType = e.target.value as DeviceType;
                        let defW = selectedNode.width;
                        let defH = selectedNode.height;
                        if (newType === 'desk') { defW = 70; defH = 44; }
                        else if (newType === 'chair') { defW = 68; defH = 68; }
                        else if (newType === 'table') { defW = 100; defH = 54; }
                        else if (newType === 'simple_chair') { defW = 56; defH = 56; }
                        else if (newType === 'workstation') { defW = 83; defH = 56; }
                        else if (newType === 'rack') { defW = 55; defH = 110; }
                        else if (newType === 'switch') { defW = 60; defH = 26; }
                        else if (newType === 'router') { defW = 48; defH = 44; }
                        else if (newType === 'ups') { defW = 44; defH = 52; }
                        else if (newType === 'camera') { defW = 40; defH = 40; }
                        else if (newType === 'voip') { defW = 44; defH = 44; }
                        else if (newType === 'access_point') { defW = 36; defH = 36; }
                        else if (newType === 'printer') { defW = 90; defH = 80; }
                        else if (newType === 'firewall') { defW = 55; defH = 30; }

                        handleUpdateNodeData(selectedNode.id, { 
                          type: newType,
                          width: defW,
                          height: defH
                        });
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <optgroup label="Mobiliário">
                        <option value="desk">Mesa de Trabalho / Escritório</option>
                        <option value="chair">Cadeira de Escritório Ergonômica</option>
                        <option value="table">Mesa de Reunião / Conferência</option>
                        <option value="simple_chair">Cadeira de Reunião / Visitante</option>
                      </optgroup>
                      <optgroup label="Computadores & Usuário">
                        <option value="workstation">Estação PC / Computador</option>
                        <option value="voip">Telefone IP / VoIP</option>
                        <option value="printer">Impressora de Rede</option>
                      </optgroup>
                      <optgroup label="Infraestrutura & Redes">
                        <option value="rack">Rack de Servidores</option>
                        <option value="switch">Switch de Distribuição</option>
                        <option value="router">Roteador Gateway WAN</option>
                        <option value="access_point">Access Point Wi-Fi</option>
                        <option value="ups">Nobreak (UPS)</option>
                        <option value="camera">Câmera CFTV / IP</option>
                        <option value="firewall">Firewall NGFW</option>
                        <option value="patch_panel">Patch Panel</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Orientação & Rotação */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Orientação / Rotação:
                      </label>
                      <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                        {selectedNode.rotation || 0}°
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 pt-0.5">
                      {[0, 90, 180, 270].map(deg => (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => handleRotateNode(selectedNode.id, deg)}
                          className={`py-1 rounded text-[10px] font-black transition-colors ${
                            (selectedNode.rotation || 0) === deg
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-700 hover:bg-blue-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                          }`}
                        >
                          {deg}°
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleRotateNode(selectedNode.id)}
                        className="py-1 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded text-[10px] font-bold flex items-center justify-center"
                        title="Girar +90°"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Sala / Ambiente Alocado */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Sala / Ambiente de Alocação:</label>
                    <select
                      value={selectedNode.roomId || ''}
                      onChange={(e) => {
                        const newRoomId = e.target.value || undefined;
                        handleUpdateNodeData(selectedNode.id, { roomId: newRoomId });
                        if (newRoomId) {
                          setSelectedRoomId(newRoomId);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="">Área Livre (Sem Sala Específica)</option>
                      {rooms.filter(r => r.activeOnMap).map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.quadrantCode || 'Ambiente'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Vínculo de Patrimônio ITAM */}
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200">
                        Vínculo de Patrimônio (ITAM):
                      </label>
                      {onNavigateToAssetManagement && (
                        <button
                          onClick={onNavigateToAssetManagement}
                          className="text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center space-x-0.5 cursor-pointer"
                        >
                          <span>Gestão</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <select
                      value={selectedNode.assetTag || ''}
                      onChange={(e) => {
                        const tag = e.target.value;
                        const ast = assets.find(a => a.assetTag === tag);
                        if (ast) {
                          handleUpdateNodeData(selectedNode.id, {
                            assetTag: ast.assetTag,
                            assetId: ast.id,
                            name: ast.name,
                            ip: ast.ipAddress || selectedNode.ip,
                            details: {
                              ...selectedNode.details,
                              vendor: ast.brandModel.split(' ')[0],
                              model: ast.brandModel,
                              macAddress: ast.macAddress || selectedNode.details.macAddress
                            }
                          });
                        } else {
                          handleUpdateNodeData(selectedNode.id, { assetTag: '', assetId: '' });
                        }
                      }}
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100"
                    >
                      <option value="">Nenhum Ativo Vinculado</option>
                      {assets.map(ast => (
                        <option key={ast.id} value={ast.assetTag}>
                          [{ast.assetTag}] {ast.name}
                        </option>
                      ))}
                    </select>
                    {selectedNode.assetTag && (
                      <div className="text-[10px] text-amber-800 dark:text-amber-300 font-bold flex items-center justify-between pt-1">
                        <span>Plaqueta: {selectedNode.assetTag}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-black">✓ Vinculado</span>
                      </div>
                    )}
                  </div>

                  {/* Coordinates X, Y */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Posição X:</label>
                      <input
                        type="number"
                        value={Math.round(selectedNode.x)}
                        onChange={(e) => handleUpdateNodePosition(selectedNode.id, Number(e.target.value) || 0, selectedNode.y)}
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Posição Y:</label>
                      <input
                        type="number"
                        value={Math.round(selectedNode.y)}
                        onChange={(e) => handleUpdateNodePosition(selectedNode.id, selectedNode.x, Number(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Dimensionamento do Item (Largura e Altura em pixels) */}
                  <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-200 flex items-center space-x-1">
                        <Move className="w-3 h-3 text-blue-500" />
                        <span>Dimensões / Tamanho:</span>
                      </label>
                      <span className="text-[10px] font-mono font-black text-blue-700 dark:text-blue-300">
                        {Math.round(selectedNode.width || (selectedNode.type === 'desk' ? 70 : selectedNode.type === 'chair' ? 68 : selectedNode.type === 'simple_chair' ? 56 : selectedNode.type === 'table' ? 100 : 50))} × {Math.round(selectedNode.height || (selectedNode.type === 'desk' ? 44 : selectedNode.type === 'chair' ? 68 : selectedNode.type === 'simple_chair' ? 56 : selectedNode.type === 'table' ? 54 : 40))} px
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">Largura (W):</label>
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min="16"
                            max="800"
                            step="2"
                            value={Math.round(selectedNode.width || (selectedNode.type === 'desk' ? 70 : selectedNode.type === 'chair' ? 68 : selectedNode.type === 'simple_chair' ? 56 : selectedNode.type === 'table' ? 100 : 50))}
                            onChange={(e) => {
                              const w = Math.max(16, Number(e.target.value) || 20);
                              const h = selectedNode.height || (selectedNode.type === 'desk' ? 44 : selectedNode.type === 'chair' ? 68 : selectedNode.type === 'simple_chair' ? 56 : selectedNode.type === 'table' ? 54 : 40);
                              handleUpdateNodeSize(selectedNode.id, w, h);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-xs font-bold text-slate-800 dark:text-slate-100"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">px</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">Altura (H):</label>
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min="16"
                            max="800"
                            step="2"
                            value={Math.round(selectedNode.height || (selectedNode.type === 'desk' ? 44 : selectedNode.type === 'chair' ? 68 : selectedNode.type === 'simple_chair' ? 56 : selectedNode.type === 'table' ? 54 : 40))}
                            onChange={(e) => {
                              const w = selectedNode.width || (selectedNode.type === 'desk' ? 70 : selectedNode.type === 'chair' ? 68 : selectedNode.type === 'simple_chair' ? 56 : selectedNode.type === 'table' ? 100 : 50);
                              const h = Math.max(16, Number(e.target.value) || 20);
                              handleUpdateNodeSize(selectedNode.id, w, h);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-xs font-bold text-slate-800 dark:text-slate-100"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">px</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Scaling Buttons */}
                    <div className="grid grid-cols-4 gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleScaleNode(selectedNode.id, 0.8)}
                        className="py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold transition-colors cursor-pointer"
                        title="Diminuir 20%"
                      >
                        -20%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResetNodeSize(selectedNode.id)}
                        className="py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded text-[10px] font-black transition-colors cursor-pointer"
                        title="Restaurar tamanho padrão"
                      >
                        100%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScaleNode(selectedNode.id, 1.2)}
                        className="py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold transition-colors cursor-pointer"
                        title="Aumentar 20%"
                      >
                        +20%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScaleNode(selectedNode.id, 1.5)}
                        className="py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold transition-colors cursor-pointer"
                        title="Aumentar 50%"
                      >
                        +50%
                      </button>
                    </div>

                    {/* Presets específicos por tipo */}
                    {selectedNode.type === 'desk' && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 60, 38)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          60×38 (Compacta)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 70, 44)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          70×44 (Padrão)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 90, 52)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          90×52 (Executiva)
                        </button>
                      </div>
                    )}
                    {selectedNode.type === 'chair' && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 56, 56)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          56×56 (Compacta)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 68, 68)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          68×68 (Padrão)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 84, 84)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          84×84 (Ampla)
                        </button>
                      </div>
                    )}
                    {selectedNode.type === 'table' && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 100, 54)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          6 Lugares (100×54)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 150, 65)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          10 Lugares (150×65)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 200, 75)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          16 Lugares (200×75)
                        </button>
                      </div>
                    )}
                    {selectedNode.type === 'workstation' && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 80, 54)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          80×54 (Compacta)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 104, 70)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          104×70 (Padrão)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 130, 88)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          130×88 (Ampla)
                        </button>
                      </div>
                    )}
                    {selectedNode.type === 'rack' && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 55, 75)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          16U Wall (55×75)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 55, 110)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          24U Piso (55×110)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 60, 160)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          44U DataCenter (60×160)
                        </button>
                      </div>
                    )}
                    {selectedNode.type === 'printer' && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 60, 54)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          60×54 (Compacta / Mesa)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 90, 80)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          90×80 (Padrão 2x / Rede)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateNodeSize(selectedNode.id, 120, 100)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-blue-400 cursor-pointer"
                        >
                          120×100 (Multifuncional Corporativa)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* IP Address */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Endereço IP / Gestão:</label>
                    <input
                      type="text"
                      value={selectedNode.ip || ''}
                      onChange={(e) => handleUpdateNodeData(selectedNode.id, { ip: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>

                  {/* VLAN */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">VLAN / Segmento:</label>
                    <input
                      type="text"
                      value={selectedNode.vlan || ''}
                      onChange={(e) => handleUpdateNodeData(selectedNode.id, { vlan: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>

                  {/* Quick Action: Connect Cable */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setConnectingFromNodeId(selectedNode.id);
                        showToast('Clique no segundo equipamento no mapa para criar a conexão de cabo!');
                      }}
                      className="w-full py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg font-bold flex items-center justify-center space-x-1.5 cursor-pointer text-[11px]"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Conectar Cabo a Outro Ativo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 2. ROOM INSPECTOR */}
              {selectedRoom && (
                <div className="space-y-3 text-xs">







                  {/* SECTION: DIMENSIONAMENTO & MEDIDAS DA SALA */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                          Dimensionamento da Sala
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800/60">
                        {Math.round(selectedRoom.width)} × {Math.round(selectedRoom.height)} px
                      </span>
                    </div>

                    {/* Largura Input with Step Buttons and Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                          Largura (W):
                        </label>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateRoomSize(selectedRoom.id, Math.max(30, selectedRoom.width - 10), selectedRoom.height)}
                            className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center cursor-pointer"
                            title="Diminuir 10px"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="30"
                            max="1500"
                            step="5"
                            value={Math.round(selectedRoom.width)}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (!isNaN(val) && val >= 1) {
                                handleUpdateRoomSize(selectedRoom.id, val, selectedRoom.height);
                              }
                            }}
                            className="w-14 px-1 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center font-mono font-bold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateRoomSize(selectedRoom.id, selectedRoom.width + 10, selectedRoom.height)}
                            className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center cursor-pointer"
                            title="Aumentar 10px"
                          >
                            +
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono">px</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="800"
                        step="5"
                        value={Math.round(selectedRoom.width)}
                        onChange={(e) => handleUpdateRoomSize(selectedRoom.id, Number(e.target.value), selectedRoom.height)}
                        className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      />
                    </div>

                    {/* Altura Input with Step Buttons and Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                          Altura (H):
                        </label>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateRoomSize(selectedRoom.id, selectedRoom.width, Math.max(30, selectedRoom.height - 10))}
                            className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center cursor-pointer"
                            title="Diminuir 10px"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="30"
                            max="1200"
                            step="5"
                            value={Math.round(selectedRoom.height)}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (!isNaN(val) && val >= 1) {
                                handleUpdateRoomSize(selectedRoom.id, selectedRoom.width, val);
                              }
                            }}
                            className="w-14 px-1 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center font-mono font-bold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateRoomSize(selectedRoom.id, selectedRoom.width, selectedRoom.height + 10)}
                            className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center cursor-pointer"
                            title="Aumentar 10px"
                          >
                            +
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono">px</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="600"
                        step="5"
                        value={Math.round(selectedRoom.height)}
                        onChange={(e) => handleUpdateRoomSize(selectedRoom.id, selectedRoom.width, Number(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      />
                    </div>

                    <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>📐 Área aprox.: ~{((selectedRoom.width * selectedRoom.height) / 100).toFixed(1)} m²</span>
                      <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold">Arraste alças no mapa 2D</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Posição X:</label>
                      <input
                        type="number"
                        value={Math.round(selectedRoom.x)}
                        onChange={(e) => handleUpdateRoomPosition(selectedRoom.id, Number(e.target.value) || 0, selectedRoom.y)}
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Posição Y:</label>
                      <input
                        type="number"
                        value={Math.round(selectedRoom.y)}
                        onChange={(e) => handleUpdateRoomPosition(selectedRoom.id, selectedRoom.x, Number(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-xs"
                      />
                    </div>
                  </div>



                  {/* Door Settings in Room Inspector */}
                  <div className="p-2.5 bg-blue-50/70 dark:bg-slate-800/80 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                        <span>🚪 Porta do Ambiente</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleRoomDoorSwing(selectedRoom.id)}
                        className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                        title="Inverter giro de abertura (Dentro / Fora / Esq / Dir)"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Inverter Giro</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Parede da Porta:</label>
                      <select
                        value={selectedRoom.doorWall || 'bottom'}
                        onChange={(e) => handleSetRoomDoorWall(selectedRoom.id, e.target.value as DoorWall)}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold"
                      >
                        <option value="bottom">Parede Inferior (Sul)</option>
                        <option value="top">Parede Superior (Norte)</option>
                        <option value="left">Parede Esquerda (Oeste)</option>
                        <option value="right">Parede Direita (Leste)</option>
                        <option value="none">Sem Porta</option>
                      </select>
                    </div>

                    {selectedRoom.doorWall !== 'none' && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500 font-medium">Posição na Parede:</span>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleSetRoomDoorOffsetPreset(selectedRoom.id, 'start')}
                            className="px-1.5 py-0.5 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold cursor-pointer"
                          >
                            Início
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetRoomDoorOffsetPreset(selectedRoom.id, 'center')}
                            className="px-1.5 py-0.5 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold cursor-pointer"
                          >
                            Centro
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetRoomDoorOffsetPreset(selectedRoom.id, 'end')}
                            className="px-1.5 py-0.5 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold cursor-pointer"
                          >
                            Fim
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Room Name Label Position & Orientation Control */}
                  <div className="p-2.5 bg-indigo-50/70 dark:bg-slate-800/80 rounded-xl border border-indigo-200 dark:border-indigo-900/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                        <span>🏷️ Nome/Etiqueta da Sala</span>
                      </span>
                      {(selectedRoom.labelOffsetX !== undefined || selectedRoom.labelOffsetY !== undefined || (selectedRoom.labelRotation || 0) !== 0) && (
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateRoomDoor(selectedRoom.id, { labelOffsetX: undefined, labelOffsetY: undefined, labelRotation: 0 });
                            showToast(`Nome da sala '${selectedRoom.name}' recentralizado!`);
                          }}
                          className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                          title="Recentralizar o nome e restaurar rotação 0°"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Recentralizar</span>
                        </button>
                      )}
                    </div>

                    {/* Coordinates X & Y for Room Label */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Posição X:</label>
                        <input
                          type="number"
                          value={Math.round(selectedRoom.x + (selectedRoom.labelOffsetX ?? selectedRoom.width / 2))}
                          onChange={(e) => {
                            const absX = Number(e.target.value) || 0;
                            handleUpdateRoomDoor(selectedRoom.id, { labelOffsetX: Math.round(absX - selectedRoom.x) });
                          }}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-xs text-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Posição Y:</label>
                        <input
                          type="number"
                          value={Math.round(selectedRoom.y + (selectedRoom.labelOffsetY ?? selectedRoom.height / 2))}
                          onChange={(e) => {
                            const absY = Number(e.target.value) || 0;
                            handleUpdateRoomDoor(selectedRoom.id, { labelOffsetY: Math.round(absY - selectedRoom.y) });
                          }}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-xs text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Orientação / Rotação (Inverter Posição Horizontal / Vertical) */}
                    <div className="p-2 bg-white dark:bg-slate-900/90 border border-indigo-100 dark:border-slate-700 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300">
                          Orientação / Rotação:
                        </label>
                        <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                          {selectedRoom.labelRotation || 0}°
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 pt-0.5">
                        {[0, 90, 180, 270].map(deg => (
                          <button
                            key={deg}
                            type="button"
                            onClick={() => {
                              handleUpdateRoomDoor(selectedRoom.id, { labelRotation: deg });
                              showToast(`Orientação da etiqueta '${selectedRoom.name}' ajustada para ${deg}°!`);
                            }}
                            className={`py-1 rounded text-[10px] font-black transition-colors cursor-pointer ${
                              (selectedRoom.labelRotation || 0) === deg
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 hover:bg-blue-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const nextDeg = ((selectedRoom.labelRotation || 0) + 90) % 360;
                            handleUpdateRoomDoor(selectedRoom.id, { labelRotation: nextDeg });
                            showToast(`Etiqueta rotacionada para ${nextDeg}°`);
                          }}
                          className="py-1 flex items-center justify-center bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-slate-700 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Girar +90°"
                        >
                          <RotateCw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      Alterne a orientação entre Horizontal (0°, 180°) e Vertical (90°, 270°) ou arraste no mapa 2D.
                    </p>
                  </div>
                </div>
              )}

              {/* 3. LINK / CABLING INSPECTOR */}
              {selectedLink && (
                <div className="space-y-3 text-xs">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 space-y-1.5">
                    <div className="text-[11px] font-bold text-blue-900 dark:text-blue-200">Origem & Destino:</div>
                    <div className="text-[11px] text-slate-700 dark:text-slate-300 font-mono flex items-center justify-between">
                      <span>{nodes.find(n => n.id === selectedLink.fromNodeId)?.name || selectedLink.fromNodeId}</span>
                      <span className="text-blue-500 font-black">↔</span>
                      <span>{nodes.find(n => n.id === selectedLink.toNodeId)?.name || selectedLink.toNodeId}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Tipo de Cabo:</label>
                    <select
                      value={selectedLink.cableType}
                      onChange={(e) => handleUpdateLink(selectedLink.id, { cableType: e.target.value as CableType })}
                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                    >
                      <option value="SFTP CAT6 (Azul)">SFTP CAT6 (Azul - Blindado)</option>
                      <option value="CAT6 UTP (Cinza)">CAT6 UTP (Cinza Padrão)</option>
                      <option value="Fibra OM4 Multimodo (Laranja)">Fibra OM4 Multimodo (Laranja)</option>
                      <option value="CAT6a Shielded (Vermelho)">CAT6a Shielded (Vermelho)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Velocidade / Largura de Banda:</label>
                    <input
                      type="text"
                      value={selectedLink.speed || '1 Gbps RJ45'}
                      onChange={(e) => handleUpdateLink(selectedLink.id, { speed: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => {
                        const fromNode = nodes.find(n => n.id === selectedLink.fromNodeId);
                        const toNode = nodes.find(n => n.id === selectedLink.toNodeId);
                        const midX = fromNode && toNode ? (fromNode.x + toNode.x) / 2 : 400;
                        const midY = fromNode && toNode ? (fromNode.y + toNode.y) / 2 : 250;
                        handleAddLinkWaypoint(selectedLink.id, midX, midY);
                      }}
                      className="w-full py-1.5 bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700 rounded-lg font-bold flex items-center justify-center space-x-1.5 cursor-pointer text-[11px]"
                    >
                      <Move className="w-3.5 h-3.5" />
                      <span>Adicionar Ponto de Curva (Waypoint)</span>
                    </button>

                    {(selectedLink.waypoints && selectedLink.waypoints.length > 0) && (
                      <button
                        onClick={() => handleUpdateLink(selectedLink.id, { waypoints: [] })}
                        className="w-full py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        Resetar Curvas (Linha Direta)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 4. EMPTY INSPECTOR STATE */}
              {!selectedNode && !selectedRoom && !selectedLink && (
                <div className="text-center py-10 px-2 space-y-2.5">
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-500 flex items-center justify-center mx-auto shadow-inner">
                    <MousePointer className="w-6 h-6 animate-bounce" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Interatividade Total da Planta</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    • <strong>Clique</strong> em qualquer PC, Rack, Sala ou Cabo para inspecionar e editar.<br/>
                    • <strong>Arraste</strong> livremente equipamentos e curvas de cabos.<br/>
                    • <strong>Botão Direito</strong> em qualquer lugar abre o menu de contexto instantâneo!
                  </p>
                </div>
              )}

              {/* Instructions banner */}
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-100 dark:border-blue-900/60 text-[11px] text-blue-700 dark:text-blue-300 space-y-1">
                <p className="font-bold flex items-center">
                  <Info className="w-3.5 h-3.5 mr-1 shrink-0" />
                  Dica de Layout & Conexões:
                </p>
                <p className="leading-tight text-[10px]">
                  Para interligar dispositivos, clique no botão <strong>Ligar Cabo</strong> ou use o <strong>Menu do Botão Direito</strong>. Arraste os pontos do cabo para desviar de paredes!
                </p>
              </div>

            </div>
            )}

          </div>

          {/* ============================================================== */}
          {/* FLOATING RIGHT-CLICK CONTEXT MENU */}
          {/* ============================================================== */}
          {contextMenu && contextMenu.isOpen && (
            <div
              id="floatingContextMenu"
              ref={contextMenuRef}
              className="fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-1.5 min-w-[220px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-24px)] overflow-y-auto text-xs font-medium text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-100 select-none"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              {/* TARGET: EMPTY CANVAS */}
              {contextMenu.targetType === 'canvas' && (
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    Adicionar no Ponto ({contextMenu.svgX}, {contextMenu.svgY})
                  </div>

                  {/* Subcategory Pills/Tabs */}
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg my-1">
                    {ASSET_CATEGORIES.map(cat => {
                      const IconComp = cat.icon;
                      const isActive = contextCategoryTab === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setContextCategoryTab(cat.id)}
                          className={`py-1 px-1 rounded-md text-[10px] font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                            isActive
                              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-black'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                          }`}
                          title={cat.title}
                        >
                          <IconComp className="w-3.5 h-3.5 mb-0.5" />
                          <span className="truncate max-w-full text-[9px]">{cat.title}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Items for Selected Subcategory */}
                  <div className="space-y-0.5 max-h-[220px] overflow-y-auto">
                    {ASSET_CATEGORIES.find(c => c.id === contextCategoryTab)?.items.map(item => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => {
                            handleAddEquipment(item.type, contextMenu.svgX, contextMenu.svgY);
                            setContextMenu(null);
                          }}
                          className="w-full px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg flex items-center space-x-2 text-left cursor-pointer transition-colors"
                        >
                          <ItemIcon className={`w-4 h-4 ${item.color}`} />
                          <span className="font-bold text-xs text-slate-700 dark:text-slate-200">+ {item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                  <button
                    onClick={() => {
                      setEditingRoom({
                        name: 'Novo Ambiente Anexo',
                        x: contextMenu.svgX,
                        y: contextMenu.svgY,
                        width: 200,
                        height: 160,
                        wallColor: '#2563eb',
                        activeOnMap: true,
                        uplinkSpeed: '1 Gbps RJ45'
                      });
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg flex items-center space-x-2 text-left cursor-pointer text-xs"
                  >
                    <Building2 className="w-4 h-4 text-emerald-500" />
                    <span>+ Criar Sala / Ambiente Aqui</span>
                  </button>

                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                  <button
                    onClick={() => {
                      handleAutoFitNodesInQuadrants();
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg flex items-center space-x-2 text-left cursor-pointer text-blue-600 dark:text-blue-400 font-bold text-xs"
                  >
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span>Ajustar Equipamentos aos Limites das Salas</span>
                  </button>
                  <button
                    onClick={() => {
                      handleOrganizeQuadrantsAttached();
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg flex items-center space-x-2 text-left cursor-pointer text-emerald-600 dark:text-emerald-400 font-bold text-xs"
                  >
                    <Building2 className="w-4 h-4 text-emerald-500" />
                    <span>Organizar Ambientes da Planta</span>
                  </button>
                  <button
                    onClick={() => {
                      handleCenterLayout();
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg flex items-center space-x-2 text-left cursor-pointer text-indigo-600 dark:text-indigo-400 font-bold text-xs"
                  >
                    <Maximize2 className="w-4 h-4 text-indigo-500" />
                    <span>Centralizar Layout no Ambiente</span>
                  </button>
                  <button
                    onClick={() => {
                      handleAutoAlign();
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center space-x-2 text-left cursor-pointer text-xs text-slate-700 dark:text-slate-300"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                    <span>Auto-Alinhar à Grade 20px</span>
                  </button>
                  <button
                    onClick={() => {
                      handleUndo();
                      setContextMenu(null);
                    }}
                    disabled={layoutHistory.length === 0}
                    className={`w-full px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center space-x-2 text-left cursor-pointer text-xs font-bold ${
                      layoutHistory.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <Undo2 className="w-4 h-4 text-amber-500" />
                    <span>Voltar Modificação (Ctrl+Z)</span>
                  </button>
                  <button
                    onClick={() => {
                      handleSaveLayout();
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center space-x-2 text-left cursor-pointer text-xs text-slate-700 dark:text-slate-300"
                  >
                    <Save className="w-4 h-4 text-emerald-500" />
                    <span>Salvar Layout</span>
                  </button>
                </div>
              )}

              {/* TARGET: EQUIPMENT / FURNITURE NODE */}
              {contextMenu.targetType === 'node' && contextMenu.targetId && (
                <div className="space-y-0.5">
                  {selectedNodeIds.length > 1 && selectedNodeIds.includes(contextMenu.targetId) && (
                    <div className="p-1 mb-1.5 bg-purple-950/30 dark:bg-purple-950/50 rounded-lg border border-purple-500/30 space-y-1">
                      <div className="px-2 py-0.5 text-[9.5px] font-bold text-purple-300 uppercase tracking-wider flex items-center space-x-1">
                        <Boxes className="w-3 h-3 text-purple-400" />
                        <span>Ações do Grupo ({selectedNodeIds.length} selecionados)</span>
                      </div>
                      <button
                        onClick={() => {
                          handleRotateGroup(selectedNodeIds, 90);
                          setContextMenu(null);
                        }}
                        className="w-full px-2 py-1 hover:bg-purple-800/40 text-purple-200 font-bold rounded flex items-center space-x-1.5 text-left cursor-pointer text-xs"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-purple-400" />
                        <span>🔄 Girar Grupo 90°</span>
                      </button>
                      <button
                        onClick={() => {
                          handleFlipGroupHorizontal(selectedNodeIds);
                          setContextMenu(null);
                        }}
                        className="w-full px-2 py-1 hover:bg-purple-800/40 text-purple-200 font-bold rounded flex items-center space-x-1.5 text-left cursor-pointer text-xs"
                      >
                        <span>↔️ Inverter Grupo (Horizontal)</span>
                      </button>
                      <button
                        onClick={() => {
                          handleFlipGroupVertical(selectedNodeIds);
                          setContextMenu(null);
                        }}
                        className="w-full px-2 py-1 hover:bg-purple-800/40 text-purple-200 font-bold rounded flex items-center space-x-1.5 text-left cursor-pointer text-xs"
                      >
                        <span>↕️ Inverter Grupo (Vertical)</span>
                      </button>
                    </div>
                  )}

                  <div className="px-2.5 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    {nodes.find(n => n.id === contextMenu.targetId)?.name || 'Item'}
                  </div>
                  <button
                    onClick={() => {
                      handleRotateNode(contextMenu.targetId!);
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold rounded-lg flex items-center space-x-2 text-left cursor-pointer"
                  >
                    <RotateCw className="w-4 h-4 text-blue-500" />
                    <span>Girar 90° (+90°)</span>
                  </button>
                  <button
                    onClick={() => {
                      handleScaleNode(contextMenu.targetId!, 1.25);
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-lg flex items-center space-x-2 text-left cursor-pointer"
                  >
                    <Move className="w-4 h-4 text-blue-500" />
                    <span>Aumentar Tamanho (+25%)</span>
                  </button>
                  <button
                    onClick={() => {
                      handleScaleNode(contextMenu.targetId!, 0.8);
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-lg flex items-center space-x-2 text-left cursor-pointer"
                  >
                    <Move className="w-4 h-4 text-slate-500" />
                    <span>Diminuir Tamanho (-20%)</span>
                  </button>
                  <button
                    onClick={() => {
                      handleResetNodeSize(contextMenu.targetId!);
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-lg flex items-center space-x-2 text-left cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-emerald-500" />
                    <span>Restaurar Tamanho Padrão</span>
                  </button>
                  <button
                    onClick={() => {
                      setConnectingFromNodeId(contextMenu.targetId!);
                      setContextMenu(null);
                      showToast('Clique no segundo equipamento para criar o cabo de conexão!');
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold rounded-lg flex items-center space-x-2 text-left cursor-pointer"
                  >
                    <Link2 className="w-4 h-4 text-blue-500" />
                    <span>Ligar Cabo a Outro Dispositivo</span>
                  </button>
                  <button
                    onClick={() => {
                      handleDuplicateNode(contextMenu.targetId!);
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center space-x-2 text-left cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-emerald-500" />
                    <span>Duplicar Item</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNodeId(contextMenu.targetId!);
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center space-x-2 text-left cursor-pointer"
                  >
                    <Sliders className="w-4 h-4 text-amber-500" />
                    <span>Inspecionar & Editar</span>
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                  <button
                    onClick={() => {
                      handleDeleteNode(contextMenu.targetId!);
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 rounded-lg flex items-center space-x-2 text-left cursor-pointer font-bold"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <span>Excluir Item</span>
                  </button>
                </div>
              )}

              {/* TARGET: ROOM */}
              {contextMenu.targetType === 'room' && contextMenu.targetId && (
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    {rooms.find(r => r.id === contextMenu.targetId)?.name || 'Ambiente'}
                  </div>

                  {/* Subcategory Pills/Tabs */}
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg my-1">
                    {ASSET_CATEGORIES.map(cat => {
                      const IconComp = cat.icon;
                      const isActive = contextCategoryTab === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setContextCategoryTab(cat.id)}
                          className={`py-1 px-1 rounded-md text-[10px] font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                            isActive
                              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-black'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                          }`}
                          title={cat.title}
                        >
                          <IconComp className="w-3.5 h-3.5 mb-0.5" />
                          <span className="truncate max-w-full text-[9px]">{cat.title}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Items for Selected Subcategory in Room */}
                  <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                    {ASSET_CATEGORIES.find(c => c.id === contextCategoryTab)?.items.map(item => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => {
                            const room = rooms.find(r => r.id === contextMenu.targetId);
                            if (room) {
                              handleAddEquipment(item.type, room.x + 25, room.y + 35, room.id);
                            }
                            setContextMenu(null);
                          }}
                          className="w-full px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg flex items-center space-x-2 text-left cursor-pointer transition-colors text-xs"
                        >
                          <ItemIcon className={`w-4 h-4 ${item.color}`} />
                          <span className="font-bold text-slate-700 dark:text-slate-200">+ {item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                  <button
                    onClick={() => {
                      handleAutoFitNodesInQuadrants();
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg flex items-center space-x-2 text-left cursor-pointer text-amber-600 dark:text-amber-400 font-bold"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Auto-Organizar Equipamentos desta Sala</span>
                  </button>
                  <button
                    onClick={() => {
                      handleToggleRoomDoorSwing(contextMenu.targetId!);
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold rounded-lg flex items-center space-x-2 text-left cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-blue-500" />
                    <span>Inverter Sentido / Giro da Porta</span>
                  </button>
                  <button
                    onClick={() => {
                      handleCycleRoomDoorWall(contextMenu.targetId!);
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-emerald-50 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg flex items-center space-x-2 text-left cursor-pointer"
                  >
                    <Move className="w-4 h-4 text-emerald-500" />
                    <span>Mudar Parede da Porta</span>
                  </button>



                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                  <button
                    onClick={() => {
                      const room = rooms.find(r => r.id === contextMenu.targetId);
                      if (room) setEditingRoom(room);
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center space-x-2 text-left cursor-pointer"
                  >
                    <Edit className="w-4 h-4 text-slate-500" />
                    <span>Editar Dimensões & Detalhes</span>
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                  <button
                    onClick={() => {
                      handleDeleteRoom(contextMenu.targetId!);
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 rounded-lg flex items-center space-x-2 text-left cursor-pointer font-bold"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <span>Excluir Ambiente</span>
                  </button>
                </div>
              )}

              {/* TARGET: LINK / CABLING */}
              {contextMenu.targetType === 'link' && contextMenu.targetId && (
                <div className="space-y-0.5">
                  <div className="px-2.5 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    Cabo de Rede
                  </div>
                  <button
                    onClick={() => {
                      handleAddLinkWaypoint(contextMenu.targetId!, contextMenu.svgX, contextMenu.svgY);
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg flex items-center space-x-2 text-left cursor-pointer font-bold text-blue-600"
                  >
                    <Move className="w-4 h-4 text-blue-500" />
                    <span>Adicionar Ponto de Curva Aqui</span>
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                  <button
                    onClick={() => {
                      handleDeleteLink(contextMenu.targetId!);
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 rounded-lg flex items-center space-x-2 text-left cursor-pointer font-bold"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <span>Desconectar Cabo</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ==========================================
          DISCOVERY & SNMP SCANNER TAB
         ========================================== */}
      {viewMode === 'discovery' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80">
            {renderTopNavTabs()}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <span>Agente de Descoberta Automática de Rede (SNMP / LLDP / CDP)</span>
                  <span className="px-2 py-0.5 text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-mono font-bold rounded-md">
                    UDP 161
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Varredura contínua de subnets, consulta de MIBs de switches, firewalls e APs para inclusão automática na topologia 2D.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleMapAllDiscoveredDevices}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
                title="Inserir todos os equipamentos descobertos no mapa de infraestrutura 2D"
              >
                <Plus className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                <span>Sincronizar Todos com o Mapa 2D</span>
              </button>
            </div>
          </div>

          {/* Configuration Form & Presets */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subnet Alvo (CIDR):</label>
                <input
                  type="text"
                  value={scanSubnetIp}
                  onChange={(e) => setScanSubnetIp(e.target.value)}
                  placeholder="192.168.10.0/24"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">SNMP Community String:</label>
                <input
                  type="text"
                  value={scanCommunity}
                  onChange={(e) => setScanCommunity(e.target.value)}
                  placeholder="public_ro"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Versão SNMP:</label>
                <select
                  value={snmpVersion}
                  onChange={(e) => setSnmpVersion(e.target.value as 'v2c' | 'v3')}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="v2c">SNMPv2c (Comunidade Padrão)</option>
                  <option value="v3">SNMPv3 (AuthPriv - SHA/AES256)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleStartSnmpScan}
                  disabled={isScanningSubnet}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isScanningSubnet ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                  <span>{isScanningSubnet ? `Escaneando (${scanProgress}%)...` : 'Executar Varredura SNMP'}</span>
                </button>
              </div>
            </div>

            {/* Quick Subnet Presets */}
            <div className="flex items-center space-x-2 text-xs pt-1">
              <span className="text-slate-500 font-bold text-[11px]">Subnets Rápidas:</span>
              {[
                { label: '192.168.10.0/24 (LAN/Servidores)', ip: '192.168.10.0/24' },
                { label: '10.0.0.0/24 (Data Center)', ip: '10.0.0.0/24' },
                { label: '172.16.1.0/24 (DMZ & Borda)', ip: '172.16.1.0/24' }
              ].map((preset) => (
                <button
                  key={preset.ip}
                  onClick={() => setScanSubnetIp(preset.ip)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${
                    scanSubnetIp === preset.ip
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-teal-400'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Scanning Progress Bar */}
            {isScanningSubnet && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-teal-700 dark:text-teal-300">
                  <span className="flex items-center space-x-2">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-teal-500" />
                    <span>Varrendo endereços IPv4 e consultando MIBs SNMP...</span>
                  </span>
                  <span className="font-mono">{scanProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-300"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Endereços Verificados</span>
              <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">254 IPs</span>
            </div>
            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/80">
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider block">Hosts com SNMP Ativo</span>
              <span className="text-lg font-black text-teal-700 dark:text-teal-300 font-mono">{discoveredDevices.length} Ativos</span>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/80">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">Interfaces Físicas</span>
              <span className="text-lg font-black text-blue-700 dark:text-blue-300 font-mono">118 Portas</span>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">Mapeados na Topologia</span>
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                {discoveredDevices.filter(d => nodes.some(n => n.ip === d.ip || n.name.toLowerCase() === d.name.toLowerCase())).length} de {discoveredDevices.length}
              </span>
            </div>
          </div>

          {/* Discovered Devices Table & Actions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <span>Dispositivos Detectados na Subnet ({discoveredDevices.length})</span>
                <span className="text-slate-400 font-normal">| Clique para adicionar diretamente ao layout 2D</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {discoveredDevices.map((device) => {
                const isMapped = nodes.some(n => n.ip === device.ip || n.name.toLowerCase() === device.name.toLowerCase());
                
                return (
                  <div
                    key={device.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                      isMapped
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          device.type === 'switch' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300' :
                          device.type === 'firewall' ? 'bg-red-100 text-red-600 dark:bg-red-900/60 dark:text-red-300' :
                          device.type === 'access_point' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/60 dark:text-purple-300' :
                          device.type === 'ups' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-300' :
                          device.type === 'storage' ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/60 dark:text-cyan-300' :
                          'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300'
                        }`}>
                          {device.type === 'switch' ? <Network className="w-5 h-5" /> :
                           device.type === 'firewall' ? <ShieldCheck className="w-5 h-5" /> :
                           device.type === 'access_point' ? <Wifi className="w-5 h-5" /> :
                           device.type === 'ups' ? <Zap className="w-5 h-5" /> :
                           device.type === 'storage' ? <HardDrive className="w-5 h-5" /> :
                           <Server className="w-5 h-5" />}
                        </div>

                        <div>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                            {device.name}
                          </h5>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {device.vendor} • {device.model}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider shrink-0 ${
                        device.status === 'online'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {device.status} • {device.rttMs}ms
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px]">ENDEREÇO IP:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{device.ip}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">MAC ADDRESS:</span>
                        <span className="text-slate-600 dark:text-slate-400 truncate block">{device.mac}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">VLAN / PORTAS:</span>
                        <span className="text-slate-600 dark:text-slate-400">{device.activePorts}/{device.portsCount} ativas</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">UPTIME:</span>
                        <span className="text-slate-600 dark:text-slate-400 truncate block">{device.uptime}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]" title={device.sysDescr}>
                        {device.sysDescr}
                      </span>

                      {isMapped ? (
                        <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mapeado no Mapa 2D</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleMapDiscoveredDeviceToTopology(device)}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar ao Mapa</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Terminal Console Logs */}
          <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 font-mono text-xs text-slate-300 space-y-2 min-h-[200px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-500 text-[11px]">
              <span className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-teal-400" />
                <span>SNMP DISCOVERY DAEMON CONSOLE</span>
              </span>
              <div className="flex items-center space-x-3">
                <span className="text-slate-400">TIMEOUT: 1000ms</span>
                <span className="text-emerald-400 font-bold">PORTA 161/UDP ATIVA</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 max-h-60 overflow-y-auto scrollbar-none">
              {scanLogs.map((log, idx) => (
                <p key={idx} className="leading-relaxed">
                  <span className="text-teal-400">&gt;</span> {log}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}


      {viewMode === 'environments' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80">
            {renderTopNavTabs()}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Tabela de Inclusão de Ambientes & Mapeamento de Layout
                </h3>
                <p className="text-xs text-slate-500">
                  Cadastre salas e espaços físicos. Ambientes marcados como ativos são renderizados dinamicamente no mapa 2D com paredes e uplinks de rede.
                </p>
              </div>
            </div>

            <button
              onClick={() => setEditingRoom({ activeOnMap: true, category: 'office', wallColor: '#2563eb', uplinkCableType: 'SFTP CAT6 (Azul - Blindado)', uplinkSpeed: '1 Gbps', x: 260, y: 240, width: 280, height: 180 })}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center space-x-2 cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Incluir Novo Ambiente</span>
            </button>
          </div>

          {/* Metric Summary Cards & Ala Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Filtrar por Ala/Unidade:</span>
              <select
                value={selectedWingFilter}
                onChange={(e) => setSelectedWingFilter(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Todas as Alas ({rooms.length} salas)</option>
                {wings.map(w => {
                  const count = rooms.filter(r => r.wingId === w.id).length;
                  return (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name} ({count} {count === 1 ? 'sala' : 'salas'})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center space-x-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span>Exibindo: <strong className="text-purple-600 dark:text-purple-400">{rooms.filter(r => selectedWingFilter === 'all' || r.wingId === selectedWingFilter).length}</strong> de {rooms.length} ambientes</span>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 font-semibold">Total de Ambientes</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{rooms.length}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 font-semibold">Exibidos no Mapa 2D</p>
              <p className="text-2xl font-black text-blue-500 mt-1">{rooms.filter(r => r.activeOnMap && (selectedWingFilter === 'all' || r.wingId === selectedWingFilter)).length}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 font-semibold">Cabeamento Estruturado Dominante</p>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-2">{config.cableType}</p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-100 dark:bg-slate-800/80 uppercase text-[10px] font-black tracking-wider text-slate-500">
                <tr>
                  <th className="p-3">Mapa 2D</th>
                  <th className="p-3">Nome do Ambiente</th>
                  <th className="p-3">Unidade / Ala</th>
                  <th className="p-3">Coordenadas & Tamanho</th>
                  <th className="p-3">Dispositivo Uplink & Cabo</th>
                  <th className="p-3">VLAN / Velocidade</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {rooms
                  .filter(room => selectedWingFilter === 'all' || room.wingId === selectedWingFilter)
                  .map(room => (
                  <tr key={room.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3">
                      <button
                        onClick={() => setRooms(prev => prev.map(r => r.id === room.id ? { ...r, activeOnMap: !r.activeOnMap } : r))}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-colors ${
                          room.activeOnMap
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>{room.activeOnMap ? 'No Mapa' : 'Oculto'}</span>
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                        <span>{room.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize flex items-center space-x-1 mt-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: room.wallColor || '#2563eb' }} />
                        <span>{room.category}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <select
                        value={room.wingId || ''}
                        onChange={(e) => {
                          const wId = e.target.value;
                          setRooms(prev => prev.map(r => r.id === room.id ? { ...r, wingId: wId || undefined } : r));
                          const wName = wings.find(w => w.id === wId)?.name || 'Nenhuma Ala';
                          showToast(`Ambiente '${room.name}' vinculado à ${wName}!`);
                        }}
                        className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-slate-100 shadow-2xs"
                      >
                        <option value="">(Sem Ala / Geral)</option>
                        {wings.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.code} - {w.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      X: {room.x}, Y: {room.y} <br />
                      <span className="text-slate-400">Largura: {room.width}px, Altura: {room.height}px</span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-blue-600 dark:text-blue-400">
                        {nodes.find(n => n.id === room.uplinkDevice)?.name || room.uplinkDevice || 'Main Switch'}
                      </div>
                      <div className="text-[10px] text-slate-500">{room.uplinkCableType}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-bold text-[10px] text-slate-700 dark:text-slate-300">
                        {room.uplinkVlan}
                      </span>
                      <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{room.uplinkSpeed}</div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setEditingRoom(room)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Editar Ambiente"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Excluir Ambiente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          VIEW MODE: PADRÃO DAS ESTAÇÕES DE TRABALHO
         ========================================== */}
      {viewMode === 'station_standards' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80">
            {renderTopNavTabs()}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Tabela de Padrões e Equipamentos das Estações de Trabalho
                </h3>
                <p className="text-xs text-slate-500">
                  Defina especificações de hardware (CPU, RAM, Monitores, VoIP, SO) e quantidades alocadas por ambiente.
                </p>
              </div>
            </div>

            <button
              onClick={() => setEditingStation({ quantity: 1, unitCost: 5000, os: 'Windows 11 Pro', monitors: 'Monitores Duplos 24"', voipPhone: 'Telefone IP VoIP Cisco', cpu: 'Intel Core i7 13th Gen', ram: '16 GB DDR5', storage: '512 GB NVMe SSD' })}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-2 cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Padrão de Estação</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-100 dark:bg-slate-800/80 uppercase text-[10px] font-black tracking-wider text-slate-500">
                <tr>
                  <th className="p-3">Perfil / Padrão</th>
                  <th className="p-3">Especificações de Hardware (CPU/RAM/SSD)</th>
                  <th className="p-3">Monitores & VoIP</th>
                  <th className="p-3">S.O.</th>
                  <th className="p-3">Ambiente / Qtd</th>
                  <th className="p-3 text-right">Custo Unitário / Total</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stationStandards.map(std => {
                  const roomObj = rooms.find(r => r.id === std.roomId);
                  return (
                    <tr key={std.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{std.profileName}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{std.accessoriesIncluded}</div>
                      </td>
                      <td className="p-3 space-y-0.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{std.cpu}</div>
                        <div className="text-[10px] text-slate-500">{std.ram} • {std.storage}</div>
                      </td>
                      <td className="p-3 space-y-0.5">
                        <div className="font-semibold text-indigo-600 dark:text-indigo-400">{std.monitors}</div>
                        <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{std.voipPhone}</span>
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                        {std.os}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-bold text-[10px] text-slate-800 dark:text-slate-200">
                          {roomObj?.name || 'Escritório'}
                        </span>
                        <div className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 mt-1">
                          {std.quantity} Estações
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          R$ {(std.unitCost * std.quantity).toLocaleString('pt-BR')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          R$ {std.unitCost.toLocaleString('pt-BR')} / un
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setEditingStation(std)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Editar Padrão"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStation(std.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Padrão"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          VIEW MODE: ACESSÓRIOS & INFRAESTRUTURA
         ========================================== */}
      {viewMode === 'accessories' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80">
            {renderTopNavTabs()}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Tabela de Acessórios & Passivos de Infraestrutura
                </h3>
                <p className="text-xs text-slate-500">
                  No-Breaks/UPS, Patch Panels, Eletrocalhas, Transceivers SFP+, Climatização de Precisão e PDUs.
                </p>
              </div>
            </div>

            <button
              onClick={() => setEditingAccessory({ quantity: 1, unitPrice: 100, category: 'Passivos & Patching', status: 'installed' })}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-2 cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Incluir Acessório</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-100 dark:bg-slate-800/80 uppercase text-[10px] font-black tracking-wider text-slate-500">
                <tr>
                  <th className="p-3">Acessório / Item</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Marca / Modelo</th>
                  <th className="p-3">Ambiente Alocado</th>
                  <th className="p-3 text-center">Quantidade</th>
                  <th className="p-3 text-right">Preço Total</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {accessories.map(acc => {
                  const roomObj = rooms.find(r => r.id === acc.roomId);
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                        {acc.name}
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">{acc.notes}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">
                          {acc.category}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        {acc.brandModel}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] text-slate-600 dark:text-slate-400 font-bold">
                          {roomObj?.name || 'Geral'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {acc.quantity}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        R$ {(acc.unitPrice * acc.quantity).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setEditingAccessory(acc)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Editar Acessório"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAccessory(acc.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Acessório"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: EDITING ROOM / ENVIRONMENT
         ========================================== */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {editingRoom.id ? 'Editar Ambiente / Sala' : 'Incluir Novo Ambiente no Mapa'}
                </h3>
              </div>
              <button
                onClick={() => setEditingRoom(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveRoom(editingRoom); }} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Ambiente / Sala:</label>
                <input
                  type="text"
                  value={editingRoom.name || ''}
                  onChange={(e) => setEditingRoom(prev => ({ ...prev!, name: e.target.value }))}
                  placeholder="Ex: Sala de Reunião Diretoria, Laboratório de P&D..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>



              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria:</label>
                  <select
                    value={editingRoom.category || 'office'}
                    onChange={(e) => setEditingRoom(prev => ({ ...prev!, category: e.target.value as any }))}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="datacenter">Data Center / Servidores</option>
                    <option value="office">Escritório / Open Space</option>
                    <option value="meeting">Sala de Reunião</option>
                    <option value="rack_room">Sala Técnica / Teleco</option>
                    <option value="other">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Cor da Parede / Borda:</label>
                  <input
                    type="color"
                    value={editingRoom.wallColor || '#2563eb'}
                    onChange={(e) => setEditingRoom(prev => ({ ...prev!, wallColor: e.target.value }))}
                    className="w-full h-9 p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Posicionamento & Dimensões (Planta 2D):
                  </span>
                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                    {(editingRoom.width ?? 280)} × {(editingRoom.height ?? 180)} px (~{((Number(editingRoom.width ?? 280) * Number(editingRoom.height ?? 180)) / 100).toFixed(1)} m²)
                  </span>
                </div>

                {/* Preset shortcuts */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">Pré-ajustes:</span>
                  {[
                    { label: 'Compacta (70×70)', w: 70, h: 70 },
                    { label: 'Pequena (120×90)', w: 120, h: 90 },
                    { label: 'Média (180×140)', w: 180, h: 140 },
                    { label: 'Padrão (260×200)', w: 260, h: 200 },
                    { label: 'Grande (360×260)', w: 360, h: 260 },
                    { label: 'NOC/DC (480×320)', w: 480, h: 320 }
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setEditingRoom(prev => ({ ...prev!, width: preset.w, height: preset.h }))}
                      className="px-2 py-0.5 text-[9.5px] font-bold bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 border border-slate-200 dark:border-slate-700 rounded-md shrink-0 cursor-pointer transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Pos X (px):</label>
                    <input
                      type="number"
                      value={editingRoom.x ?? 260}
                      onChange={(e) => setEditingRoom(prev => ({ ...prev!, x: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Pos Y (px):</label>
                    <input
                      type="number"
                      value={editingRoom.y ?? 240}
                      onChange={(e) => setEditingRoom(prev => ({ ...prev!, y: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Largura (px):</label>
                    <input
                      type="number"
                      min="30"
                      max="1500"
                      value={editingRoom.width ?? 280}
                      onChange={(e) => setEditingRoom(prev => ({ ...prev!, width: Math.max(30, Number(e.target.value) || 30) }))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Altura (px):</label>
                    <input
                      type="number"
                      min="30"
                      max="1200"
                      value={editingRoom.height ?? 180}
                      onChange={(e) => setEditingRoom(prev => ({ ...prev!, height: Math.max(30, Number(e.target.value) || 30) }))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Target de Uplink:</label>
                  <select
                    value={editingRoom.uplinkDevice || 'main_switch'}
                    onChange={(e) => setEditingRoom(prev => ({ ...prev!, uplinkDevice: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.name} ({n.ip})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Cabo de Rede:</label>
                  <select
                    value={editingRoom.uplinkCableType || 'SFTP CAT6 (Azul - Blindado)'}
                    onChange={(e) => setEditingRoom(prev => ({ ...prev!, uplinkCableType: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="SFTP CAT6 (Azul - Blindado)">SFTP CAT6 (Azul - Blindado)</option>
                    <option value="UTP CAT6A (Laranja)">UTP CAT6A (Laranja)</option>
                    <option value="Fibra Óptica OM4 LC-LC">Fibra Óptica OM4 LC-LC</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">VLAN Dedicada:</label>
                  <input
                    type="text"
                    value={editingRoom.uplinkVlan || 'VLAN 100'}
                    onChange={(e) => setEditingRoom(prev => ({ ...prev!, uplinkVlan: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Velocidade de Uplink:</label>
                  <input
                    type="text"
                    value={editingRoom.uplinkSpeed || '1 Gbps'}
                    onChange={(e) => setEditingRoom(prev => ({ ...prev!, uplinkSpeed: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Door Configuration Section */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <span>🚪 Porta do Ambiente (Planta Baixa)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const currentSwing: DoorSwing = editingRoom.doorSwing || 'inside-left';
                      const swingTransitions: Record<DoorSwing, DoorSwing> = {
                        'inside-left': 'inside-right',
                        'inside-right': 'outside-left',
                        'outside-left': 'outside-right',
                        'outside-right': 'inside-left'
                      };
                      setEditingRoom(prev => ({ ...prev!, doorSwing: swingTransitions[currentSwing] || 'inside-right' }));
                    }}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Inverter Giro / Sentido</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Parede Onde Fica a Porta:</label>
                    <select
                      value={editingRoom.doorWall || 'bottom'}
                      onChange={(e) => setEditingRoom(prev => ({ ...prev!, doorWall: e.target.value as DoorWall }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="bottom">Parede Inferior (Sul)</option>
                      <option value="top">Parede Superior (Norte)</option>
                      <option value="left">Parede Esquerda (Oeste)</option>
                      <option value="right">Parede Direita (Leste)</option>
                      <option value="none">Sem Porta</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Abertura e Giro:</label>
                    <select
                      value={editingRoom.doorSwing || 'inside-left'}
                      onChange={(e) => setEditingRoom(prev => ({ ...prev!, doorSwing: e.target.value as DoorSwing }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="inside-left">Para Dentro (Dobradiça à Esquerda)</option>
                      <option value="inside-right">Para Dentro (Dobradiça à Direita)</option>
                      <option value="outside-left">Para Fora (Dobradiça à Esquerda)</option>
                      <option value="outside-right">Para Fora (Dobradiça à Direita)</option>
                    </select>
                  </div>
                </div>

                {editingRoom.doorWall !== 'none' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Distância do Canto / Offset (px):</label>
                      <input
                        type="number"
                        min="10"
                        max="300"
                        value={editingRoom.doorOffset ?? 32}
                        onChange={(e) => setEditingRoom(prev => ({ ...prev!, doorOffset: Number(e.target.value) || 20 }))}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Largura da Folha da Porta (px):</label>
                      <input
                        type="number"
                        min="20"
                        max="60"
                        value={editingRoom.doorWidth ?? 32}
                        onChange={(e) => setEditingRoom(prev => ({ ...prev!, doorWidth: Number(e.target.value) || 32 }))}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              <label className="flex items-center space-x-2.5 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingRoom.activeOnMap ?? true}
                  onChange={(e) => setEditingRoom(prev => ({ ...prev!, activeOnMap: e.target.checked }))}
                  className="rounded text-amber-600 focus:ring-0 w-4 h-4"
                />
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Exibir Paredes e Nome deste Ambiente no Mapa 2D
                </span>
              </label>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 cursor-pointer flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Ambiente</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: EDITING STATION STANDARD
         ========================================== */}
      {editingStation && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center space-x-2">
                <Monitor className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {editingStation.id ? 'Editar Padrão de Estação' : 'Criar Novo Padrão de Estação'}
                </h3>
              </div>
              <button
                onClick={() => setEditingStation(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveStation(editingStation); }} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Padrão / Perfil:</label>
                <input
                  type="text"
                  value={editingStation.profileName || ''}
                  onChange={(e) => setEditingStation(prev => ({ ...prev!, profileName: e.target.value }))}
                  placeholder="Ex: Padrão Dev Senior, Padrão Call Center..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Processador (CPU):</label>
                  <input
                    type="text"
                    value={editingStation.cpu || ''}
                    onChange={(e) => setEditingStation(prev => ({ ...prev!, cpu: e.target.value }))}
                    placeholder="Ex: Intel i7 13700"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Memória RAM:</label>
                  <input
                    type="text"
                    value={editingStation.ram || ''}
                    onChange={(e) => setEditingStation(prev => ({ ...prev!, ram: e.target.value }))}
                    placeholder="Ex: 32 GB DDR5"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Armazenamento:</label>
                  <input
                    type="text"
                    value={editingStation.storage || ''}
                    onChange={(e) => setEditingStation(prev => ({ ...prev!, storage: e.target.value }))}
                    placeholder="Ex: 1 TB NVMe SSD"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Monitores:</label>
                  <input
                    type="text"
                    value={editingStation.monitors || ''}
                    onChange={(e) => setEditingStation(prev => ({ ...prev!, monitors: e.target.value }))}
                    placeholder="Ex: Monitores Duplos 24IPS"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone VoIP:</label>
                  <input
                    type="text"
                    value={editingStation.voipPhone || ''}
                    onChange={(e) => setEditingStation(prev => ({ ...prev!, voipPhone: e.target.value }))}
                    placeholder="Ex: Telefone IP Cisco 7821"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Sistema Operacional:</label>
                  <input
                    type="text"
                    value={editingStation.os || ''}
                    onChange={(e) => setEditingStation(prev => ({ ...prev!, os: e.target.value }))}
                    placeholder="Ex: Windows 11 Pro"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Quantidade:</label>
                  <input
                    type="number"
                    value={editingStation.quantity ?? 1}
                    onChange={(e) => setEditingStation(prev => ({ ...prev!, quantity: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Custo Unitário (R$):</label>
                  <input
                    type="number"
                    value={editingStation.unitCost ?? 5000}
                    onChange={(e) => setEditingStation(prev => ({ ...prev!, unitCost: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ambiente Alocado:</label>
                  <select
                    value={editingStation.roomId || rooms[0]?.id || ''}
                    onChange={(e) => setEditingStation(prev => ({ ...prev!, roomId: e.target.value }))}
                    className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingStation(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Padrão</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: EDITING ACCESSORY
         ========================================== */}
      {editingAccessory && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {editingAccessory.id ? 'Editar Acessório / Passivo' : 'Incluir Novo Acessório'}
                </h3>
              </div>
              <button
                onClick={() => setEditingAccessory(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveAccessory(editingAccessory); }} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Item / Acessório:</label>
                <input
                  type="text"
                  value={editingAccessory.name || ''}
                  onChange={(e) => setEditingAccessory(prev => ({ ...prev!, name: e.target.value }))}
                  placeholder="Ex: No-Break APC Smart-UPS 3000VA, Patch Panel 24 Portas CAT6..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria:</label>
                  <select
                    value={editingAccessory.category || 'Passivos & Patching'}
                    onChange={(e) => setEditingAccessory(prev => ({ ...prev!, category: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    <option value="Energia & UPS">Energia & UPS</option>
                    <option value="Passivos & Patching">Passivos & Patching</option>
                    <option value="Eletrocalhas & Calhas">Eletrocalhas & Calhas</option>
                    <option value="Transceivers & Óptica">Transceivers & Óptica</option>
                    <option value="Climatização & Sensores">Climatização & Sensores</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Marca / Modelo:</label>
                  <input
                    type="text"
                    value={editingAccessory.brandModel || ''}
                    onChange={(e) => setEditingAccessory(prev => ({ ...prev!, brandModel: e.target.value }))}
                    placeholder="Ex: Furukawa / APC / Cisco"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Quantidade:</label>
                  <input
                    type="number"
                    value={editingAccessory.quantity ?? 1}
                    onChange={(e) => setEditingAccessory(prev => ({ ...prev!, quantity: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Preço Unitário (R$):</label>
                  <input
                    type="number"
                    value={editingAccessory.unitPrice ?? 100}
                    onChange={(e) => setEditingAccessory(prev => ({ ...prev!, unitPrice: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ambiente:</label>
                  <select
                    value={editingAccessory.roomId || rooms[0]?.id || ''}
                    onChange={(e) => setEditingAccessory(prev => ({ ...prev!, roomId: e.target.value }))}
                    className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Observações:</label>
                <input
                  type="text"
                  value={editingAccessory.notes || ''}
                  onChange={(e) => setEditingAccessory(prev => ({ ...prev!, notes: e.target.value }))}
                  placeholder="Ex: Instalado no Rack A1 posição 42U"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingAccessory(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Acessório</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          WING / UNIDADE MANAGER MODAL
         ========================================== */}
      {isWingManagerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans">
            
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between border-b border-indigo-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Gestão de Alas & Unidades da Empresa</h3>
                  <p className="text-xs text-indigo-200">Agrupe salas em unidades/alas (ex: Ala A, Ala B, Bloco Operacional) e defina a sequência visual no mapa.</p>
                </div>
              </div>
              <button
                onClick={() => setIsWingManagerOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* Form to Add / Edit Wing */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                  <Plus className="w-4 h-4 text-purple-500" />
                  <span>{editingWing?.id ? 'Editar Ala / Unidade' : 'Cadastrar Nova Ala / Unidade'}</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Nome da Ala / Unidade:</label>
                    <input
                      type="text"
                      value={newWingForm.name || ''}
                      onChange={(e) => setNewWingForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Ala A - Bloco Operacional, Ala B - Diretoria..."
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Código Curto:</label>
                    <input
                      type="text"
                      value={newWingForm.code || ''}
                      onChange={(e) => setNewWingForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="Ex: ALA-A"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Cor Temática:</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={newWingForm.color || '#3b82f6'}
                        onChange={(e) => setNewWingForm(prev => ({ ...prev, color: e.target.value }))}
                        className="w-10 h-8 p-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer shrink-0"
                      />
                      <div className="flex items-center space-x-1 overflow-x-auto">
                        {['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'].map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewWingForm(prev => ({ ...prev, color: c }))}
                            className="w-5 h-5 rounded-full border border-white shadow-2xs hover:scale-110 transition-transform cursor-pointer"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Descrição / Finalidade:</label>
                    <input
                      type="text"
                      value={newWingForm.description || ''}
                      onChange={(e) => setNewWingForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ex: Setor administrativo e salas de reunião executivas"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  {editingWing?.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingWing(null);
                        setNewWingForm({ name: '', code: '', color: '#8b5cf6', description: '' });
                      }}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-300 cursor-pointer"
                    >
                      Cancelar Edição
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (!newWingForm.name) {
                        showToast('Informe o nome da Ala / Unidade.');
                        return;
                      }

                      if (editingWing?.id) {
                        setWings(prev => {
                          const updated = prev.map(w => w.id === editingWing.id ? { ...w, ...newWingForm } as CompanyWing : w);
                          localStorage.setItem('applet_infra_topology_wings', JSON.stringify(updated));
                          return updated;
                        });
                        showToast(`Ala '${newWingForm.name}' atualizada com sucesso!`);
                        setEditingWing(null);
                      } else {
                        const createdWing: CompanyWing = {
                          id: `wing_${Date.now()}`,
                          name: newWingForm.name || 'Nova Ala',
                          code: newWingForm.code || `ALA-${wings.length + 1}`,
                          color: newWingForm.color || '#8b5cf6',
                          description: newWingForm.description || '',
                          orderSequence: wings.length + 1
                        };
                        setWings(prev => {
                          const updated = [...prev, createdWing];
                          localStorage.setItem('applet_infra_topology_wings', JSON.stringify(updated));
                          return updated;
                        });
                        showToast(`Ala '${createdWing.name}' cadastrada com sucesso!`);
                      }

                      setNewWingForm({ name: '', code: '', color: '#8b5cf6', description: '' });
                    }}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 flex items-center space-x-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingWing?.id ? 'Salvar Alterações' : 'Cadastrar Ala'}</span>
                  </button>
                </div>
              </div>

              {/* Existing Wings List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Alas e Unidades Cadastradas ({wings.length}):</span>
                  {wings.length > 0 && (
                    <button
                      onClick={() => handleAutoSequenceWings()}
                      className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <FolderTree className="w-3 h-3" />
                      <span>Reorganizar Todas no Mapa em Sequência</span>
                    </button>
                  )}
                </h4>

                <div className="space-y-2">
                  {wings.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Nenhuma Ala cadastrada no momento.</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">Utilize o formulário acima para cadastrar uma nova ala ou unidade organizacional.</p>
                    </div>
                  ) : (
                    wings.map((wing) => {
                      const wingRooms = rooms.filter(r => r.wingId === wing.id);

                      return (
                        <div
                          key={wing.id}
                          className="p-3.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-2 hover:border-purple-300 dark:hover:border-purple-700 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center space-x-3">
                              <span
                                className="w-4 h-8 rounded-md shrink-0 shadow-2xs"
                                style={{ backgroundColor: wing.color }}
                              />
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{wing.name}</span>
                                  <span 
                                    className="px-1.5 py-0.5 rounded text-[9px] font-black text-white"
                                    style={{ backgroundColor: wing.color }}
                                  >
                                    {wing.code}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {wing.description || 'Sem descrição cadastrada'} • <span className="font-bold text-purple-600 dark:text-purple-400">{wingRooms.length} salas vinculadas</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0">
                              <button
                                onClick={() => handleAutoSequenceWings(wing.id)}
                                className="px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[10px] font-bold flex items-center space-x-1 cursor-pointer hover:bg-blue-100"
                                title="Sequenciar salas desta ala no mapa"
                              >
                                <Layers className="w-3 h-3" />
                                <span>Alinhar Salas</span>
                              </button>

                              <button
                                onClick={() => {
                                  setEditingWing(wing);
                                  setNewWingForm({
                                    name: wing.name,
                                    code: wing.code,
                                    color: wing.color,
                                    description: wing.description || ''
                                  });
                                }}
                                className="p-1.5 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                title="Editar"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  // Unlink all rooms from this wing
                                  setRooms(prev => {
                                    const updated = prev.map(r => r.wingId === wing.id ? { ...r, wingId: undefined } : r);
                                    localStorage.setItem('applet_infra_topology_rooms', JSON.stringify(updated));
                                    return updated;
                                  });

                                  // Remove wing and persist
                                  setWings(prev => {
                                    const updated = prev.filter(w => w.id !== wing.id);
                                    localStorage.setItem('applet_infra_topology_wings', JSON.stringify(updated));
                                    return updated;
                                  });

                                  if (selectedWingFilter === wing.id) {
                                    setSelectedWingFilter('all');
                                  }
                                  if (editingWing?.id === wing.id) {
                                    setEditingWing(null);
                                  }

                                  showToast(`Ala '${wing.name}' excluída com sucesso.`);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                title="Excluir Ala"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Strict Wing-Isolated Rooms Management */}
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                                <span>Salas desta Ala ({wingRooms.length}):</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRoom({
                                    activeOnMap: true,
                                    uplinkSpeed: '1 Gbps RJ45',
                                    equipmentCount: 2,
                                    wingId: wing.id
                                  });
                                }}
                                className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer flex items-center space-x-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ Criar Sala nesta Ala</span>
                              </button>
                            </div>

                            {/* Render ONLY rooms that belong to THIS wing */}
                            {wingRooms.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {wingRooms.map(room => (
                                  <div
                                    key={`wing_room_${wing.id}_${room.id}`}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-600 text-white shadow-2xs flex items-center space-x-1.5"
                                  >
                                    <span>✓ {room.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRooms(prev => {
                                          const updated = prev.map(r => r.id === room.id ? { ...r, wingId: undefined } : r);
                                          localStorage.setItem('applet_infra_topology_rooms', JSON.stringify(updated));
                                          return updated;
                                        });
                                        showToast(`'${room.name}' removida da ${wing.name}`);
                                      }}
                                      className="p-0.5 hover:bg-purple-700 rounded text-purple-200 hover:text-white cursor-pointer ml-1"
                                      title="Desvincular desta Ala"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic mb-2">Nenhuma sala vinculada a esta Ala ainda.</p>
                            )}

                            {/* Show ONLY unallocated rooms (rooms that have NO wing at all) */}
                            {rooms.filter(r => !r.wingId).length > 0 && (
                              <div className="mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-bold text-slate-500 block mb-1">
                                  Salas sem Ala disponíveis para vincular:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {rooms.filter(r => !r.wingId).map(unassignedRoom => (
                                    <button
                                      key={`unassigned_${wing.id}_${unassignedRoom.id}`}
                                      type="button"
                                      onClick={() => {
                                        setRooms(prev => {
                                          const updated = prev.map(r => r.id === unassignedRoom.id ? { ...r, wingId: wing.id } : r);
                                          localStorage.setItem('applet_infra_topology_rooms', JSON.stringify(updated));
                                          return updated;
                                        });
                                        showToast(`'${unassignedRoom.name}' vinculada com sucesso à ${wing.name}!`);
                                      }}
                                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/60 dark:hover:text-purple-300 border border-slate-200 dark:border-slate-600 transition-colors cursor-pointer"
                                    >
                                      + {unassignedRoom.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-500">As alterações são aplicadas e salvas automaticamente no mapa.</span>
              <button
                onClick={() => setIsWingManagerOpen(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold cursor-pointer hover:opacity-90"
              >
                Concluir
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          HISTORY / UNDO STEPS MODAL
         ========================================== */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-amber-900 via-slate-900 to-slate-900 text-white flex items-center justify-between border-b border-amber-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-amber-100">Histórico de Modificações do Layout</h3>
                  <p className="text-xs text-amber-300/80">Restaure qualquer estado anterior da planta baixa ou desfazer alterações</p>
                </div>
              </div>

              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Bar inside Modal */}
            <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={layoutHistory.length === 0}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer ${
                    layoutHistory.length > 0
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Desfazer (Voltar 1 Etapa)</span>
                </button>

                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={layoutRedoStack.length === 0}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer ${
                    layoutRedoStack.length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Redo2 className="w-3.5 h-3.5" />
                  <span>Refazer Etapa</span>
                </button>
              </div>

              {layoutHistory.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
                >
                  Limpar Histórico
                </button>
              )}
            </div>

            {/* Steps List */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {layoutHistory.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Nenhum histórico de modificações registrado nesta sessão.</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Qualquer movimentação de equipamentos, criação ou redimensionamento de ambientes gera um ponto de restauração automático.</p>
                </div>
              ) : (
                layoutHistory.map((step, idx) => (
                  <div
                    key={step.id || idx}
                    className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 hover:border-amber-400 transition-colors shadow-2xs"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{step.description}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Horário: <span className="font-mono">{step.timestamp}</span> • {step.rooms?.length || 0} salas • {step.nodes?.length || 0} itens
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreToStep(idx)}
                      className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0"
                    >
                      Restaurar Esta Etapa
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Dica: Atalhos de teclado <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono font-bold">Ctrl+Z</kbd> e <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono font-bold">Ctrl+Y</kbd></span>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold cursor-pointer hover:opacity-90"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

// ====================================================================
// SUB-COMPONENT: INTERACTIVE MOVABLE SVG CANVAS WITH DRAG & DROP
// ====================================================================
interface MovableCanvasProps {
  nodes: TopologyNode[];
  rooms: EnvironmentRoom[];
  links: TopologyLink[];
  selectedNodeId: string | null;
  selectedNodeIds?: string[];
  selectedRoomId: string | null;
  selectedLinkId: string | null;
  connectingFromNodeId: string | null;
  onSelectNode: (id: string, isMulti?: boolean) => void;
  onSelectNodes?: (ids: string[]) => void;
  onSelectRoom: (id: string) => void;
  onSelectLink: (id: string) => void;
  onUpdateNodePosition: (id: string, x: number, y: number) => void;
  onUpdateNodePositions?: (updates: { id: string; x: number; y: number }[]) => void;
  onRotateGroup?: (targetIds: string[], angleDeg?: number) => void;
  onFlipGroupH?: (targetIds: string[]) => void;
  onFlipGroupV?: (targetIds: string[]) => void;
  onRotateGroupItemsInPlace?: (targetIds: string[], deg?: number) => void;
  onUpdateNodeSize?: (id: string, width: number, height: number) => void;
  onUpdateRoomPosition: (id: string, x: number, y: number) => void;
  onUpdateRoomSize: (id: string, width: number, height: number) => void;
  onUpdateLinkWaypoint: (linkId: string, index: number, x: number, y: number) => void;
  onAddLinkWaypoint: (linkId: string, x: number, y: number) => void;
  onStartConnecting: (nodeId: string) => void;
  onCancelConnecting: () => void;
  onContextMenu: (e: React.MouseEvent, targetType: 'canvas' | 'node' | 'room' | 'link', targetId?: string) => void;
  snapToGrid: boolean;
  gridSize: number;
  showCableLines: boolean;
  showQuadrantGuides?: boolean;
  toolboxOpen?: boolean;
  onToggleToolbox?: () => void;
  activeToolboxTab?: 'all' | 'discovery' | 'mapping' | 'tools';
  onSetActiveToolboxTab?: (tab: 'all' | 'discovery' | 'mapping' | 'tools') => void;
  onAddEquipment: (type: TopologyNodeType, x?: number, y?: number, roomId?: string) => void;
  onOpenAddRoom: () => void;
  onOpenDiscovery: () => void;
  onAutoAlign: () => void;
  onAutoFitNodes?: () => void;
  onOrganizeQuadrants?: () => void;
  onSaveLayout: () => void;
  onToggleDoorSwing?: (roomId: string) => void;
  onCycleDoorWall?: (roomId: string) => void;
  onSetDoorOffsetPreset?: (roomId: string, preset: 'start' | 'center' | 'end') => void;
  onUpdateRoomDoor?: (roomId: string, updates: Partial<EnvironmentRoom>) => void;
  onShowToast?: (msg: string) => void;
  wings?: CompanyWing[];
  selectedWingFilter?: string;
  showHeatmap?: boolean;
  heatmapMetric?: 'density' | 'status' | 'hybrid';
  heatmapIntensity?: number;
  hoveredHeatmapWingId?: string | null;
  onSetHoveredHeatmapWingId?: (wingId: string | null) => void;
  onToggleHeatmap?: () => void;
  onChangeHeatmapMetric?: (metric: 'density' | 'status' | 'hybrid') => void;
  onChangeHeatmapIntensity?: (val: number) => void;
  onOpenWingManager?: () => void;
  onOpenWingHeatmapTab?: () => void;
  onEditWing?: (wing: CompanyWing) => void;
  onAutoSequenceWings?: (wingId?: string) => void;
  onRecordHistorySnapshot?: (description: string) => void;
}

const InteractiveMovableCanvas: React.FC<MovableCanvasProps> = ({
  nodes,
  rooms,
  links,
  selectedNodeId,
  selectedNodeIds,
  selectedRoomId,
  selectedLinkId,
  connectingFromNodeId,
  onSelectNode,
  onSelectNodes,
  onSelectRoom,
  onSelectLink,
  onUpdateNodePosition,
  onUpdateNodePositions,
  onRotateGroup,
  onFlipGroupH,
  onFlipGroupV,
  onRotateGroupItemsInPlace,
  onUpdateNodeSize,
  onUpdateRoomPosition,
  onUpdateRoomSize,
  onUpdateLinkWaypoint,
  onAddLinkWaypoint,
  onStartConnecting,
  onCancelConnecting,
  onContextMenu,
  snapToGrid,
  gridSize,
  showCableLines,
  showQuadrantGuides = true,
  toolboxOpen = true,
  onToggleToolbox,
  activeToolboxTab = 'all',
  onSetActiveToolboxTab,
  onAddEquipment,
  onOpenAddRoom,
  onOpenDiscovery,
  onAutoAlign,
  onAutoFitNodes,
  onOrganizeQuadrants,
  onSaveLayout,
  onToggleDoorSwing,
  onCycleDoorWall,
  onSetDoorOffsetPreset,
  onUpdateRoomDoor,
  onShowToast,
  wings = [],
  selectedWingFilter = 'all',
  showHeatmap = false,
  heatmapMetric = 'density',
  heatmapIntensity = 0.75,
  hoveredHeatmapWingId = null,
  onSetHoveredHeatmapWingId,
  onToggleHeatmap,
  onChangeHeatmapMetric,
  onChangeHeatmapIntensity,
  onOpenWingManager,
  onOpenWingHeatmapTab,
  onEditWing,
  onAutoSequenceWings,
  onRecordHistorySnapshot
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [resizingNode, setResizingNode] = useState<{ nodeId: string; handle: 'se' | 'e' | 's' } | null>(null);
  const [draggingRoomId, setDraggingRoomId] = useState<string | null>(null);
  const [resizingRoom, setResizingRoom] = useState<{ roomId: string; handle: 'se' | 'e' | 's' } | null>(null);
  const [draggingWaypoint, setDraggingWaypoint] = useState<{ linkId: string; index: number } | null>(null);
  const [draggingDoorRoomId, setDraggingDoorRoomId] = useState<string | null>(null);
  const [draggingDoorAngleRoomId, setDraggingDoorAngleRoomId] = useState<string | null>(null);
  const [draggingRoomLabelId, setDraggingRoomLabelId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cursorSvgPos, setCursorSvgPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragGroupInitialPos = useRef<Record<string, { x: number; y: number }>>({});
  const dragStartCoords = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Filter rooms, wings, nodes and links dynamically based on selectedWingFilter
  const visibleRooms = useMemo(() => {
    return rooms.filter(r => r.activeOnMap && (selectedWingFilter === 'all' || r.wingId === selectedWingFilter));
  }, [rooms, selectedWingFilter]);

  const visibleRoomIds = useMemo(() => new Set(visibleRooms.map(r => r.id)), [visibleRooms]);

  const visibleWings = useMemo(() => {
    return wings.filter(w => selectedWingFilter === 'all' || w.id === selectedWingFilter);
  }, [wings, selectedWingFilter]);

  const visibleNodes = useMemo(() => {
    if (selectedWingFilter === 'all') return nodes;
    return nodes.filter(n => {
      if (n.roomId && visibleRoomIds.has(n.roomId)) return true;
      return visibleRooms.some(r => n.x >= r.x - 20 && n.x <= r.x + r.width + 20 && n.y >= r.y - 20 && n.y <= r.y + r.height + 20);
    });
  }, [nodes, selectedWingFilter, visibleRoomIds, visibleRooms]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);

  const visibleLinks = useMemo(() => {
    if (selectedWingFilter === 'all') return links;
    return links.filter(l => visibleNodeIds.has(l.fromNodeId) && visibleNodeIds.has(l.toNodeId));
  }, [links, selectedWingFilter, visibleNodeIds]);

  // Dynamically calculate viewBox dimensions ensuring symmetric padding on all sides including wing headers
  const boundMinX = visibleRooms.length > 0 || visibleNodes.length > 0 
    ? Math.min(...visibleRooms.map(r => r.x), ...visibleNodes.map(n => n.x)) 
    : 40;
  const boundMinY = visibleRooms.length > 0 || visibleNodes.length > 0 
    ? Math.min(...visibleRooms.map(r => r.y), ...visibleNodes.map(n => n.y)) 
    : 40;

  const boundMaxX = Math.max(900, ...visibleRooms.map(r => r.x + r.width), ...visibleNodes.map(n => n.x + (n.width || 60)));
  const boundMaxY = Math.max(550, ...visibleRooms.map(r => r.y + r.height), ...visibleNodes.map(n => n.y + (n.height || 50)));

  // Wing Enclosures add 45px padding on left/right/bottom and 66px on top
  const fullWingMaxX = boundMaxX + 45;
  const fullWingMaxY = boundMaxY + 45;

  const viewBoxWidth = Math.round(Math.max(1020, fullWingMaxX + Math.max(40, boundMinX - 45)));
  const viewBoxHeight = Math.round(Math.max(720, fullWingMaxY + Math.max(40, boundMinY - 66)));

  // Convert screen coordinates to dynamic SVG coordinates
  const getSvgCoordinates = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const transformed = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: transformed.x, y: transformed.y };
  };

  // Mouse / Pointer Down on Node
  const handlePointerDownNode = (nodeId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    if (connectingFromNodeId && connectingFromNodeId !== nodeId) {
      onSelectNode(nodeId);
      return;
    }

    const isMultiKey = e.shiftKey || e.ctrlKey || e.metaKey;
    const currentSelected = selectedNodeIds || (selectedNodeId ? [selectedNodeId] : []);

    if (isMultiKey) {
      onSelectNode(nodeId, true);
      return;
    }

    let activeSelectedIds = currentSelected;
    if (!currentSelected.includes(nodeId)) {
      onSelectNode(nodeId, false);
      activeSelectedIds = [nodeId];
    }

    setDraggingNodeId(nodeId);
    const coords = getSvgCoordinates(e.clientX, e.clientY);
    dragStartCoords.current = coords;

    const initPos: Record<string, { x: number; y: number }> = {};
    activeSelectedIds.forEach(id => {
      const n = nodes.find(item => item.id === id);
      if (n) initPos[id] = { x: n.x, y: n.y };
    });
    dragGroupInitialPos.current = initPos;

    const primaryNode = nodes.find(n => n.id === nodeId);
    if (primaryNode) {
      if (onRecordHistorySnapshot) {
        onRecordHistorySnapshot(`Moveu '${primaryNode.name || nodeId}'`);
      }
      setDragOffset({
        x: coords.x - primaryNode.x,
        y: coords.y - primaryNode.y
      });
    }

    (e.target as Element).setPointerCapture(e.pointerId);
  };

  // Pointer Down on Node Resize Handle (Corner 'se', Right edge 'e', Bottom edge 's')
  const handlePointerDownResizeNode = (nodeId: string, handle: 'se' | 'e' | 's', e: React.PointerEvent) => {
    e.stopPropagation();
    onSelectNode(nodeId);
    setResizingNode({ nodeId, handle });

    const coords = getSvgCoordinates(e.clientX, e.clientY);
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const currentW = (node.width || (node.type === 'desk' ? 70 : node.type === 'chair' ? 68 : node.type === 'simple_chair' ? 56 : node.type === 'workstation' ? 83 : node.type === 'printer' ? 90 : node.type === 'table' ? 100 : 50)) * 0.5;
    const currentH = (node.height || (node.type === 'desk' ? 44 : node.type === 'chair' ? 68 : node.type === 'simple_chair' ? 56 : node.type === 'workstation' ? 56 : node.type === 'printer' ? 80 : node.type === 'table' ? 54 : 40)) * 0.5;

    setDragOffset({
      x: coords.x - currentW,
      y: coords.y - currentH
    });

    (e.target as Element).setPointerCapture(e.pointerId);
  };

  // Pointer Down on Room Header/Body (Move Room)
  const handlePointerDownRoom = (roomId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    onSelectRoom(roomId);
    setDraggingRoomId(roomId);

    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    if (onRecordHistorySnapshot) {
      onRecordHistorySnapshot(`Moveu ambiente '${room.name}'`);
    }

    const coords = getSvgCoordinates(e.clientX, e.clientY);
    setDragOffset({
      x: coords.x - room.x,
      y: coords.y - room.y
    });

    (e.target as Element).setPointerCapture(e.pointerId);
  };

  // Pointer Down on Room Label Badge (Move Label Freely)
  const handlePointerDownRoomLabel = (roomId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    onSelectRoom(roomId);
    setDraggingRoomLabelId(roomId);

    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    if (onRecordHistorySnapshot) {
      onRecordHistorySnapshot(`Moveu rótulo da sala '${room.name}'`);
    }

    const coords = getSvgCoordinates(e.clientX, e.clientY);
    const labelX = room.x + (room.labelOffsetX ?? room.width / 2);
    const labelY = room.y + (room.labelOffsetY ?? room.height / 2);

    setDragOffset({
      x: coords.x - labelX,
      y: coords.y - labelY
    });

    (e.target as Element).setPointerCapture(e.pointerId);
  };

  // Pointer Down on Room Resize Handle (Corner 'se', Right edge 'e', Bottom edge 's')
  const handlePointerDownResizeRoom = (roomId: string, handle: 'se' | 'e' | 's', e: React.PointerEvent) => {
    e.stopPropagation();
    onSelectRoom(roomId);
    setResizingRoom({ roomId, handle });

    const coords = getSvgCoordinates(e.clientX, e.clientY);
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    if (onRecordHistorySnapshot) {
      onRecordHistorySnapshot(`Redimensionou ambiente '${room.name}'`);
    }

    setDragOffset({
      x: coords.x - (room.width || 200),
      y: coords.y - (room.height || 160)
    });

    (e.target as Element).setPointerCapture(e.pointerId);
  };

  // Pointer Down on Link Waypoint
  const handlePointerDownWaypoint = (linkId: string, index: number, e: React.PointerEvent) => {
    e.stopPropagation();
    onSelectLink(linkId);
    if (onRecordHistorySnapshot) {
      onRecordHistorySnapshot('Moveu curva do cabo de rede');
    }
    setDraggingWaypoint({ linkId, index });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  // Pointer Down on Door Threshold (Move Door along/between walls)
  const handlePointerDownDoor = (roomId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    onSelectRoom(roomId);
    setDraggingDoorRoomId(roomId);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  // Pointer Down on Door Leaf Angle Knob (Adjust opening angle & direction)
  const handlePointerDownDoorAngle = (roomId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    onSelectRoom(roomId);
    setDraggingDoorAngleRoomId(roomId);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  // Pointer Move on SVG Canvas
  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = getSvgCoordinates(e.clientX, e.clientY);
    setCursorSvgPos(coords);

    // 1. Moving Node or Group of Nodes
    if (draggingNodeId) {
      let dx = coords.x - dragStartCoords.current.x;
      let dy = coords.y - dragStartCoords.current.y;

      if (snapToGrid) {
        dx = Math.round(dx / gridSize) * gridSize;
        dy = Math.round(dy / gridSize) * gridSize;
      }

      const activeGroupIds = Object.keys(dragGroupInitialPos.current);
      if (activeGroupIds.length > 1 && onUpdateNodePositions) {
        const updates = activeGroupIds.map(id => {
          const init = dragGroupInitialPos.current[id];
          const newX = Math.max(10, Math.min(viewBoxWidth - 70, init.x + dx));
          const newY = Math.max(10, Math.min(viewBoxHeight - 60, init.y + dy));
          return { id, x: newX, y: newY };
        });
        onUpdateNodePositions(updates);
      } else {
        const primaryInit = dragGroupInitialPos.current[draggingNodeId];
        const baseNewX = primaryInit ? primaryInit.x + dx : coords.x - dragOffset.x;
        const baseNewY = primaryInit ? primaryInit.y + dy : coords.y - dragOffset.y;
        let newX = Math.max(10, Math.min(viewBoxWidth - 70, baseNewX));
        let newY = Math.max(10, Math.min(viewBoxHeight - 60, baseNewY));
        onUpdateNodePosition(draggingNodeId, newX, newY);
      }
    }

    if (selectionBox) {
      setSelectionBox(prev => prev ? { ...prev, currentX: coords.x, currentY: coords.y } : null);
    }

    // 1.1 Resizing Equipment / Furniture Node
    if (resizingNode && onUpdateNodeSize) {
      const node = nodes.find(n => n.id === resizingNode.nodeId);
      if (node) {
        let newOrigWidth = node.width || (node.type === 'desk' ? 70 : node.type === 'chair' ? 68 : node.type === 'simple_chair' ? 56 : node.type === 'workstation' ? 83 : node.type === 'printer' ? 90 : node.type === 'table' ? 100 : 50);
        let newOrigHeight = node.height || (node.type === 'desk' ? 44 : node.type === 'chair' ? 68 : node.type === 'simple_chair' ? 56 : node.type === 'workstation' ? 56 : node.type === 'printer' ? 80 : node.type === 'table' ? 54 : 40);

        if (resizingNode.handle === 'se' || resizingNode.handle === 'e') {
          const scaledW = Math.max(8, coords.x - node.x);
          newOrigWidth = Math.round(scaledW / 0.5);
          if (snapToGrid) {
            newOrigWidth = Math.round(newOrigWidth / (gridSize * 2)) * (gridSize * 2);
          }
        }

        if (resizingNode.handle === 'se' || resizingNode.handle === 's') {
          const scaledH = Math.max(8, coords.y - node.y);
          newOrigHeight = Math.round(scaledH / 0.5);
          if (snapToGrid) {
            newOrigHeight = Math.round(newOrigHeight / (gridSize * 2)) * (gridSize * 2);
          }
        }

        onUpdateNodeSize(resizingNode.nodeId, Math.max(16, Math.min(800, newOrigWidth)), Math.max(16, Math.min(800, newOrigHeight)));
      }
    }

    // 2. Moving Room with Precision 10px Gap & Magnetic Wall Snapping
    if (draggingRoomId) {
      let newX = coords.x - dragOffset.x;
      let newY = coords.y - dragOffset.y;

      if (snapToGrid) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }

      const ROOM_SNAP_GAP = 10; // Standard uniform wall-to-wall gap (10px) as requested
      const SNAP_THRESH = 18; // Attraction threshold range in pixels
      const dragRoom = rooms.find(r => r.id === draggingRoomId);
      const dragW = dragRoom?.width || 200;
      const dragH = dragRoom?.height || 160;

      // Magnetic snap to neighboring active rooms
      rooms.filter(r => r.id !== draggingRoomId && r.activeOnMap).forEach(otherRoom => {
        const otherRight = otherRoom.x + otherRoom.width;
        const otherBottom = otherRoom.y + otherRoom.height;

        // --- GAP SNAPPING (10px standard corridor/wall space) ---
        // Snap dragging room's RIGHT wall to left of otherRoom's LEFT wall with 10px gap
        if (Math.abs((newX + dragW + ROOM_SNAP_GAP) - otherRoom.x) < SNAP_THRESH) {
          newX = otherRoom.x - dragW - ROOM_SNAP_GAP;
        }
        // Snap dragging room's LEFT wall to right of otherRoom's RIGHT wall with 10px gap
        if (Math.abs(newX - (otherRight + ROOM_SNAP_GAP)) < SNAP_THRESH) {
          newX = otherRight + ROOM_SNAP_GAP;
        }
        // Snap dragging room's BOTTOM wall to top of otherRoom's TOP wall with 10px gap
        if (Math.abs((newY + dragH + ROOM_SNAP_GAP) - otherRoom.y) < SNAP_THRESH) {
          newY = otherRoom.y - dragH - ROOM_SNAP_GAP;
        }
        // Snap dragging room's TOP wall to bottom of otherRoom's BOTTOM wall with 10px gap
        if (Math.abs(newY - (otherBottom + ROOM_SNAP_GAP)) < SNAP_THRESH) {
          newY = otherBottom + ROOM_SNAP_GAP;
        }

        // --- FLUSH ALIGNMENTS (0px offset - perfectly aligned outer edges) ---
        // Align LEFT edges
        if (Math.abs(newX - otherRoom.x) < SNAP_THRESH) {
          newX = otherRoom.x;
        }
        // Align RIGHT edges
        if (Math.abs((newX + dragW) - otherRight) < SNAP_THRESH) {
          newX = otherRight - dragW;
        }
        // Align TOP edges
        if (Math.abs(newY - otherRoom.y) < SNAP_THRESH) {
          newY = otherRoom.y;
        }
        // Align BOTTOM edges
        if (Math.abs((newY + dragH) - otherBottom) < SNAP_THRESH) {
          newY = otherBottom - dragH;
        }
      });

      newX = Math.max(45, Math.min(viewBoxWidth - 100, newX));
      newY = Math.max(70, Math.min(viewBoxHeight - 80, newY));

      onUpdateRoomPosition(draggingRoomId, newX, newY);
    }

    // 3. Resizing Room with Magnetic Snapping
    if (resizingRoom) {
      const room = rooms.find(r => r.id === resizingRoom.roomId);
      if (room) {
        let newWidth = room.width || 200;
        let newHeight = room.height || 160;
        const ROOM_SNAP_GAP = 10;
        const SNAP_THRESH = 18;

        if (resizingRoom.handle === 'se' || resizingRoom.handle === 'e') {
          newWidth = Math.max(30, coords.x - room.x);
          if (snapToGrid) {
            newWidth = Math.round(newWidth / gridSize) * gridSize;
          }
          // Magnetic snap resizing to adjacent rooms
          rooms.filter(r => r.id !== resizingRoom.roomId && r.activeOnMap).forEach(otherRoom => {
            const otherRight = otherRoom.x + otherRoom.width;
            // Snap right edge to other room's left edge with 10px gap
            if (Math.abs((room.x + newWidth + ROOM_SNAP_GAP) - otherRoom.x) < SNAP_THRESH) {
              newWidth = otherRoom.x - ROOM_SNAP_GAP - room.x;
            }
            // Snap right edge to other room's right edge (aligned)
            if (Math.abs((room.x + newWidth) - otherRight) < SNAP_THRESH) {
              newWidth = otherRight - room.x;
            }
          });
        }

        if (resizingRoom.handle === 'se' || resizingRoom.handle === 's') {
          newHeight = Math.max(30, coords.y - room.y);
          if (snapToGrid) {
            newHeight = Math.round(newHeight / gridSize) * gridSize;
          }
          // Magnetic snap resizing to adjacent rooms
          rooms.filter(r => r.id !== resizingRoom.roomId && r.activeOnMap).forEach(otherRoom => {
            const otherBottom = otherRoom.y + otherRoom.height;
            // Snap bottom edge to other room's top edge with 10px gap
            if (Math.abs((room.y + newHeight + ROOM_SNAP_GAP) - otherRoom.y) < SNAP_THRESH) {
              newHeight = otherRoom.y - ROOM_SNAP_GAP - room.y;
            }
            // Snap bottom edge to other room's bottom edge (aligned)
            if (Math.abs((room.y + newHeight) - otherBottom) < SNAP_THRESH) {
              newHeight = otherBottom - room.y;
            }
          });
        }

        onUpdateRoomSize(resizingRoom.roomId, Math.max(30, newWidth), Math.max(30, newHeight));
      }
    }

    // 4. Moving Cable Waypoint
    if (draggingWaypoint) {
      let wpX = coords.x;
      let wpY = coords.y;

      if (snapToGrid) {
        wpX = Math.round(wpX / gridSize) * gridSize;
        wpY = Math.round(wpY / gridSize) * gridSize;
      }

      onUpdateLinkWaypoint(draggingWaypoint.linkId, draggingWaypoint.index, wpX, wpY);
    }

    // 5. Dragging Door Along and Across Walls
    if (draggingDoorRoomId && onUpdateRoomDoor) {
      const room = rooms.find(r => r.id === draggingDoorRoomId);
      if (room) {
        const rw = room.width || 200;
        const rh = room.height || 160;
        const dw = room.doorWidth || 32;

        const distBottom = Math.abs(coords.y - (room.y + rh));
        const distTop = Math.abs(coords.y - room.y);
        const distLeft = Math.abs(coords.x - room.x);
        const distRight = Math.abs(coords.x - (room.x + rw));

        const minDist = Math.min(distBottom, distTop, distLeft, distRight);
        let targetWall: DoorWall = room.doorWall || 'bottom';
        let rawOffset = 25;
        let wallLen = rw;

        if (minDist === distBottom) {
          targetWall = 'bottom';
          wallLen = rw;
          rawOffset = coords.x - room.x - dw / 2;
        } else if (minDist === distTop) {
          targetWall = 'top';
          wallLen = rw;
          rawOffset = coords.x - room.x - dw / 2;
        } else if (minDist === distLeft) {
          targetWall = 'left';
          wallLen = rh;
          rawOffset = coords.y - room.y - dw / 2;
        } else if (minDist === distRight) {
          targetWall = 'right';
          wallLen = rh;
          rawOffset = coords.y - room.y - dw / 2;
        }

        if (snapToGrid) {
          rawOffset = Math.round(rawOffset / gridSize) * gridSize;
        }

        const clampedOffset = Math.max(10, Math.min(wallLen - dw - 10, rawOffset));
        onUpdateRoomDoor(draggingDoorRoomId, {
          doorWall: targetWall,
          doorOffset: Math.round(clampedOffset)
        });
      }
    }

    // 6. Dragging Door Opening Angle & Swing Orientation
    if (draggingDoorAngleRoomId && onUpdateRoomDoor) {
      const room = rooms.find(r => r.id === draggingDoorAngleRoomId);
      if (room) {
        const doorGeo = getRoomDoorGeometry(room);
        if (doorGeo) {
          const hingeX = doorGeo.hinge.x;
          const hingeY = doorGeo.hinge.y;
          const wall = doorGeo.wall;
          const isHingeAtStart = doorGeo.swing.endsWith('left');

          const dx = coords.x - hingeX;
          const dy = coords.y - hingeY;
          const dist = Math.hypot(dx, dy);

          if (dist > 4) {
            let angleDeg = 90;
            let isInside = true;

            if (wall === 'bottom') {
              isInside = dy < 0;
              const baseSign = isHingeAtStart ? 1 : -1;
              const dot = (dx * baseSign) / dist;
              angleDeg = Math.round((Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI);
            } else if (wall === 'top') {
              isInside = dy > 0;
              const baseSign = isHingeAtStart ? 1 : -1;
              const dot = (dx * baseSign) / dist;
              angleDeg = Math.round((Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI);
            } else if (wall === 'left') {
              isInside = dx > 0;
              const baseSign = isHingeAtStart ? 1 : -1;
              const dot = (dy * baseSign) / dist;
              angleDeg = Math.round((Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI);
            } else if (wall === 'right') {
              isInside = dx < 0;
              const baseSign = isHingeAtStart ? 1 : -1;
              const dot = (dy * baseSign) / dist;
              angleDeg = Math.round((Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI);
            }

            // Snapping to common angles
            if (Math.abs(angleDeg - 90) < 6) angleDeg = 90;
            else if (Math.abs(angleDeg - 45) < 5) angleDeg = 45;
            else if (Math.abs(angleDeg - 30) < 5) angleDeg = 30;
            else if (Math.abs(angleDeg - 60) < 5) angleDeg = 60;
            else if (Math.abs(angleDeg - 120) < 5) angleDeg = 120;
            else if (Math.abs(angleDeg - 135) < 5) angleDeg = 135;

            const clampedAngle = Math.max(10, Math.min(170, angleDeg));
            const newSwing: DoorSwing = `${isInside ? 'inside' : 'outside'}-${isHingeAtStart ? 'left' : 'right'}` as DoorSwing;

            onUpdateRoomDoor(draggingDoorAngleRoomId, {
              doorAngle: clampedAngle,
              doorSwing: newSwing
            });
          }
        }
      }
    }

    // 7. Dragging Room Label Freely
    if (draggingRoomLabelId && onUpdateRoomDoor) {
      const room = rooms.find(r => r.id === draggingRoomLabelId);
      if (room) {
        let newAbsX = coords.x - dragOffset.x;
        let newAbsY = coords.y - dragOffset.y;

        if (snapToGrid) {
          newAbsX = Math.round(newAbsX / gridSize) * gridSize;
          newAbsY = Math.round(newAbsY / gridSize) * gridSize;
        }

        const newOffsetX = newAbsX - room.x;
        const newOffsetY = newAbsY - room.y;

        onUpdateRoomDoor(draggingRoomLabelId, {
          labelOffsetX: Math.round(newOffsetX),
          labelOffsetY: Math.round(newOffsetY)
        });
      }
    }
  };

  // Canvas Pointer Down for Marquee Selection Box
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    // Clear room and link selections when clicking canvas background
    onSelectRoom('');
    onSelectLink('');
    const coords = getSvgCoordinates(e.clientX, e.clientY);
    setSelectionBox({
      startX: coords.x,
      startY: coords.y,
      currentX: coords.x,
      currentY: coords.y
    });
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignored
    }

    if (selectionBox) {
      const minX = Math.min(selectionBox.startX, selectionBox.currentX);
      const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
      const minY = Math.min(selectionBox.startY, selectionBox.currentY);
      const maxY = Math.max(selectionBox.startY, selectionBox.currentY);

      if (maxX - minX > 8 && maxY - minY > 8) {
        const enclosedNodeIds = visibleNodes
          .filter(n => n.x >= minX - 10 && n.x <= maxX && n.y >= minY - 10 && n.y <= maxY)
          .map(n => n.id);

        if (enclosedNodeIds.length > 0 && onSelectNodes) {
          onSelectNodes(enclosedNodeIds);
          if (onShowToast) onShowToast(`🎯 ${enclosedNodeIds.length} objeto(s) selecionado(s) na área!`);
        } else if (onSelectNodes) {
          onSelectNodes([]);
        }
      }
      setSelectionBox(null);
    }

    setDraggingNodeId(null);
    setResizingNode(null);
    setDraggingRoomId(null);
    setResizingRoom(null);
    setDraggingWaypoint(null);
    setDraggingDoorRoomId(null);
    setDraggingDoorAngleRoomId(null);
    setDraggingRoomLabelId(null);
  };

  // Connecting Node Reference
  const connectingNode = connectingFromNodeId ? nodes.find(n => n.id === connectingFromNodeId) : null;
  const connectingNodeX = connectingNode ? connectingNode.x + ((connectingNode.width || 40) * 0.5) / 2 : 0;
  const connectingNodeY = connectingNode ? connectingNode.y + ((connectingNode.height || 40) * 0.5) / 2 : 0;

  return (
    <div className="w-full bg-[#f8fafc] dark:bg-[#020617] rounded-xl p-3 border border-slate-300 dark:border-slate-800 shadow-inner select-none font-sans relative">
      <svg 
        ref={svgRef}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} 
        className="w-full h-auto drop-shadow-md cursor-crosshair touch-none transition-all duration-75"
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <defs>
          {/* Cable Tray Pattern */}
          <pattern id="cableTrayPattern" width="8" height="8" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="8" y2="8" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
            <line x1="8" y1="0" x2="0" y2="8" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
          </pattern>

          {/* Subtle CAD Grid */}
          <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="20" y2="0" stroke="#cbd5e1" strokeWidth="0.3" opacity="0.4" />
            <line x1="0" y1="0" x2="0" y2="20" stroke="#cbd5e1" strokeWidth="0.3" opacity="0.4" />
          </pattern>

          {/* 1. 3D Earth Globe Radial Gradient */}
          <radialGradient id="globeGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="40%" stopColor="#0284c7" />
            <stop offset="85%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>

          {/* 2. Blue Hub Switch Metallic Gradient */}
          <linearGradient id="switchGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>

          {/* 3. White Router Metallic Body Gradient */}
          <linearGradient id="routerWhiteGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* 3b. Blue Router Body Gradient */}
          <linearGradient id="routerGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#075985" />
          </linearGradient>

          {/* 4. Dark Wi-Fi Router Metallic Gradient */}
          <linearGradient id="wifiDarkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="60%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* 5. Server Tower Glossy Dark Cabinet Gradient */}
          <linearGradient id="serverDarkGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="15%" stopColor="#1e293b" />
            <stop offset="80%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* 6. Client Monitor Glossy Blue Display Screen Gradient */}
          <linearGradient id="screenBlueGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00a3ff" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>

          {/* 7. Printer Gray Metallic / Office Body Gradient */}
          <linearGradient id="printerGrayGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="40%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="printerDarkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="40%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* 8. Nobreak UPS Dark Chassis Gradient */}
          <linearGradient id="upsDarkGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="25%" stopColor="#0f172a" />
            <stop offset="80%" stopColor="#090d16" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* 9. Camera Metallic Gradient */}
          <linearGradient id="cameraDarkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="40%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* 10. VoIP Desk Phone Body Gradient */}
          <linearGradient id="voipBodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2e1065" />
            <stop offset="50%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* 11. Modern White Office Desk Surface Gradient */}
          <linearGradient id="deskSurfaceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#fafafa" />
            <stop offset="70%" stopColor="#f4f4f6" />
            <stop offset="100%" stopColor="#e5e7eb" />
          </linearGradient>

          {/* 12. Pure White Modern Desk Bevel/Chamfer Edge Gradient */}
          <linearGradient id="deskWhiteEdgeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* 13. Ergonomic Office Chair Mesh/Leather Gradient */}
          <linearGradient id="chairLeatherGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="40%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>

          {/* 14. Meeting Conference Table Gradient */}
          <linearGradient id="meetingTableGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbfbfa" />
            <stop offset="25%" stopColor="#f3f4f6" />
            <stop offset="75%" stopColor="#e5e7eb" />
            <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>

          {/* 15. Dark Mesh Ergonomic Chair */}
          <linearGradient id="chairDarkMeshGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="40%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Active Selection Halo Filter */}
          <filter id="selectionGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.8" />
          </filter>

          {/* Heatmap Blur Filters */}
          <filter id="wingHeatBlurFilter" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="32" result="blur" />
          </filter>
          <filter id="nodeHeatBlurFilter" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="18" result="blur" />
          </filter>
        </defs>

        {/* CAD Grid Background */}
        <rect width={viewBoxWidth} height={viewBoxHeight} fill="url(#cadGrid)" />

        {/* ============================================================== */}
        {/* COMPANY WINGS / UNIDADES ENCLOSURES & PERIMETERS */}
        {/* ============================================================== */}
        {visibleWings.map(wing => {
          const wingRooms = rooms.filter(r => r.activeOnMap && r.wingId === wing.id);
          if (wingRooms.length === 0) return null;

          // Padding seguro e simétrico para evitar qualquer estouro ou colisão nos cantos e extremidades
          const PADDING_SIDE = 36;
          const PADDING_TOP = 52; // Espaço superior seguro para acomodar o banner de 28px + respiro até a primeira sala
          const PADDING_BOTTOM = 36;

          const rawMinX = Math.min(...wingRooms.map(r => r.x));
          const rawMinY = Math.min(...wingRooms.map(r => r.y));
          const rawMaxX = Math.max(...wingRooms.map(r => r.x + r.width));
          const rawMaxY = Math.max(...wingRooms.map(r => r.y + r.height));

          const minX = rawMinX - PADDING_SIDE;
          const minY = Math.max(28, rawMinY - PADDING_TOP);
          const maxX = rawMaxX + PADDING_SIDE;
          const maxY = rawMaxY + PADDING_BOTTOM;

          const wWidth = maxX - minX;
          const wHeight = maxY - minY;

          const isWingDimmed = selectedWingFilter !== 'all' && selectedWingFilter !== wing.id;

          const wingRoomIds = new Set(wingRooms.map(r => r.id));
          const wingNodes = nodes.filter(n => (n.roomId && wingRoomIds.has(n.roomId)) || wingRooms.some(r => n.x >= r.x - 20 && n.x <= r.x + r.width + 20 && n.y >= r.y - 20 && n.y <= r.y + r.height + 20));
          const totalAssets = wingNodes.length;
          const onlineCount = wingNodes.filter(n => n.details?.status === 'online').length;
          const warningCount = wingNodes.filter(n => n.details?.status === 'warning').length;
          const offlineCount = wingNodes.filter(n => n.details?.status === 'offline').length;
          const healthPct = totalAssets > 0 ? Math.round((onlineCount / totalAssets) * 100) : 100;

          let heatColor = '#10b981';
          if (heatmapMetric === 'density') {
            if (totalAssets === 0) heatColor = '#64748b';
            else if (totalAssets <= 2) heatColor = '#10b981';
            else if (totalAssets <= 5) heatColor = '#0284c7';
            else if (totalAssets <= 8) heatColor = '#f59e0b';
            else heatColor = '#ef4444';
          } else if (heatmapMetric === 'status') {
            if (offlineCount > 0) heatColor = '#ef4444';
            else if (warningCount > 0) heatColor = '#f59e0b';
            else if (totalAssets > 0) heatColor = '#10b981';
            else heatColor = '#64748b';
          } else {
            if (offlineCount > 0) heatColor = '#ef4444';
            else if (warningCount > 0) heatColor = '#f97316';
            else if (totalAssets > 6) heatColor = '#d946ef';
            else if (totalAssets > 2) heatColor = '#0284c7';
            else heatColor = '#10b981';
          }

          const nameWidth = wing.name.length * 8 + 48;
          const bannerWidth = Math.min(Math.max(120, nameWidth), Math.max(140, wWidth - 20));
          const totalHeaderWidth = showHeatmap ? bannerWidth + 6 + 220 : bannerWidth;
          const headerX = minX + Math.max(0, (wWidth - totalHeaderWidth) / 2);
          const headerY = Math.max(14, minY - 14);

          return (
            <g 
              key={`wing_boundary_${wing.id}`} 
              opacity={isWingDimmed ? 0.2 : 1} 
              className="transition-all duration-300"
            >
              {/* Heatmap Wing Thermal Glow Layer */}
              {showHeatmap && (
                <rect
                  x={minX - 10}
                  y={minY - 10}
                  width={wWidth + 20}
                  height={wHeight + 20}
                  rx="22"
                  fill={heatColor}
                  fillOpacity={0.35 * heatmapIntensity}
                  filter="url(#wingHeatBlurFilter)"
                />
              )}

              {/* Node Thermal Heat Points */}
              {showHeatmap && wingNodes.map(node => {
                const nodeStatus = node.details?.status || 'online';
                const nodeHeatColor = nodeStatus === 'offline' ? '#ef4444' : nodeStatus === 'warning' ? '#f59e0b' : '#10b981';

                return (
                  <circle
                    key={`node_heat_${node.id}`}
                    cx={node.x + node.width / 2}
                    cy={node.y + node.height / 2}
                    r={32 + (nodeStatus === 'offline' ? 12 : 0)}
                    fill={nodeHeatColor}
                    fillOpacity={0.55 * heatmapIntensity}
                    filter="url(#nodeHeatBlurFilter)"
                  />
                );
              })}

              {/* Background fill & dashed perimeter box */}
              <rect
                x={minX}
                y={minY}
                width={wWidth}
                height={wHeight}
                rx="16"
                fill={wing.color}
                fillOpacity="0.04"
                stroke={showHeatmap ? heatColor : wing.color}
                strokeWidth={showHeatmap ? "2.5" : "2"}
                strokeDasharray={showHeatmap ? undefined : "6 4"}
              />

              {/* Wing Header Banner (Centered horizontally on top edge) */}
              <g transform={`translate(${headerX}, ${headerY})`}>
                <rect
                  x="0"
                  y="0"
                  width={bannerWidth}
                  height="28"
                  rx="14"
                  fill={wing.color}
                  className="shadow-md"
                />
                
                <circle cx="14" cy="14" r="4" fill="#ffffff" />
                
                <text
                  x="26"
                  y="18"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="bold"
                  className="font-sans"
                >
                  {wing.name}
                </text>
              </g>

              {/* Thermal Heatmap Badge for Wing */}
              {showHeatmap && (
                <g transform={`translate(${headerX + bannerWidth + 6}, ${headerY + 1})`}>
                  <rect
                    x="0"
                    y="0"
                    width="220"
                    height="26"
                    rx="6"
                    fill="#0f172a"
                    fillOpacity="0.9"
                    stroke={heatColor}
                    strokeWidth="1.5"
                  />
                  <circle cx="10" cy="13" r="4" fill={heatColor} />
                  <text
                    x="20"
                    y="17"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="bold"
                    className="font-sans"
                  >
                    🔥 {totalAssets} Ativos • {healthPct}% Online {offlineCount > 0 ? `(${offlineCount} Off)` : ''}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* ============================================================== */}
        {/* DYNAMIC REGISTERED ROOMS (INTERACTIVE: DRAG, RESIZE, SELECT, RIGHT-CLICK) */}
        {/* ============================================================== */}
        {visibleRooms.map(r => {
          const isRoomSelected = selectedRoomId === r.id;
          const isRoomDragging = draggingRoomId === r.id;

          return (
            <g 
              key={r.id}
              className="cursor-move"
              onPointerDown={(e) => handlePointerDownRoom(r.id, e)}
              onContextMenu={(e) => {
                e.stopPropagation();
                onContextMenu(e, 'room', r.id);
              }}
            >
              {/* Room Perimeter Wall */}
              <rect
                x={r.x}
                y={r.y}
                width={r.width}
                height={r.height}
                fill={r.category === 'datacenter' ? 'rgba(30, 41, 59, 0.08)' : r.category === 'meeting' ? 'rgba(5, 150, 105, 0.06)' : r.category === 'rack_room' ? 'rgba(2, 132, 199, 0.06)' : 'rgba(37, 99, 235, 0.05)'}
                stroke={isRoomSelected ? '#3b82f6' : (r.wallColor || '#2563eb')}
                strokeWidth={isRoomSelected ? '4' : '3'}
                strokeDasharray={isRoomSelected ? '6 3' : undefined}
                rx="6"
              />

              {/* Architectural Doorway on Wall Line (Drag-to-move along walls, drag-leaf-end to set angle) */}
              {(() => {
                const doorGeo = getRoomDoorGeometry(r);
                if (!doorGeo) return null;
                const isDoorAngleActive = draggingDoorAngleRoomId === r.id;
                const isDoorMoveActive = draggingDoorRoomId === r.id;

                return (
                  <g 
                    className="group/door"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onSelectRoom(r.id);
                      if (onToggleDoorSwing) onToggleDoorSwing(r.id);
                    }}
                  >
                    {/* Wall Opening Gap / Threshold (Masks the wall segment & provides drag-to-move handle) */}
                    <line
                      x1={doorGeo.threshold.x1}
                      y1={doorGeo.threshold.y1}
                      x2={doorGeo.threshold.x2}
                      y2={doorGeo.threshold.y2}
                      stroke="#ffffff"
                      strokeWidth="6"
                      strokeLinecap="butt"
                      className="cursor-move"
                      onPointerDown={(e) => handlePointerDownDoor(r.id, e)}
                    />
                    <line
                      x1={doorGeo.threshold.x1}
                      y1={doorGeo.threshold.y1}
                      x2={doorGeo.threshold.x2}
                      y2={doorGeo.threshold.y2}
                      stroke={isDoorMoveActive ? "#3b82f6" : "#94a3b8"}
                      strokeWidth="2"
                      strokeDasharray="2 2"
                      className="cursor-move"
                      onPointerDown={(e) => handlePointerDownDoor(r.id, e)}
                    />

                    {/* Door Frame Jambs (Batentes Estruturais) */}
                    <rect
                      x={doorGeo.jamb1.x}
                      y={doorGeo.jamb1.y}
                      width={doorGeo.jamb1.w}
                      height={doorGeo.jamb1.h}
                      fill="#334155"
                      rx="1"
                      className="cursor-move"
                      onPointerDown={(e) => handlePointerDownDoor(r.id, e)}
                    />
                    <rect
                      x={doorGeo.jamb2.x}
                      y={doorGeo.jamb2.y}
                      width={doorGeo.jamb2.w}
                      height={doorGeo.jamb2.h}
                      fill="#334155"
                      rx="1"
                      className="cursor-move"
                      onPointerDown={(e) => handlePointerDownDoor(r.id, e)}
                    />

                    {/* Door Opening Arc (Raio de Giro e Abertura) */}
                    <path
                      d={doorGeo.arcPath}
                      fill={isDoorAngleActive ? "rgba(59, 130, 246, 0.16)" : "rgba(59, 130, 246, 0.08)"}
                      stroke={isDoorAngleActive ? "#2563eb" : isRoomSelected ? "#3b82f6" : "#64748b"}
                      strokeWidth={isDoorAngleActive ? "2" : "1.5"}
                      strokeDasharray={isDoorAngleActive ? "2 2" : "3 3"}
                    />

                    {/* Door Leaf (Folha da Porta) */}
                    <line
                      x1={doorGeo.hinge.x}
                      y1={doorGeo.hinge.y}
                      x2={doorGeo.leafEnd.x}
                      y2={doorGeo.leafEnd.y}
                      stroke={isDoorAngleActive ? "#1d4ed8" : isRoomSelected ? "#2563eb" : (r.wallColor || "#1e293b")}
                      strokeWidth={isDoorAngleActive ? "4" : "3.5"}
                      strokeLinecap="round"
                      className="cursor-grab active:cursor-grabbing"
                      onPointerDown={(e) => handlePointerDownDoorAngle(r.id, e)}
                    />

                    {/* Pivot / Dobradiça */}
                    <circle
                      cx={doorGeo.hinge.x}
                      cy={doorGeo.hinge.y}
                      r="3.5"
                      fill={isRoomSelected ? "#2563eb" : "#0f172a"}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleDoorSwing) onToggleDoorSwing(r.id);
                      }}
                    />

                    {/* Leaf Tip Angle Rotation Handle (Drag to adjust angle smoothly) */}
                    <g
                      className="cursor-grab active:cursor-grabbing"
                      onPointerDown={(e) => handlePointerDownDoorAngle(r.id, e)}
                    >
                      {/* Transparent larger hitbox */}
                      <circle
                        cx={doorGeo.leafEnd.x}
                        cy={doorGeo.leafEnd.y}
                        r="10"
                        fill="transparent"
                      />
                      {/* Outer glow when active */}
                      {(isDoorAngleActive || isRoomSelected) && (
                        <circle
                          cx={doorGeo.leafEnd.x}
                          cy={doorGeo.leafEnd.y}
                          r="7"
                          fill="rgba(59, 130, 246, 0.25)"
                        />
                      )}
                      {/* Central Handle Knob */}
                      <circle
                        cx={doorGeo.leafEnd.x}
                        cy={doorGeo.leafEnd.y}
                        r={isDoorAngleActive ? "5.5" : "4.5"}
                        fill={isDoorAngleActive ? "#2563eb" : isRoomSelected ? "#3b82f6" : "#ffffff"}
                        stroke={isDoorAngleActive ? "#ffffff" : isRoomSelected ? "#ffffff" : "#2563eb"}
                        strokeWidth="1.5"
                      />
                    </g>

                    {/* Live Dynamic Angle Badge during Rotation Drag */}
                    {isDoorAngleActive && (
                      <g transform={`translate(${doorGeo.leafEnd.x + 8}, ${doorGeo.leafEnd.y - 12})`}>
                        <rect
                          x="0"
                          y="0"
                          width="32"
                          height="16"
                          rx="3"
                          fill="#0f172a"
                          stroke="#3b82f6"
                          strokeWidth="1"
                          opacity="0.9"
                        />
                        <text
                          x="16"
                          y="11"
                          textAnchor="middle"
                          fill="#60a5fa"
                          fontSize="9"
                          fontWeight="bold"
                        >
                          {doorGeo.doorAngle}°
                        </text>
                      </g>
                    )}
                  </g>
                );
              })()}

              {/* Room Title Label (Freely Draggable & Positionable, No Box/Circle) */}
              {(() => {
                const labelX = r.x + (r.labelOffsetX ?? r.width / 2);
                const labelY = r.y + (r.labelOffsetY ?? r.height / 2);
                const rotation = r.labelRotation || 0;

                return (
                  <g 
                    transform={`translate(${labelX}, ${labelY}) rotate(${rotation})`} 
                    className="cursor-grab active:cursor-grabbing pointer-events-auto select-none"
                    onPointerDown={(e) => handlePointerDownRoomLabel(r.id, e)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (onUpdateRoomDoor) {
                        onUpdateRoomDoor(r.id, { labelOffsetX: undefined, labelOffsetY: undefined, labelRotation: 0 });
                        if (onShowToast) onShowToast(`Nome da sala '${r.name}' recentralizado!`);
                      }
                    }}
                  >
                    <title>Clique e arraste para mover o nome da sala livremente (Duplo clique para recentralizar)</title>
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      className="fill-slate-900 dark:fill-slate-100 font-bold drop-shadow-sm"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {r.name}
                    </text>
                  </g>
                );
              })()}

              {/* Wing Code Badge (Removed per user request) */}

              {/* Right-Edge Resize Handle (Horizontal Width Only) */}
              <g 
                transform={`translate(${r.x + r.width - 5}, ${r.y + r.height / 2 - 12})`}
                className="cursor-ew-resize opacity-80 hover:opacity-100 transition-opacity"
                onPointerDown={(e) => handlePointerDownResizeRoom(r.id, 'e', e)}
              >
                <rect x="0" y="0" width="8" height="24" rx="3" fill={r.wallColor || '#2563eb'} stroke="#ffffff" strokeWidth="1" />
                <line x1="4" y1="6" x2="4" y2="18" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              {/* Bottom-Edge Resize Handle (Vertical Height Only) */}
              <g 
                transform={`translate(${r.x + r.width / 2 - 12}, ${r.y + r.height - 5})`}
                className="cursor-ns-resize opacity-80 hover:opacity-100 transition-opacity"
                onPointerDown={(e) => handlePointerDownResizeRoom(r.id, 's', e)}
              >
                <rect x="0" y="0" width="24" height="8" rx="3" fill={r.wallColor || '#2563eb'} stroke="#ffffff" strokeWidth="1" />
                <line x1="6" y1="4" x2="18" y2="4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              {/* Bottom-Right Corner Resize Handle (Proportional / Dual Axis) */}
              <g 
                transform={`translate(${r.x + r.width - 16}, ${r.y + r.height - 16})`}
                className="cursor-nwse-resize opacity-90 hover:opacity-100 transition-opacity"
                onPointerDown={(e) => handlePointerDownResizeRoom(r.id, 'se', e)}
              >
                <rect x="0" y="0" width="16" height="16" rx="3" fill={r.wallColor || '#2563eb'} stroke="#ffffff" strokeWidth="1" />
                <path d="M 3 13 L 13 3 M 7 13 L 13 7 M 11 13 L 13 11" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              {/* Coordinates Indicator while Dragging Room */}
              {isRoomDragging && (
                <g transform={`translate(${r.x + 10}, ${r.y - 18})`}>
                  <rect x="0" y="0" width="100" height="16" rx="3" fill="#0f172a" opacity="0.9" />
                  <text x="50" y="11" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">
                    {`X:${Math.round(r.x)} Y:${Math.round(r.y)} (${Math.round(r.width)}x${Math.round(r.height)})`}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* ============================================================== */}
        {/* TOPOLOGY LINKS / CABLING (GRAPH-BASED, FREE DRAGGING & WAYPOINTS) */}
        {/* ============================================================== */}
        {showCableLines && (
          <g>
            {visibleLinks.map(link => {
              const fromNode = nodes.find(n => n.id === link.fromNodeId);
              const toNode = nodes.find(n => n.id === link.toNodeId);
              if (!fromNode || !toNode) return null;

              const isLinkSelected = selectedLinkId === link.id;

              const startX = fromNode.x + ((fromNode.width || 40) * 0.5) / 2;
              const startY = fromNode.y + ((fromNode.height || 40) * 0.5) / 2;
              const endX = toNode.x + ((toNode.width || 40) * 0.5) / 2;
              const endY = toNode.y + ((toNode.height || 40) * 0.5) / 2;

              // Build SVG Path including Waypoints
              let pathData = `M ${startX} ${startY}`;
              if (link.waypoints && link.waypoints.length > 0) {
                link.waypoints.forEach(wp => {
                  pathData += ` L ${wp.x} ${wp.y}`;
                });
              }
              pathData += ` L ${endX} ${endY}`;

              // Determine cable stroke color by cableType
              const cableColor = link.cableType.includes('Fibra') 
                ? '#f97316' 
                : link.cableType.includes('Vermelho') 
                ? '#ef4444' 
                : link.cableType.includes('Cinza')
                ? '#64748b'
                : '#0284c7';

              // Midpoint for speed badge
              const midX = (startX + endX) / 2;
              const midY = (startY + endY) / 2;

              return (
                <g 
                  key={link.id}
                  className="cursor-pointer"
                  onClick={() => onSelectLink(link.id)}
                  onContextMenu={(e) => {
                    e.stopPropagation();
                    onContextMenu(e, 'link', link.id);
                  }}
                >
                  {/* Thick Invisible Click Target */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="16"
                  />

                  {/* Outer Conduit Pipe */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth={isLinkSelected ? "4.5" : "3"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.85"
                  />

                  {/* Inner Colored Ethernet Strand */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isLinkSelected ? "#00f0ff" : cableColor}
                    strokeWidth={isLinkSelected ? "2" : "1.2"}
                    strokeDasharray={isLinkSelected ? "5 2" : "6 3"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Terminal RJ45 Connectors */}
                  <circle cx={startX} cy={startY} r="3.5" fill={cableColor} stroke="#0f172a" strokeWidth="1" />
                  <circle cx={endX} cy={endY} r="3.5" fill={cableColor} stroke="#0f172a" strokeWidth="1" />

                  {/* Waypoint Handles (Draggable for free routing) */}
                  {link.waypoints && link.waypoints.map((wp, i) => (
                    <g 
                      key={`wp-${link.id}-${i}`}
                      transform={`translate(${wp.x}, ${wp.y})`}
                      className="cursor-grab active:cursor-grabbing"
                      onPointerDown={(e) => handlePointerDownWaypoint(link.id, i, e)}
                    >
                      <circle cx="0" cy="0" r="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                      <circle cx="0" cy="0" r="2.5" fill="#38bdf8" />
                    </g>
                  ))}

                  {/* Speed Tag Badge */}
                  <g transform={`translate(${midX}, ${midY})`} className="pointer-events-none">
                    <rect x="-24" y="-8" width="48" height="14" rx="3" fill="#0f172a" opacity="0.9" stroke={cableColor} strokeWidth="0.5" />
                    <text x="0" y="2" textAnchor="middle" fill="#f8fafc" fontSize="7" fontWeight="bold">
                      {link.speed || '1G CAT6'}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        )}

        {/* Live Connecting Line to Cursor while in Link Creation Mode */}
        {connectingFromNodeId && (
          <g className="pointer-events-none">
            <line
              x1={connectingNodeX}
              y1={connectingNodeY}
              x2={cursorSvgPos.x}
              y2={cursorSvgPos.y}
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeDasharray="5 3"
              className="animate-pulse"
            />
            <circle cx={cursorSvgPos.x} cy={cursorSvgPos.y} r="5" fill="#f59e0b" />
          </g>
        )}

        {/* MARQUEE SELECTION BOX */}
        {selectionBox && (() => {
          const x = Math.min(selectionBox.startX, selectionBox.currentX);
          const y = Math.min(selectionBox.startY, selectionBox.currentY);
          const w = Math.abs(selectionBox.currentX - selectionBox.startX);
          const h = Math.abs(selectionBox.currentY - selectionBox.startY);
          if (w < 2 && h < 2) return null;
          return (
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill="rgba(147, 51, 234, 0.12)"
              stroke="#9333ea"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              rx="4"
              className="pointer-events-none"
            />
          );
        })()}

        {/* GROUP SELECTION OVERLAY BOUNDING BOX */}
        {selectedNodeIds && selectedNodeIds.length > 1 && (() => {
          const selectedNodes = visibleNodes.filter(n => selectedNodeIds.includes(n.id));
          if (selectedNodes.length === 0) return null;
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          selectedNodes.forEach(n => {
            const w = (n.width || 50) * 0.5;
            const h = (n.height || 40) * 0.5;
            if (n.x < minX) minX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.x + w > maxX) maxX = n.x + w;
            if (n.y + h > maxY) maxY = n.y + h;
          });
          const boxW = maxX - minX + 16;
          const boxH = maxY - minY + 16;
          return (
            <g transform={`translate(${minX - 8}, ${minY - 8})`}>
              <rect
                x="0"
                y="0"
                width={boxW}
                height={boxH}
                rx="8"
                fill="rgba(168, 85, 247, 0.08)"
                stroke="#a855f7"
                strokeWidth="2"
                strokeDasharray="5 3"
                className="pointer-events-none"
              />
              {/* Group Action Header Toolbar directly on Map */}
              <g transform="translate(0, -32)" className="pointer-events-auto select-none">
                <foreignObject x="0" y="0" width={Math.max(boxW, 280)} height="28">
                  <div className="flex items-center space-x-1.5 bg-slate-900/95 dark:bg-slate-900 text-white px-2.5 py-1 rounded-lg border border-purple-500/50 shadow-xl text-[10px] font-bold">
                    <span className="flex items-center space-x-1 text-purple-300 shrink-0 mr-1">
                      <Boxes className="w-3 h-3 text-purple-400" />
                      <span>Grupo ({selectedNodes.length})</span>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onRotateGroup) onRotateGroup(selectedNodeIds, 90);
                      }}
                      className="px-1.5 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-[9.5px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                      title="Girar todo o grupo 90° no sentido horário"
                    >
                      <RotateCw className="w-2.5 h-2.5" />
                      <span>Girar 90°</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onFlipGroupH) onFlipGroupH(selectedNodeIds);
                      }}
                      className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9.5px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                      title="Inverter posições na Horizontal (↔️)"
                    >
                      <span>↔️ Inverter H</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onFlipGroupV) onFlipGroupV(selectedNodeIds);
                      }}
                      className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9.5px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                      title="Inverter posições na Vertical (↕️)"
                    >
                      <span>↕️ Inverter V</span>
                    </button>
                  </div>
                </foreignObject>
              </g>
            </g>
          );
        })()}

        {/* ============================================================== */}
        {/* RENDER MOVABLE EQUIPMENT NODES (SCALED AT 50% PRECISION)     */}
        {/* ============================================================== */}
        {visibleNodes.map(node => {
          const isSelected = (selectedNodeIds && selectedNodeIds.length > 0) ? selectedNodeIds.includes(node.id) : selectedNodeId === node.id;
          const isDragging = draggingNodeId === node.id;
          const origW = node.width || 50;
          const origH = node.height || 40;
          const scaledW = origW * 0.5;
          const scaledH = origH * 0.5;

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onPointerDown={(e) => handlePointerDownNode(node.id, e)}
              onContextMenu={(e) => {
                e.stopPropagation();
                onContextMenu(e, 'node', node.id);
              }}
              className="cursor-grab active:cursor-grabbing transition-transform"
              filter={isSelected ? 'url(#selectionGlow)' : undefined}
            >
              {/* Invisible Hitbox for smooth dragging */}
              <rect
                x="-3"
                y="-3"
                width={scaledW + 6}
                height={scaledH + 6}
                fill="transparent"
              />

              {/* Selection Halo / Box */}
              {isSelected && (
                <rect
                  x="-3"
                  y="-3"
                  width={scaledW + 6}
                  height={scaledH + 6}
                  rx="4"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                />
              )}

              {/* 50% SCALED VECTOR GRAPHIC WITH ROTATION */}
              <g transform={`scale(0.5) rotate(${node.rotation || 0}, ${origW / 2}, ${origH / 2})`}>
                {/* MESA DE ESCRITÓRIO / TRABALHO TOTALMENTE BRANCA COM FRISO CINZA (DESK) */}
                {node.type === 'desk' && (
                  <g>
                    {/* Shadow */}
                    <rect x="2" y="2" width={origW} height={origH} rx="3.5" fill="#000000" opacity="0.10" />
                    
                    {/* Main Pure White Desktop */}
                    <rect 
                      x="0" 
                      y="0" 
                      width={origW} 
                      height={origH} 
                      rx="3" 
                      fill="#ffffff" 
                      stroke="#94a3b8" 
                      strokeWidth="1.2" 
                    />
                    
                    {/* Inner Gray Trim / Friso Cinza Perimetral */}
                    <rect 
                      x="3" 
                      y="3" 
                      width={origW - 6} 
                      height={origH - 6} 
                      rx="2" 
                      fill="#ffffff" 
                      stroke="#cbd5e1" 
                      strokeWidth="1" 
                    />

                    {/* Subtle Side Drawer Divider Line (Friso divisório lateral) */}
                    <line 
                      x1={origW - 14} 
                      y1="3" 
                      x2={origW - 14} 
                      y2={origH - 3} 
                      stroke="#cbd5e1" 
                      strokeWidth="1" 
                    />

                    {/* Subtle Drawer Details (Frisos finos em cinza) */}
                    <line 
                      x1={origW - 14} 
                      y1={origH / 2} 
                      x2={origW - 3} 
                      y2={origH / 2} 
                      stroke="#cbd5e1" 
                      strokeWidth="0.8" 
                    />
                    <circle cx={origW - 8.5} cy={origH / 4 + 1.5} r="1" fill="#94a3b8" />
                    <circle cx={origW - 8.5} cy={(origH * 3) / 4 - 1.5} r="1" fill="#94a3b8" />

                    {/* Clean Cable Grommet in light gray */}
                    <circle cx="8" cy="8" r="2.8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
                    <circle cx="8" cy="8" r="1.2" fill="#94a3b8" />
                  </g>
                )}

                {/* CADEIRA DE ESCRITÓRIO ERGONÔMICA (CHAIR) */}
                {node.type === 'chair' && (
                  <g>
                    {/* 5-Star Caster Base (Top-Down View) */}
                    <g transform={`translate(${origW / 2}, ${origH / 2})`}>
                      {[0, 72, 144, 216, 288].map((angle, i) => (
                        <g key={`leg-${i}`} transform={`rotate(${angle})`}>
                          <line x1="0" y1="0" x2="0" y2={origW * 0.42} stroke="#1e293b" strokeWidth={Math.max(2.5, origW * 0.07)} strokeLinecap="round" />
                          <circle cx="0" cy={origW * 0.43} r={Math.max(1.8, origW * 0.05)} fill="#0f172a" stroke="#475569" strokeWidth="0.6" />
                        </g>
                      ))}
                      {/* Chrome Gas Lift Cylinder */}
                      <circle cx="0" cy="0" r={Math.max(3.5, origW * 0.09)} fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
                      <circle cx="0" cy="0" r={Math.max(1.5, origW * 0.04)} fill="#1e293b" />
                    </g>

                    {/* Left & Right Armrests */}
                    <rect 
                      x="2" 
                      y={origH / 2 - (origH * 0.45) / 2} 
                      width={Math.max(5.5, origW * 0.16)} 
                      height={origH * 0.45} 
                      rx="2.5" 
                      fill="#0f172a" 
                      stroke="#334155" 
                      strokeWidth="0.8" 
                    />
                    <rect 
                      x={origW - 2 - Math.max(5.5, origW * 0.16)} 
                      y={origH / 2 - (origH * 0.45) / 2} 
                      width={Math.max(5.5, origW * 0.16)} 
                      height={origH * 0.45} 
                      rx="2.5" 
                      fill="#0f172a" 
                      stroke="#334155" 
                      strokeWidth="0.8" 
                    />

                    {/* Curved Lumbar Backrest */}
                    <path
                      d={`M ${origW * 0.18} ${origH * 0.14} Q ${origW / 2} ${origH * 0.03} ${origW * 0.82} ${origH * 0.14} Q ${origW / 2} ${origH * 0.32} ${origW * 0.18} ${origH * 0.14} Z`}
                      fill="url(#chairLeatherGrad)"
                      stroke="#1e3a8a"
                      strokeWidth="1.2"
                    />

                    {/* Ergonomic Seat Cushion */}
                    <ellipse
                      cx={origW / 2}
                      cy={origH / 2 + origH * 0.06}
                      rx={origW * 0.36}
                      ry={origH * 0.36}
                      fill="url(#chairLeatherGrad)"
                      stroke="#1e40af"
                      strokeWidth="1.2"
                    />
                    {/* Seat Stitching Accent */}
                    <ellipse
                      cx={origW / 2}
                      cy={origH / 2 + origH * 0.06}
                      rx={origW * 0.25}
                      ry={origH * 0.25}
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="0.8"
                      strokeDasharray="2 1.5"
                      opacity="0.8"
                    />
                  </g>
                )}

                {/* MESA DE REUNIÃO / CONFERÊNCIA (TABLE) */}
                {node.type === 'table' && (
                  <g>
                    {/* Shadow */}
                    <rect x="2" y="2" width={origW} height={origH} rx="12" fill="#000000" opacity="0.18" />
                    {/* Outer Table Rim */}
                    <rect x="0" y="0" width={origW} height={origH} rx="12" fill="url(#deskWoodGrad)" stroke="#b45309" strokeWidth="1.5" />
                    <rect x="3" y="3" width={origW - 6} height={origH - 6} rx="9" fill="url(#meetingTableGrad)" stroke="#cbd5e1" strokeWidth="1" />

                    {/* Central Connectivity Box (Power / HDMI / RJ45 Pop-up) */}
                    <rect x={origW / 2 - 16} y={origH / 2 - 6} width="32" height="12" rx="2" fill="#1e293b" stroke="#0f172a" strokeWidth="0.8" />
                    <circle cx={origW / 2 - 8} cy={origH / 2} r="2" fill="#38bdf8" />
                    <circle cx={origW / 2} cy={origH / 2} r="2" fill="#22c55e" />
                    <circle cx={origW / 2 + 8} cy={origH / 2} r="2" fill="#facc15" />

                    {/* Subtly Indicated Seating Spaces */}
                    <line x1={origW * 0.25} y1="3" x2={origW * 0.25} y2="6" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
                    <line x1={origW * 0.75} y1="3" x2={origW * 0.75} y2="6" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
                    <line x1={origW * 0.25} y1={origH - 6} x2={origW * 0.25} y2={origH - 3} stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
                    <line x1={origW * 0.75} y1={origH - 6} x2={origW * 0.75} y2={origH - 3} stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
                  </g>
                )}

                {/* CADEIRA DE VISITANTE / REUNIÃO (SIMPLE CHAIR) */}
                {node.type === 'simple_chair' && (
                  <g>
                    {/* Metal Frame Legs */}
                    <rect x="2" y="2" width={Math.max(4, origW * 0.1)} height={Math.max(4, origH * 0.1)} rx="1" fill="#475569" />
                    <rect x={origW - 2 - Math.max(4, origW * 0.1)} y="2" width={Math.max(4, origW * 0.1)} height={Math.max(4, origH * 0.1)} rx="1" fill="#475569" />
                    <rect x="2" y={origH - 2 - Math.max(4, origH * 0.1)} width={Math.max(4, origW * 0.1)} height={Math.max(4, origH * 0.1)} rx="1" fill="#475569" />
                    <rect x={origW - 2 - Math.max(4, origW * 0.1)} y={origH - 2 - Math.max(4, origH * 0.1)} width={Math.max(4, origW * 0.1)} height={Math.max(4, origH * 0.1)} rx="1" fill="#475569" />

                    {/* Backrest */}
                    <rect x={origW * 0.1} y={origH * 0.05} width={origW * 0.8} height={origH * 0.18} rx="2" fill="url(#chairDarkMeshGrad)" stroke="#1e293b" strokeWidth="1" />

                    {/* Padded Seat Cushion */}
                    <rect x={origW * 0.08} y={origH * 0.26} width={origW * 0.84} height={origH * 0.65} rx={origW * 0.1} fill="url(#chairDarkMeshGrad)" stroke="#1e293b" strokeWidth="1" />
                    <line x1={origW * 0.15} y1={origH / 2 + 1} x2={origW * 0.85} y2={origH / 2 + 1} stroke="#64748b" strokeWidth="0.8" opacity="0.6" />
                  </g>
                )}

                {/* ROUTER */}
                {node.type === 'router' && (
                  <g>
                    {/* Antennas */}
                    <line x1="8" y1="8" x2="4" y2="-6" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
                    <line x1={origW - 8} y1="8" x2={origW - 4} y2="-6" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="4" cy="-6" r="1.5" fill="#38bdf8" />
                    <circle cx={origW - 4} cy="-6" r="1.5" fill="#38bdf8" />
                    {/* Router Chassis */}
                    <rect x="0" y="6" width={origW} height={origH - 6} rx="4" fill="url(#routerGrad)" stroke="#0369a1" strokeWidth="1.5" />
                    {/* Front Bevel Bar */}
                    <rect x="3" y={origH - 14} width={origW - 6} height="7" rx="2" fill="#0f172a" stroke="#1e293b" strokeWidth="0.8" />
                    {/* Front Status LEDs */}
                    <circle cx="7" cy={origH - 10.5} r="1.2" fill="#22c55e" />
                    <circle cx="12" cy={origH - 10.5} r="1.2" fill="#38bdf8" className="animate-pulse" />
                    <circle cx="17" cy={origH - 10.5} r="1.2" fill="#22c55e" />
                    <circle cx="22" cy={origH - 10.5} r="1.2" fill="#22c55e" />
                    <circle cx="27" cy={origH - 10.5} r="1.2" fill="#facc15" />
                    {/* Top Air Vents */}
                    <line x1="12" y1="12" x2={origW - 12} y2="12" stroke="#075985" strokeWidth="1.2" />
                    <line x1="12" y1="16" x2={origW - 12} y2="16" stroke="#075985" strokeWidth="1.2" />
                  </g>
                )}

                {/* NOBREAK (UPS) */}
                {node.type === 'ups' && (
                  <g>
                    <rect x="2" y="2" width={origW} height={origH} rx="4" fill="#000000" opacity="0.25" />
                    <rect x="0" y="0" width={origW} height={origH} rx="4" fill="url(#upsDarkGrad)" stroke="#10b981" strokeWidth="1.5" />
                    {/* Front LCD Digital Display */}
                    <rect x="5" y="5" width={origW - 10} height="15" rx="2" fill="#022c22" stroke="#059669" strokeWidth="0.8" />
                    <text x="8" y="15.5" fill="#34d399" fontSize="6" fontWeight="bold" fontFamily="monospace">220V 100%</text>
                    {/* Battery Level Gauge Bar */}
                    <rect x="5" y="23" width={origW - 10} height="5" rx="1" fill="#0f172a" stroke="#1e293b" strokeWidth="0.6" />
                    <rect x="6" y="24" width={(origW - 12) * 0.3} height="3" fill="#22c55e" rx="0.5" />
                    <rect x={6 + (origW - 12) * 0.33} y="24" width={(origW - 12) * 0.3} height="3" fill="#22c55e" rx="0.5" />
                    <rect x={6 + (origW - 12) * 0.66} y="24" width={(origW - 12) * 0.3} height="3" fill="#facc15" rx="0.5" />
                    {/* Power On/Off Button with Lightning Icon */}
                    <circle cx={origW / 2} cy={origH - 12} r="5.5" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
                    <path d={`M ${origW/2 + 0.5} ${origH - 15.5} L ${origW/2 - 2} ${origH - 12} L ${origW/2} ${origH - 12} L ${origW/2 - 0.5} ${origH - 8.5} L ${origW/2 + 2} ${origH - 12} L ${origW/2} ${origH - 12} Z`} fill="#34d399" />
                  </g>
                )}

                {/* CÂMERA CFTV / IP */}
                {node.type === 'camera' && (
                  <g>
                    {/* Wall / Ceiling Mounting Arm */}
                    <rect x="2" y="12" width="8" height="16" rx="2" fill="#334155" stroke="#1e293b" strokeWidth="1" />
                    <line x1="10" y1="20" x2="16" y2="20" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
                    {/* Camera Bullet Body */}
                    <rect x="15" y="8" width={origW - 17} height="24" rx="5" fill="url(#cameraDarkGrad)" stroke="#06b6d4" strokeWidth="1.4" />
                    {/* Front Optical Lens */}
                    <ellipse cx={origW - 5} cy="20" rx="3.5" ry="9" fill="#0f172a" stroke="#0891b2" strokeWidth="1" />
                    <ellipse cx={origW - 5} cy="20" rx="2" ry="5.5" fill="#0284c7" />
                    <circle cx={origW - 6} cy="18" r="0.9" fill="#ffffff" opacity="0.85" />
                    {/* Sunshield Visor */}
                    <path d={`M 13 8 L ${origW - 1} 6 L ${origW - 1} 9 L 13 9 Z`} fill="#0891b2" />
                    {/* Active Record Red Blinking LED */}
                    <circle cx="20" cy="13" r="1.5" fill="#ef4444" className="animate-pulse" />
                  </g>
                )}

                {/* TELEFONE IP / VOIP */}
                {node.type === 'voip' && (
                  <g>
                    {/* Main Angled Body */}
                    <rect x="2" y="2" width={origW - 4} height={origH - 4} rx="4" fill="url(#voipBodyGrad)" stroke="#8b5cf6" strokeWidth="1.4" />
                    {/* Handset Receiver on Left */}
                    <rect x="4" y="4" width="10" height={origH - 8} rx="3" fill="#0f172a" stroke="#6d28d9" strokeWidth="1" />
                    <circle cx="9" cy="8" r="2.5" fill="#312e81" />
                    <circle cx="9" cy={origH - 8} r="2.5" fill="#312e81" />
                    {/* VoIP LCD Display */}
                    <rect x="17" y="5" width={origW - 22} height="15" rx="2" fill="url(#screenBlueGrad)" stroke="#312e81" strokeWidth="0.8" />
                    <text x="19.5" y="14" fill="#ffffff" fontSize="5.5" fontWeight="bold" fontFamily="monospace">Ramal IP</text>
                    {/* Keypad Grid */}
                    <circle cx="20" cy="25" r="1.3" fill="#cbd5e1" />
                    <circle cx="26" cy="25" r="1.3" fill="#cbd5e1" />
                    <circle cx="32" cy="25" r="1.3" fill="#cbd5e1" />
                    <circle cx="20" cy="30" r="1.3" fill="#cbd5e1" />
                    <circle cx="26" cy="30" r="1.3" fill="#cbd5e1" />
                    <circle cx="32" cy="30" r="1.3" fill="#cbd5e1" />
                    <circle cx="20" cy="35" r="1.3" fill="#cbd5e1" />
                    <circle cx="26" cy="35" r="1.3" fill="#cbd5e1" />
                    <circle cx="32" cy="35" r="1.3" fill="#cbd5e1" />
                    {/* Status LED */}
                    <circle cx={origW - 7} cy="6" r="1" fill="#22c55e" />
                  </g>
                )}

                {/* HUB SWITCH / MAIN SWITCH */}
                {(node.type === 'switch' || node.type === 'patch_panel') && (
                  <g>
                    <rect x="0" y="0" width={origW} height={origH} rx="3" fill="url(#switchGrad)" stroke="#1d4ed8" strokeWidth="1.5" />
                    <rect x="-3" y="2" width="3" height={origH - 4} rx="0.5" fill="#64748b" />
                    <rect x={origW} y="2" width="3" height={origH - 4} rx="0.5" fill="#64748b" />
                    <rect x="5" y="4" width={origW - 10} height={origH - 8} rx="1.5" fill="#0f172a" />
                    {Array.from({ length: Math.max(4, Math.floor((origW - 16) / 6)) }).map((_, i) => (
                      <g key={`port-${i}`} transform={`translate(${8 + i * 6}, 6)`}>
                        <rect x="0" y="0" width="4.5" height="4.5" rx="0.5" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                        <rect x="1" y="1" width="2.5" height="2.5" fill="#38bdf8" opacity="0.9" />
                        <circle cx="2" cy="-2.5" r="0.7" fill={i % 3 === 0 ? "#facc15" : "#22c55e"} />
                      </g>
                    ))}
                  </g>
                )}

                {/* SERVER TOWERS / RACKS */}
                {node.type === 'rack' && (
                  <g>
                    <rect x="3" y="3" width={origW} height={origH} rx="4" fill="#000000" opacity="0.25" />
                    <rect x="0" y="0" width={origW} height={origH} rx="4" fill="url(#serverDarkGrad)" stroke="#475569" strokeWidth="1.5" />
                    <line x1="3" y1="2" x2="3" y2={origH - 2} stroke="#64748b" strokeWidth="1" />
                    <line x1={origW - 3} y1="2" x2={origW - 3} y2={origH - 2} stroke="#64748b" strokeWidth="1" />

                    {Array.from({ length: 4 }).map((_, i) => (
                      <g key={`server-blade-${i}`} transform={`translate(5, ${8 + i * 18})`}>
                        <rect x="0" y="0" width={origW - 10} height="14" rx="2" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                        <rect x="1" y="2" width="2" height="9" rx="0.5" fill="#64748b" />
                        <rect x={origW - 13} y="2" width="2" height="9" rx="0.5" fill="#64748b" />
                        <rect x="7" y="6" width={origW - 24} height="2.5" rx="1" fill="#38bdf8" className="animate-pulse" />
                        <circle cx={origW - 17} cy="7" r="1" fill="#00f0ff" />
                      </g>
                    ))}
                  </g>
                )}

                {/* WI-FI ROUTER / ACCESS POINT */}
                {node.type === 'access_point' && (
                  <g>
                    <line x1="8" y1="10" x2="6" y2="-6" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1={origW - 8} y1="10" x2={origW - 6} y2="-6" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
                    <path d={`M ${origW/2 - 10} -10 A 10 10 0 0 1 ${origW/2 + 10} -10`} fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx={origW/2} cy="-2" r="2" fill="#38bdf8" />
                    <rect x="0" y="6" width={origW} height="16" rx="3" fill="url(#wifiDarkGrad)" stroke="#0f172a" strokeWidth="1.5" />
                    <line x1="5" y1="14" x2={origW - 5} y2="14" stroke="#38bdf8" strokeWidth="1.2" opacity="0.8" />
                    <circle cx="8" cy="14" r="0.8" fill="#22c55e" />
                    <circle cx="12" cy="14" r="0.8" fill="#22c55e" />
                  </g>
                )}

                {/* CLIENT WORKSTATION */}
                {node.type === 'workstation' && (
                  <g>
                    {/* Shadow / Desk footprint */}
                    <rect x="2" y="2" width={origW - 4} height={origH - 4} rx="4" fill="#000000" opacity="0.08" />

                    {/* Monitor Stand Base & Neck */}
                    <ellipse 
                      cx={origW * 0.31} 
                      cy={origH * 0.60} 
                      rx={Math.max(8, origW * 0.14)} 
                      ry={Math.max(3, origH * 0.06)} 
                      fill="#64748b" 
                      stroke="#475569" 
                      strokeWidth="0.8" 
                    />
                    <rect 
                      x={origW * 0.28} 
                      y={origH * 0.44} 
                      width={Math.max(4, origW * 0.06)} 
                      height={Math.max(8, origH * 0.18)} 
                      rx="1" 
                      fill="#475569" 
                    />

                    {/* Monitor Display Frame */}
                    <g transform={`translate(${origW * 0.03}, ${origH * 0.04})`}>
                      {/* Bezel */}
                      <rect 
                        x="0" 
                        y="0" 
                        width={origW * 0.58} 
                        height={origH * 0.52} 
                        rx="3" 
                        fill="#0f172a" 
                        stroke="#334155" 
                        strokeWidth="1.5" 
                      />
                      {/* Glowing Screen */}
                      <rect 
                        x="3" 
                        y="3" 
                        width={Math.max(6, origW * 0.58 - 6)} 
                        height={Math.max(6, origH * 0.52 - 6)} 
                        rx="1.5" 
                        fill="url(#screenBlueGrad)" 
                      />
                      {/* Top Glass Glare Reflection */}
                      <polygon 
                        points={`3,3 ${origW * 0.30},3 3,${origH * 0.32}`} 
                        fill="#ffffff" 
                        opacity="0.25" 
                      />
                      {/* Brand Logo / Power indicator dot */}
                      <circle 
                        cx={origW * 0.29} 
                        cy={origH * 0.52 - 1.5} 
                        r="1" 
                        fill="#38bdf8" 
                      />
                    </g>

                    {/* Standing Desktop PC Tower */}
                    <g transform={`translate(${origW * 0.67}, ${origH * 0.04})`}>
                      {/* Chassis */}
                      <rect 
                        x="0" 
                        y="0" 
                        width={origW * 0.29} 
                        height={origH * 0.70} 
                        rx="3" 
                        fill="#1e293b" 
                        stroke="#0f172a" 
                        strokeWidth="1.5" 
                      />
                      {/* Upper Optical / Expansion Bay */}
                      <rect 
                        x="3" 
                        y="4" 
                        width={Math.max(4, origW * 0.29 - 6)} 
                        height={Math.max(3, origH * 0.10)} 
                        rx="1" 
                        fill="#334155" 
                      />
                      {/* Front Ventilation / RGB Strip */}
                      <line 
                        x1="4" 
                        y1={origH * 0.24} 
                        x2={origW * 0.29 - 4} 
                        y2={origH * 0.24} 
                        stroke="#38bdf8" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                      />
                      <line 
                        x1="4" 
                        y1={origH * 0.32} 
                        x2={origW * 0.29 - 4} 
                        y2={origH * 0.32} 
                        stroke="#38bdf8" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                      />
                      <line 
                        x1="4" 
                        y1={origH * 0.40} 
                        x2={origW * 0.29 - 4} 
                        y2={origH * 0.40} 
                        stroke="#38bdf8" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                      />
                      {/* Front USB Ports */}
                      <rect 
                        x="5" 
                        y={origH * 0.48} 
                        width={Math.max(2, origW * 0.05)} 
                        height="3" 
                        fill="#64748b" 
                      />
                      <rect 
                        x={origW * 0.29 - 5 - Math.max(2, origW * 0.05)} 
                        y={origH * 0.48} 
                        width={Math.max(2, origW * 0.05)} 
                        height="3" 
                        fill="#64748b" 
                      />
                      {/* Power LED Indicator */}
                      <circle 
                        cx={origW * 0.145} 
                        cy={origH * 0.58} 
                        r={Math.max(1.8, origW * 0.03)} 
                        fill="#00f0ff" 
                      />
                    </g>

                    {/* Keyboard & Mouse (Input Peripherals) */}
                    <g transform={`translate(${origW * 0.06}, ${origH * 0.72})`}>
                      {/* Ergonomic Keyboard */}
                      <rect 
                        x="0" 
                        y="0" 
                        width={origW * 0.45} 
                        height={origH * 0.22} 
                        rx="2" 
                        fill="#cbd5e1" 
                        stroke="#94a3b8" 
                        strokeWidth="1" 
                      />
                      {/* Key rows accent */}
                      <line 
                        x1="3" 
                        y1={origH * 0.08} 
                        x2={origW * 0.45 - 3} 
                        y2={origH * 0.08} 
                        stroke="#94a3b8" 
                        strokeWidth="0.8" 
                        strokeDasharray="3 2" 
                      />
                      <line 
                        x1="3" 
                        y1={origH * 0.15} 
                        x2={origW * 0.45 - 3} 
                        y2={origH * 0.15} 
                        stroke="#94a3b8" 
                        strokeWidth="0.8" 
                        strokeDasharray="3 2" 
                      />

                      {/* Optical Mouse */}
                      <ellipse 
                        cx={origW * 0.54} 
                        cy={origH * 0.11} 
                        rx={Math.max(2.5, origW * 0.045)} 
                        ry={Math.max(3.5, origH * 0.09)} 
                        fill="#cbd5e1" 
                        stroke="#94a3b8" 
                        strokeWidth="1" 
                      />
                      <line 
                        x1={origW * 0.54} 
                        y1={origH * 0.04} 
                        x2={origW * 0.54} 
                        y2={origH * 0.10} 
                        stroke="#64748b" 
                        strokeWidth="0.8" 
                      />
                    </g>
                  </g>
                )}

                {/* PRINTER (OFFICE GRAY) */}
                {node.type === 'printer' && (
                  <g>
                    {/* Floor Drop Shadow */}
                    <rect x="2" y="4" width={origW - 4} height={origH - 4} rx="4" fill="#000000" opacity="0.08" />

                    {/* Top Paper Infeed Tray & Paper Stack */}
                    <g transform={`translate(${origW * 0.18}, 0)`}>
                      <rect 
                        x="0" 
                        y="0" 
                        width={origW * 0.64} 
                        height={origH * 0.20} 
                        rx="1.5" 
                        fill="#ffffff" 
                        stroke="#94a3b8" 
                        strokeWidth="1" 
                      />
                      {/* Top Paper Sheets Stack Effect */}
                      <line 
                        x1="3" 
                        y1={origH * 0.06} 
                        x2={origW * 0.64 - 3} 
                        y2={origH * 0.06} 
                        stroke="#cbd5e1" 
                        strokeWidth="0.8" 
                      />
                      <line 
                        x1="4" 
                        y1={origH * 0.12} 
                        x2={origW * 0.64 - 4} 
                        y2={origH * 0.12} 
                        stroke="#e2e8f0" 
                        strokeWidth="0.8" 
                      />
                    </g>

                    {/* Main Multifunctional Chassis Body (Gray) */}
                    <rect 
                      x="0" 
                      y={origH * 0.14} 
                      width={origW} 
                      height={origH * 0.84} 
                      rx="4" 
                      fill="url(#printerGrayGrad)" 
                      stroke="#64748b" 
                      strokeWidth="1.5" 
                    />

                    {/* Top Scanner Lid / Header Strip (Darker Accent Gray) */}
                    <rect 
                      x="3" 
                      y={origH * 0.17} 
                      width={origW - 6} 
                      height={origH * 0.16} 
                      rx="2" 
                      fill="#94a3b8" 
                      stroke="#64748b"
                      strokeWidth="0.8"
                    />

                    {/* Operator Control Panel with LCD Touchscreen */}
                    <g transform={`translate(${origW * 0.06}, ${origH * 0.19})`}>
                      {/* Mini LCD Display */}
                      <rect 
                        x="0" 
                        y="0" 
                        width={origW * 0.32} 
                        height={origH * 0.12} 
                        rx="1.5" 
                        fill="#0284c7" 
                        stroke="#0369a1" 
                        strokeWidth="0.8" 
                      />
                      <line 
                        x1="3" 
                        y1={origH * 0.04} 
                        x2={origW * 0.26} 
                        y2={origH * 0.04} 
                        stroke="#bae6fd" 
                        strokeWidth="0.8" 
                      />
                      <line 
                        x1="3" 
                        y1={origH * 0.08} 
                        x2={origW * 0.20} 
                        y2={origH * 0.08} 
                        stroke="#bae6fd" 
                        strokeWidth="0.8" 
                      />
                      {/* Control Button Keypad */}
                      <circle cx={origW * 0.38} cy={origH * 0.06} r={Math.max(1.8, origW * 0.02)} fill="#475569" />
                      <circle cx={origW * 0.44} cy={origH * 0.06} r={Math.max(1.8, origW * 0.02)} fill="#475569" />
                    </g>

                    {/* Status Power & Network LEDs */}
                    <circle 
                      cx={origW - 12} 
                      cy={origH * 0.24} 
                      r={Math.max(2, origW * 0.025)} 
                      fill="#22c55e" 
                    />
                    <circle 
                      cx={origW - 20} 
                      cy={origH * 0.24} 
                      r={Math.max(1.8, origW * 0.02)} 
                      fill="#38bdf8" 
                    />

                    {/* Middle Output Paper Bay / Cavity (Charcoal Gray Interior) */}
                    <rect 
                      x={origW * 0.06} 
                      y={origH * 0.38} 
                      width={origW * 0.88} 
                      height={origH * 0.34} 
                      rx="2" 
                      fill="#475569" 
                      stroke="#334155"
                      strokeWidth="0.8"
                    />

                    {/* Output Ejected Printed Page */}
                    <g transform={`translate(${origW * 0.16}, ${origH * 0.43})`}>
                      <rect 
                        x="0" 
                        y="0" 
                        width={origW * 0.68} 
                        height={origH * 0.24} 
                        rx="1" 
                        fill="#ffffff" 
                        stroke="#cbd5e1" 
                        strokeWidth="0.8" 
                      />
                      {/* Document Text Lines */}
                      <line x1="4" y1={origH * 0.05} x2={origW * 0.60} y2={origH * 0.05} stroke="#94a3b8" strokeWidth="0.8" />
                      <line x1="4" y1={origH * 0.10} x2={origW * 0.50} y2={origH * 0.10} stroke="#94a3b8" strokeWidth="0.8" />
                      <line x1="4" y1={origH * 0.15} x2={origW * 0.55} y2={origH * 0.15} stroke="#94a3b8" strokeWidth="0.8" />
                    </g>

                    {/* Lower Paper Cassette Drawer Tray (Subtle Mid-Gray) */}
                    <rect 
                      x={origW * 0.08} 
                      y={origH * 0.77} 
                      width={origW * 0.84} 
                      height={origH * 0.15} 
                      rx="1.5" 
                      fill="#e2e8f0" 
                      stroke="#94a3b8" 
                      strokeWidth="1" 
                    />
                    {/* Drawer Handle / Paper Level Window */}
                    <rect 
                      x={origW * 0.38} 
                      y={origH * 0.82} 
                      width={origW * 0.24} 
                      height="3" 
                      rx="1" 
                      fill="#64748b" 
                    />
                  </g>
                )}

                {/* FIREWALL */}
                {node.type === 'firewall' && (
                  <g>
                    <rect x="0" y="0" width={origW} height={origH} rx="3" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
                    <line x1="8" y1={origH/2} x2={origW - 8} y2={origH/2} stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 2" />
                  </g>
                )}
              </g>

              {/* Coordinates Indicator while Dragging */}
              {isDragging && (
                <g transform="translate(0, -16)">
                  <rect x="-6" y="0" width="58" height="12" rx="2.5" fill="#0f172a" opacity="0.9" />
                  <text x="23" y="8.5" textAnchor="middle" fill="#38bdf8" fontSize="7" fontWeight="bold">
                    {`X:${Math.round(node.x)} Y:${Math.round(node.y)}`}
                  </text>
                </g>
              )}

              {/* Dimension Indicator while Resizing Node */}
              {resizingNode?.nodeId === node.id && (
                <g transform="translate(0, -16)">
                  <rect x="-6" y="0" width="68" height="12" rx="2.5" fill="#1e1b4b" opacity="0.95" stroke="#6366f1" strokeWidth="0.8" />
                  <text x="28" y="8.5" textAnchor="middle" fill="#a5b4fc" fontSize="7" fontWeight="bold">
                    {`${Math.round(origW)} × ${Math.round(origH)} px`}
                  </text>
                </g>
              )}

              {/* INTERACTIVE RESIZE HANDLES ON SELECTED NODE */}
              {isSelected && (
                <g>
                  {/* SE (Corner) Resize Handle */}
                  <rect
                    x={scaledW - 4}
                    y={scaledH - 4}
                    width="8"
                    height="8"
                    rx="1.5"
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="cursor-se-resize hover:fill-blue-400 transition-colors"
                    onPointerDown={(e) => handlePointerDownResizeNode(node.id, 'se', e)}
                  />
                  {/* E (Right Edge) Resize Handle */}
                  <rect
                    x={scaledW - 3}
                    y={scaledH / 2 - 3.5}
                    width="6"
                    height="7"
                    rx="1"
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                    className="cursor-e-resize hover:fill-blue-400 transition-colors"
                    onPointerDown={(e) => handlePointerDownResizeNode(node.id, 'e', e)}
                  />
                  {/* S (Bottom Edge) Resize Handle */}
                  <rect
                    x={scaledW / 2 - 3.5}
                    y={scaledH - 3}
                    width="7"
                    height="6"
                    rx="1"
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                    className="cursor-s-resize hover:fill-blue-400 transition-colors"
                    onPointerDown={(e) => handlePointerDownResizeNode(node.id, 's', e)}
                  />
                </g>
              )}

            </g>
          );
        })}

      </svg>

    </div>
  );
};
