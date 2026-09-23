import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Shield, 
  Server, 
  Network, 
  Monitor, 
  Laptop, 
  Printer, 
  Database, 
  Wifi, 
  Lock, 
  Globe, 
  Building2, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Smartphone, 
  Radio, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Move, 
  Cable, 
  LayoutGrid, 
  Layers, 
  LockKeyhole, 
  Unlock, 
  Check, 
  Info,
  Sliders,
  Sparkles,
  HardDrive,
  BatteryCharging
} from 'lucide-react';
import { ConfigurationItem, CIRelationship, CIStatus } from '../../types/cmdb';

interface CmdbTopologyViewProps {
  items: ConfigurationItem[];
  relationships: CIRelationship[];
  onSelectCi: (ci: ConfigurationItem) => void;
  onOpenImpact?: (ci: ConfigurationItem) => void;
  onOpenClientDetails?: () => void;
  activeSubTab?: string;
  onSubTabChange?: (tab: any) => void;
  onCreateCi?: (ci: Partial<ConfigurationItem>) => void;
  onUpdateCi?: (id: string, ci: Partial<ConfigurationItem>) => void;
  onDeleteCi?: (id: string) => void;
  onCreateRelationship?: (rel: Partial<CIRelationship>) => void;
  onDeleteRelationship?: (id: string) => void;
  onUpdateItemPosition?: (id: string, pos: { x: number; y: number }) => void;
}

// Default standard coordinates for core ITIL topology chain
const DEFAULT_TOPOLOGY_POSITIONS: Record<string, { x: number; y: number }> = {
  'ci-inet': { x: 500, y: 40 },
  'ci-router': { x: 500, y: 130 },
  'ci-fw': { x: 500, y: 220 },
  'ci-vpn': { x: 820, y: 200 },
  'ci-isp': { x: 820, y: 340 },
  'ci-sw-core': { x: 500, y: 340 },
  'ci-ap-wifi': { x: 190, y: 340 },
  'ci-nb-01': { x: 120, y: 490 },
  'ci-cel-01': { x: 260, y: 490 },
  'ci-srv-erp': { x: 410, y: 500 },
  'ci-srv-ad': { x: 580, y: 500 },
  'ci-db-sql': { x: 495, y: 620 },
  'ci-printer': { x: 820, y: 500 },
  'ci-pc-001': { x: 250, y: 780 },
  'ci-pc-002': { x: 370, y: 780 },
  'ci-pc-003': { x: 490, y: 780 },
  'ci-pc-004': { x: 610, y: 780 },
  'ci-pc-005': { x: 730, y: 780 }
};

export const CmdbTopologyView: React.FC<CmdbTopologyViewProps> = ({
  items: initialItems,
  relationships: initialRelationships,
  onSelectCi,
  activeSubTab = 'topologia',
  onSubTabChange = (_tab?: string) => {},
  onCreateCi,
  onUpdateCi,
  onDeleteCi,
  onCreateRelationship,
  onDeleteRelationship,
  onUpdateItemPosition
}) => {
  // Local state for items and relationships to support instant UI feedback
  const [localItems, setLocalItems] = useState<ConfigurationItem[]>(initialItems);
  const [localRelationships, setLocalRelationships] = useState<CIRelationship[]>(initialRelationships);

  // Sync with prop updates if changed externally
  useEffect(() => {
    setLocalItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    setLocalRelationships(initialRelationships);
  }, [initialRelationships]);

  // Topology node positions state (with localStorage persistence)
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(() => {
    try {
      const saved = localStorage.getItem('cmdb_topology_positions_v2');
      if (saved) {
        return { ...DEFAULT_TOPOLOGY_POSITIONS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_TOPOLOGY_POSITIONS;
  });

  // Viewport & Interaction states
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedRel, setSelectedRel] = useState<CIRelationship | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [showEvidenceModal, setShowEvidenceModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [showAddDeviceModal, setShowAddDeviceModal] = useState<boolean>(false);
  const [showAddConnectionModal, setShowAddConnectionModal] = useState<boolean>(false);
  const [showEditDeviceModal, setShowEditDeviceModal] = useState<boolean>(false);
  const [editingCi, setEditingCi] = useState<ConfigurationItem | null>(null);

  // Form states for new device
  const [newDeviceType, setNewDeviceType] = useState<string>('switch');
  const [newDeviceName, setNewDeviceName] = useState<string>('');
  const [newDeviceIp, setNewDeviceIp] = useState<string>('192.168.1.');
  const [newDeviceMac, setNewDeviceMac] = useState<string>('');
  const [newDeviceVendor, setNewDeviceVendor] = useState<string>('');
  const [newDeviceModel, setNewDeviceModel] = useState<string>('');
  const [newDeviceAssetTag, setNewDeviceAssetTag] = useState<string>('');
  const [newDeviceStatus, setNewDeviceStatus] = useState<CIStatus>('operacional');

  // Form states for new connection
  const [newRelSource, setNewRelSource] = useState<string>('');
  const [newRelTarget, setNewRelTarget] = useState<string>('');
  const [newRelType, setNewRelType] = useState<string>('CONECTADO_A');
  const [newRelSourceType, setNewRelSourceType] = useState<string>('AGENT');
  const [newRelSpeed, setNewRelSpeed] = useState<string>('1 Gbps');

  // Dragging interaction refs and state
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingNodeRef = useRef<{ id: string; startX: number; startY: number; initNodeX: number; initNodeY: number } | null>(null);
  const panningCanvasRef = useRef<{ startX: number; startY: number; initPanX: number; initPanY: number } | null>(null);
  const [isDraggingNode, setIsDraggingNode] = useState<boolean>(false);

  // Show quick toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to get CI
  const getItem = (id: string) => localItems.find(i => i.id === id);

  // Coordinates getter for any node (with fallback if dynamically added)
  const getNodeCoordinates = useCallback((ciId: string, index = 0): { x: number; y: number } => {
    if (nodePositions[ciId]) {
      return nodePositions[ciId];
    }
    const ci = localItems.find(i => i.id === ciId);
    if (ci?.canvasPosition?.x && ci?.canvasPosition?.y) {
      return { x: ci.canvasPosition.x, y: ci.canvasPosition.y };
    }
    // Dynamic coordinate positioning for newly added items
    const col = (index % 4);
    const row = Math.floor(index / 4);
    return {
      x: 350 + col * 140,
      y: 650 + row * 110
    };
  }, [nodePositions, localItems]);

  // Handle Drag Start on Node
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (!isEditMode) return;
    e.stopPropagation();
    
    setSelectedNodeId(nodeId);
    setSelectedRel(null);
    const pos = getNodeCoordinates(nodeId);

    draggingNodeRef.current = {
      id: nodeId,
      startX: e.clientX,
      startY: e.clientY,
      initNodeX: pos.x,
      initNodeY: pos.y
    };
    setIsDraggingNode(true);
  };

  // Handle Canvas Background Pan Mouse Down
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicked directly on canvas background
    if ((e.target as HTMLElement).closest('.topology-node')) return;
    
    panningCanvasRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPanX: panOffset.x,
      initPanY: panOffset.y
    };
  };

  // Global Mouse Move for Node Dragging and Canvas Panning
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // 1. Dragging a node
    if (draggingNodeRef.current) {
      const { id, startX, startY, initNodeX, initNodeY } = draggingNodeRef.current;
      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;

      const newX = Math.round(Math.max(40, Math.min(1150, initNodeX + dx)));
      const newY = Math.round(Math.max(30, Math.min(1050, initNodeY + dy)));

      setNodePositions(prev => {
        const next = { ...prev, [id]: { x: newX, y: newY } };
        return next;
      });

      if (onUpdateItemPosition) {
        onUpdateItemPosition(id, { x: newX, y: newY });
      }
      return;
    }

    // 2. Panning canvas
    if (panningCanvasRef.current) {
      const { startX, startY, initPanX, initPanY } = panningCanvasRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      setPanOffset({
        x: Math.round(initPanX + dx),
        y: Math.round(initPanY + dy)
      });
    }
  }, [zoom, onUpdateItemPosition]);

  // Global Mouse Up to end drag/pan
  const handleMouseUp = useCallback(() => {
    if (draggingNodeRef.current) {
      // Save current positions to localStorage
      try {
        localStorage.setItem('cmdb_topology_positions_v2', JSON.stringify(nodePositions));
      } catch {
        // ignore
      }
      draggingNodeRef.current = null;
      setIsDraggingNode(false);
    }
    if (panningCanvasRef.current) {
      panningCanvasRef.current = null;
    }
  }, [nodePositions]);

  // Reset to default standard layout
  const handleAutoOrganizeLayout = () => {
    setNodePositions(DEFAULT_TOPOLOGY_POSITIONS);
    setPanOffset({ x: 0, y: 0 });
    setZoom(1);
    try {
      localStorage.setItem('cmdb_topology_positions_v2', JSON.stringify(DEFAULT_TOPOLOGY_POSITIONS));
    } catch {
      // ignore
    }
    showToast('✨ Topologia auto-organizada na hierarquia padrão ITIL!');
  };

  // Save layout explicitly
  const handleSaveLayout = () => {
    try {
      localStorage.setItem('cmdb_topology_positions_v2', JSON.stringify(nodePositions));
      showToast('💾 Posições e layout da topologia salvos com sucesso!');
    } catch {
      showToast('Erro ao salvar no navegador.');
    }
  };

  // Zoom Controls
  const handleZoomIn = () => setZoom(z => Math.min(1.8, +(z + 0.1).toFixed(2)));
  const handleZoomOut = () => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)));
  const handleResetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedNodeId(null);
    setSelectedRel(null);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Node Icon Picker
  const getNodeIcon = (ci: ConfigurationItem) => {
    const type = (ci.typeId || ci.tipo || '').toLowerCase();
    switch (type) {
      case 'firewall': return <Shield className="w-4 h-4 text-emerald-400" />;
      case 'switch': return <Network className="w-4 h-4 text-blue-400" />;
      case 'roteador':
      case 'router': return <Radio className="w-4 h-4 text-emerald-400" />;
      case 'servidor':
      case 'server': return <Server className="w-4 h-4 text-blue-400" />;
      case 'banco_de_dados': return <Database className="w-4 h-4 text-blue-400" />;
      case 'access_point': return <Wifi className="w-4 h-4 text-amber-400" />;
      case 'computador':
      case 'workstation': return <Monitor className="w-4 h-4 text-blue-400" />;
      case 'notebook': return <Laptop className="w-4 h-4 text-blue-400" />;
      case 'smartphone':
      case 'celular': return <Smartphone className="w-4 h-4 text-blue-400" />;
      case 'impressora':
      case 'printer': return <Printer className="w-4 h-4 text-teal-400" />;
      case 'vpn': return <Lock className="w-4 h-4 text-purple-400" />;
      case 'link_internet':
      case 'internet': return <Globe className="w-4 h-4 text-blue-400" />;
      case 'ups':
      case 'nobreak': return <BatteryCharging className="w-4 h-4 text-emerald-400" />;
      case 'storage': return <HardDrive className="w-4 h-4 text-amber-400" />;
      default: return <Server className="w-4 h-4 text-slate-300" />;
    }
  };

  // Render status badge indicator dot
  const renderStatusDot = (status: ConfigurationItem['status'], isOnline?: boolean) => {
    if (status === 'indisponivel' || isOnline === false) {
      return (
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse" />
          <span className="text-[10px] font-bold text-red-400">🔴 OFFLINE</span>
        </span>
      );
    }
    if (status === 'atencao') {
      return (
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          <span className="text-[10px] font-bold text-amber-400">🟡 ALERTA</span>
        </span>
      );
    }
    if (status === 'operacional' || isOnline === true) {
      return (
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="text-[10px] font-bold text-emerald-400">🟢 ONLINE</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
        <span className="text-[10px] font-medium text-slate-400">⚪ UNKNOWN</span>
      </span>
    );
  };

  // Evidence badge styling
  const getEvidenceBadge = (rel: CIRelationship) => {
    const source = (rel.evidence_source || rel.evidenceDetails?.sourceType || 'AGENT').toUpperCase();
    const conf = rel.confianca !== undefined ? Math.round(rel.confianca * 100) : rel.confidence !== undefined ? Math.round(rel.confidence * 100) : 100;
    const isManual = rel.isManual || rel.manualLocked || source === 'MANUAL' || rel.evidenceDetails?.sourceType === 'MANUAL_AUDIT';

    if (isManual) {
      return {
        label: 'MANUAL 🔒',
        color: 'bg-amber-950/80 text-amber-300 border-amber-700',
        lineColor: '#f59e0b',
        conf: `${conf}%`,
        source: 'MANUAL',
        isManual: true
      };
    }
    if (source.includes('LLDP')) {
      return {
        label: `LLDP ${conf}%`,
        color: 'bg-blue-950/80 text-blue-300 border-blue-700',
        lineColor: '#3b82f6',
        conf: `${conf}%`,
        source: 'LLDP',
        isManual: false
      };
    }
    if (source.includes('CDP')) {
      return {
        label: `CDP ${conf}%`,
        color: 'bg-cyan-950/80 text-cyan-300 border-cyan-700',
        lineColor: '#06b6d4',
        conf: `${conf}%`,
        source: 'CDP',
        isManual: false
      };
    }
    if (source.includes('ARP')) {
      return {
        label: `ARP ${conf}%`,
        color: 'bg-emerald-950/80 text-emerald-300 border-emerald-700',
        lineColor: '#10b981',
        conf: `${conf}%`,
        source: 'ARP',
        isManual: false
      };
    }
    if (source.includes('SNMP')) {
      return {
        label: `SNMP ${conf}%`,
        color: 'bg-teal-950/80 text-teal-300 border-teal-700',
        lineColor: '#14b8a6',
        conf: `${conf}%`,
        source: 'SNMP',
        isManual: false
      };
    }
    return {
      label: `AGENT ${conf}%`,
      color: 'bg-indigo-950/80 text-indigo-300 border-indigo-700',
      lineColor: '#6366f1',
      conf: `${conf}%`,
      source: 'AGENT',
      isManual: false
    };
  };

  // Active Selected CI
  const activeCi = selectedNodeId ? getItem(selectedNodeId) : null;

  // Filtered network topology relationships
  const topologyRelationships = useMemo(() => {
    return localRelationships.filter(rel => {
      const srcId = rel.origem || rel.sourceCiId;
      const tgtId = rel.destino || rel.targetCiId;
      if (rel.tipo === 'ASSET_TO_SOFTWARE' || rel.tipo === 'ASSET_TO_TICKET' || rel.tipo === 'ASSET_TO_WARRANTY' || rel.tipo === 'ASSET_TO_MAINTENANCE') {
        return false;
      }
      return Boolean(srcId && tgtId);
    });
  }, [localRelationships]);

  const isLineHighlighted = (sourceId: string, targetId: string) => {
    if (!selectedNodeId) return false;
    return sourceId === selectedNodeId || targetId === selectedNodeId;
  };

  // Node Selection
  const handleNodeClick = (ci: ConfigurationItem) => {
    setSelectedNodeId(ci.id);
    setSelectedRel(null);
    onSelectCi(ci);
  };

  // Create Device Submission
  const handleConfirmCreateDevice = () => {
    if (!newDeviceName.trim()) {
      showToast('⚠️ Informe o nome do equipamento');
      return;
    }

    const newId = `ci-${Date.now()}`;
    const autoPos = {
      x: 500 + Math.floor(Math.random() * 80) - 40,
      y: 450 + Math.floor(Math.random() * 80) - 40
    };

    const newCi: ConfigurationItem = {
      id: newId,
      tenantId: 'tenant-matriz',
      clientId: 'cli-01',
      clientName: 'WorkPulse Matriz',
      unit: 'Sede Principal',
      code: `CI-${(localItems.length + 1).toString().padStart(2, '0')}`,
      name: newDeviceName.trim(),
      typeId: newDeviceType as any,
      typeGroup: 'hardware',
      typeName: newDeviceType.toUpperCase(),
      status: newDeviceStatus,
      criticality: 'media',
      layer: 'acesso',
      manufacturer: newDeviceVendor.trim() || 'Cisco / Dell',
      model: newDeviceModel.trim() || 'Padrão Corporativo',
      serialNumber: `SN-${Date.now().toString().slice(-6)}`,
      assetTag: newDeviceAssetTag.trim() || `PAT-${Date.now().toString().slice(-4)}`,
      hostname: newDeviceName.toLowerCase().replace(/\s+/g, '-'),
      ipAddress: newDeviceIp.trim() || '192.168.1.150',
      macAddress: newDeviceMac.trim() || '00:1A:2B:3C:4D:5E',
      location: 'Matriz - Data Center / Escritório',
      responsible: 'Equipe de Infraestrutura & TI',
      department: 'TI & Redes',
      operatingSystem: 'Network OS / Firmware',
      dynamicAttributes: {},
      linkedTicketsCount: 0,
      canvasPosition: autoPos,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLocalItems(prev => [newCi, ...prev]);
    setNodePositions(prev => ({ ...prev, [newId]: autoPos }));
    setSelectedNodeId(newId);

    if (onCreateCi) {
      onCreateCi(newCi);
    }

    setShowAddDeviceModal(false);
    // Reset inputs
    setNewDeviceName('');
    setNewDeviceVendor('');
    setNewDeviceModel('');
    setNewDeviceAssetTag('');
    setNewDeviceMac('');
    showToast(`✅ Equipamento "${newCi.name}" incluído na topologia!`);
  };

  // Create Connection Submission
  const handleConfirmCreateConnection = () => {
    if (!newRelSource || !newRelTarget) {
      showToast('⚠️ Selecione a Origem e o Destino da conexão');
      return;
    }
    if (newRelSource === newRelTarget) {
      showToast('⚠️ Origem e Destino não podem ser o mesmo equipamento');
      return;
    }

    const srcItem = getItem(newRelSource);
    const tgtItem = getItem(newRelTarget);

    const newRelId = `rel-${Date.now()}`;
    const newRelationship: CIRelationship = {
      id: newRelId,
      tenantId: 'tenant-matriz',
      sourceCiId: newRelSource,
      targetCiId: newRelTarget,
      origem: newRelSource,
      destino: newRelTarget,
      sourceCiName: srcItem?.name || srcItem?.nome || newRelSource,
      sourceCiCode: srcItem?.code || 'CI-SRC',
      targetCiName: tgtItem?.name || tgtItem?.nome || newRelTarget,
      targetCiCode: tgtItem?.code || 'CI-TGT',
      tipo: newRelType as any,
      type: newRelType,
      evidencia: 'CONFIRMED',
      confianca: 1.0,
      confidence: 1.0,
      criticality: 'media',
      evidence_source: newRelSourceType as any,
      isManual: newRelSourceType === 'MANUAL',
      manualLocked: newRelSourceType === 'MANUAL',
      evidenceDetails: {
        sourceType: newRelSourceType,
        detectedBy: 'WorkPulse Manual Topology Editor',
        proof: `Cabo configurado manualmente (${newRelSpeed}) entre portas validadas.`,
        verifiedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLocalRelationships(prev => [newRelationship, ...prev]);
    setSelectedRel(newRelationship);

    if (onCreateRelationship) {
      onCreateRelationship(newRelationship);
    }

    setShowAddConnectionModal(false);
    showToast(`🔗 Conexão criada entre ${newRelationship.sourceCiName} e ${newRelationship.targetCiName}!`);
  };

  // Edit Device Save
  const handleSaveEditedDevice = () => {
    if (!editingCi) return;

    setLocalItems(prev => prev.map(i => i.id === editingCi.id ? editingCi : i));
    if (onUpdateCi) {
      onUpdateCi(editingCi.id, editingCi);
    }

    setShowEditDeviceModal(false);
    showToast(`✏️ Dados do equipamento "${editingCi.name}" atualizados!`);
  };

  // Delete Device
  const handleDeleteCurrentNode = (nodeId: string) => {
    const item = getItem(nodeId);
    if (!confirm(`Deseja realmente remover o nó "${item?.name || nodeId}" da topologia?`)) return;

    setLocalItems(prev => prev.filter(i => i.id !== nodeId));
    setLocalRelationships(prev => prev.filter(r => (r.origem || r.sourceCiId) !== nodeId && (r.destino || r.targetCiId) !== nodeId));
    setSelectedNodeId(null);

    if (onDeleteCi) {
      onDeleteCi(nodeId);
    }
    showToast(`🗑️ Nó removido com sucesso.`);
  };

  // Delete Relationship
  const handleDeleteCurrentRel = (relId: string) => {
    setLocalRelationships(prev => prev.filter(r => r.id !== relId));
    setSelectedRel(null);
    if (onDeleteRelationship) {
      onDeleteRelationship(relId);
    }
    showToast(`🔌 Conexão desconectada.`);
  };

  // Totals & Stats
  const totalCIs = localItems.length;
  const onlineCount = localItems.filter(i => i.status === 'operacional' || i.telemetry?.isOnline).length;
  const offlineCount = localItems.filter(i => i.status === 'indisponivel' || i.telemetry?.isOnline === false).length;
  const alertCount = localItems.filter(i => i.status === 'atencao').length;
  const onlinePct = totalCIs > 0 ? Math.round((onlineCount / totalCIs) * 100) : 0;
  const offlinePct = totalCIs > 0 ? Math.round((offlineCount / totalCIs) * 100) : 0;
  const alertPct = totalCIs > 0 ? Math.round((alertCount / totalCIs) * 100) : 0;

  return (
    <div 
      ref={containerRef} 
      className={`bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden text-slate-200 shadow-xl select-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full'
      }`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-xl shadow-2xl border border-blue-400 text-xs font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Card Header & Primary Action Toolbar */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
        
        {/* Title & Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-800 flex items-center justify-center text-blue-400 shadow-sm">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Topologia da Infraestrutura
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Gêmeo Digital & Telemetria CMDB
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>Cadeia real ITIL com evidências validadas:</span>
              <span className="font-mono text-slate-300 text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                PC ↓ SWITCH ↓ SWITCH-CORE ↓ FIREWALL ↓ ROUTER ↓ INTERNET
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls & Interactive Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* PRIMARY BUTTON 1: ADICIONAR EQUIPAMENTO */}
          <button
            onClick={() => setShowAddDeviceModal(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/30 cursor-pointer"
            title="Adicionar novo nó / equipamento na topologia"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Equipamento</span>
          </button>

          {/* PRIMARY BUTTON 2: CONECTAR DISPOSITIVOS */}
          <button
            onClick={() => setShowAddConnectionModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-900/30 cursor-pointer"
            title="Criar cabo ou enlace entre dois equipamentos"
          >
            <Cable className="w-4 h-4" />
            <span>Conectar</span>
          </button>

          {/* AUTO-ORGANIZE BUTTON */}
          <button
            onClick={handleAutoOrganizeLayout}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Auto-organizar layout na hierarquia ITIL"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Auto-Organizar</span>
          </button>

          {/* SAVE BUTTON */}
          <button
            onClick={handleSaveLayout}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Salvar Posições no Navegador"
          >
            <Save className="w-4 h-4 text-emerald-400" />
          </button>

          {/* EDIT MODE TOGGLE */}
          <button
            onClick={() => {
              setIsEditMode(!isEditMode);
              showToast(isEditMode ? '🔒 Modo visualização (arraste bloqueado)' : '🔓 Modo edição ativado (arraste e conecte livremente)');
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isEditMode 
                ? 'bg-amber-950/80 border-amber-700 text-amber-300 shadow-xs' 
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
            title="Alternar entre modo de edição (arrastar) e visualização"
          >
            {isEditMode ? <Unlock className="w-3.5 h-3.5" /> : <LockKeyhole className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isEditMode ? 'Edição Livre' : 'Bloqueado'}</span>
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Quick Evidence Filter */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
            <span className="text-slate-500 text-[10px] px-1 font-semibold uppercase">Filtro:</span>
            {['all', 'LLDP', 'CDP', 'ARP', 'SNMP', 'AGENT', 'MANUAL'].map(src => (
              <button
                key={src}
                onClick={() => setFilterType(src)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                  filterType === src ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {src.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Reset Zoom */}
          <button
            onClick={handleResetZoom}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Recentralizar Visualização"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Zoom In & Out */}
          <button
            onClick={handleZoomIn}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Diminuir Zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title={isFullscreen ? "Sair da Tela Cheia" : "Modo Tela Cheia"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* 2D / 3D pill toggle */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setViewMode('2D')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                viewMode === '2D' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2D
            </button>
            <button
              onClick={() => setViewMode('3D')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                viewMode === '3D' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3D
            </button>
          </div>

        </div>
      </div>

      {/* Main Container: Split into Left Graph Canvas and Right Stats Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-[660px] bg-slate-950 relative overflow-hidden">
        
        {/* ========================================================
            LEFT COLUMN: THE INTERACTIVE TOPOLOGY GRAPH CANVAS
           ======================================================== */}
        <div 
          className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 relative bg-[#090d16] overflow-hidden"
        >
          {/* Subtle Grid Background */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage: 'radial-gradient(#3b82f6 1.2px, transparent 1.2px)',
              backgroundSize: '24px 24px'
            }}
          />

          {/* Evidence Notification & Helper Bar */}
          <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-300 flex-wrap gap-2 z-20">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Conexões Baseadas em Evidências Reais
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">Total de Relacionamentos: <strong className="text-white">{topologyRelationships.length}</strong></span>
              <span className="text-slate-500">|</span>
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <Move className="w-3 h-3" />
                Clique e arraste qualquer nó para reposicionar
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> LLDP</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> CDP</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> ARP</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500" /> SNMP</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> AGENT</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> MANUAL 🔒</span>
            </div>
          </div>

          {/* Canvas Viewport with Zoom & Pan transform */}
          <div 
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            className={`flex-1 w-full overflow-hidden relative select-none cursor-grab active:cursor-grabbing p-6 ${
              isDraggingNode ? 'cursor-grabbing' : ''
            }`}
            style={{ minHeight: '600px' }}
          >
            <div 
              className={`relative mx-auto transition-transform duration-75 ease-out origin-top ${
                viewMode === '3D' ? 'perspective-1000 rotate-x-12' : ''
              }`}
              style={{
                width: '1200px',
                height: '1000px',
                transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transformOrigin: '50% 50%'
              }}
            >
              {/* SVG Connecting Cables & Dynamic Evidence Links Layer */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                <defs>
                  <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <linearGradient id="cable-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>

                {/* Render Dynamic Evidence-Based Cables from Relationships */}
                {topologyRelationships.map((rel, rIdx) => {
                  const srcId = rel.origem || rel.sourceCiId;
                  const tgtId = rel.destino || rel.targetCiId;
                  const srcPos = getNodeCoordinates(srcId, rIdx);
                  const tgtPos = getNodeCoordinates(tgtId, rIdx + 1);

                  if (!srcPos || !tgtPos) return null;

                  const badgeInfo = getEvidenceBadge(rel);
                  const isHighlighted = isLineHighlighted(srcId, tgtId);
                  const isFiltered = filterType !== 'all' && badgeInfo.source !== filterType;

                  if (isFiltered) return null;

                  // Midpoint for badge position
                  const midX = (srcPos.x + tgtPos.x) / 2;
                  const midY = (srcPos.y + tgtPos.y) / 2;

                  return (
                    <g key={rel.id} className="pointer-events-auto group cursor-pointer" onClick={() => setSelectedRel(rel)}>
                      {/* Interactive Cable Path */}
                      <path
                        d={`M ${srcPos.x} ${srcPos.y} L ${tgtPos.x} ${tgtPos.y}`}
                        stroke={isHighlighted ? '#60a5fa' : badgeInfo.lineColor}
                        strokeWidth={isHighlighted ? 3.5 : 2}
                        strokeDasharray={badgeInfo.isManual ? '6 4' : rel.tipo?.includes('WIFI') || rel.tipo?.includes('USER') ? '4 4' : 'none'}
                        strokeLinecap="round"
                        className="transition-all hover:stroke-white opacity-85 hover:opacity-100"
                        filter={isHighlighted ? 'url(#glow-blue)' : undefined}
                      />
                      
                      {/* Evidence Tag Marker Badge */}
                      <g transform={`translate(${midX - 32}, ${midY - 9})`}>
                        <rect
                          width="64"
                          height="18"
                          rx="9"
                          className={`${badgeInfo.color} fill-slate-950/90 stroke-current stroke-1 cursor-pointer transition-all group-hover:scale-110`}
                        />
                        <text
                          x="32"
                          y="12"
                          textAnchor="middle"
                          className="text-[9px] font-mono font-bold fill-current tracking-tighter pointer-events-none"
                        >
                          {badgeInfo.label}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>

              {/* ===================================================
                  RENDER ALL DYNAMICALLY DRAGGABLE TOPOLOGY NODES
                 =================================================== */}
              {localItems.map((item, idx) => {
                const pos = getNodeCoordinates(item.id, idx);
                const isSelected = selectedNodeId === item.id;
                const isOffline = item.status === 'indisponivel' || item.telemetry?.isOnline === false;
                const isAlert = item.status === 'atencao';

                return (
                  <div
                    key={item.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, item.id)}
                    onClick={() => handleNodeClick(item)}
                    style={{
                      left: `${pos.x - 100}px`,
                      top: `${pos.y - 30}px`,
                      width: '200px'
                    }}
                    className={`topology-node absolute z-20 cursor-move transition-all ${
                      isSelected 
                        ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-950 scale-105 z-30' 
                        : 'hover:scale-105 hover:z-25'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl shadow-xl flex items-center gap-2.5 border transition-all ${
                      isOffline 
                        ? 'bg-red-950/80 border-red-800/90 hover:border-red-500' 
                        : isAlert
                        ? 'bg-amber-950/80 border-amber-800/90 hover:border-amber-500'
                        : 'bg-slate-900/95 border-slate-700/80 hover:border-blue-500'
                    }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isOffline 
                          ? 'bg-red-950 border-red-700 text-red-400' 
                          : isAlert
                          ? 'bg-amber-950 border-amber-700 text-amber-400'
                          : 'bg-blue-950/80 border-blue-800 text-blue-400'
                      }`}>
                        {getNodeIcon(item)}
                      </div>

                      <div className="overflow-hidden flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-white text-xs truncate">{item.name || item.nome}</span>
                          {isOffline ? (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.9)] shrink-0" />
                          ) : isAlert ? (
                            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] shrink-0" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {item.manufacturer || item.fabricante || 'Device'} {item.model || item.modelo || ''}
                        </div>
                        <div className="flex items-center justify-between text-[9px] mt-0.5">
                          <span className="text-blue-400 font-mono truncate">IP: {item.ipAddress || '192.168.1.x'}</span>
                          <span className="text-amber-400 font-mono text-[8px] truncate">{item.assetTag || item.asset || ''}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

          {/* Bottom Sub-tabs Navigation */}
          <div className="bg-slate-950 border-t border-slate-800 px-4 py-2 flex items-center justify-between flex-wrap gap-2 z-20">
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { id: 'topologia', label: 'Topologia' },
                { id: 'relacionamentos', label: 'Relacionamentos' },
                { id: 'dependencias', label: 'Dependências' },
                { id: 'impacto', label: 'Impacto' },
                { id: 'historico', label: 'Histórico' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => onSubTabChange(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeSubTab === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Selected Relationship Quick Evidence Pill */}
            {selectedRel && (
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 text-xs flex-wrap">
                <span className="text-slate-400">Relação Selecionada:</span>
                <span className="font-bold text-white">{selectedRel.sourceCiName || selectedRel.sourceCiId} → {selectedRel.targetCiName || selectedRel.targetCiId}</span>
                <span className="text-blue-400 font-mono text-[11px] font-bold">
                  [{selectedRel.evidence_source || selectedRel.evidenceDetails?.sourceType || 'AGENT'}]
                </span>
                <button 
                  onClick={() => setShowEvidenceModal(true)}
                  className="px-2 py-0.5 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                >
                  Ver Evidência
                </button>
                <button 
                  onClick={() => handleDeleteCurrentRel(selectedRel.id)}
                  className="px-2 py-0.5 bg-red-950 hover:bg-red-900 text-red-300 rounded text-[10px] font-bold transition-colors cursor-pointer"
                >
                  Excluir Cabo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN: STATS & ASSET QUICK INSPECTOR
           ======================================================== */}
        <div className="w-full lg:w-80 bg-slate-950 p-4 space-y-5 shrink-0 text-xs overflow-y-auto border-l border-slate-800/80">
          
          {/* ASSET FILE QUICK INSPECTOR (When Node is Clicked) */}
          {activeCi ? (
            <div className="bg-slate-900/90 border border-blue-800/60 rounded-xl p-3.5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-950 border border-blue-700 flex items-center justify-center text-blue-400">
                    {getNodeIcon(activeCi)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs truncate max-w-[170px]">{activeCi.name || activeCi.nome}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">{activeCi.code || activeCi.id}</span>
                  </div>
                </div>
                {renderStatusDot(activeCi.status, activeCi.telemetry?.isOnline)}
              </div>

              {/* Attributes & Specs */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between py-0.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Tipo:</span>
                  <span className="text-slate-200 font-semibold capitalize">{activeCi.tipo || activeCi.typeId}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/50">
                  <span className="text-slate-400">IP:</span>
                  <span className="text-blue-400 font-mono font-bold">{activeCi.ipAddress || '192.168.1.x'}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/50">
                  <span className="text-slate-400">MAC Address:</span>
                  <span className="text-slate-300 font-mono">{activeCi.macAddress || '00:00:00:00:00:00'}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Fabricante:</span>
                  <span className="text-slate-200 font-medium">{activeCi.fabricante || activeCi.manufacturer || 'Dell Inc.'}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Modelo:</span>
                  <span className="text-slate-200">{activeCi.modelo || activeCi.model || 'Padrão'}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Usuário Responsável:</span>
                  <span className="text-slate-200 font-medium">{activeCi.usuarioResponsavel || activeCi.responsible || 'Equipe TI'}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Localização:</span>
                  <span className="text-slate-200">{activeCi.localizacao || activeCi.location || 'Matriz - 1º Andar'}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Patrimônio / Tombo:</span>
                  <span className="text-amber-400 font-mono font-bold">{activeCi.asset || activeCi.assetTag || 'PAT-2026-0001'}</span>
                </div>
              </div>

              {/* Action Buttons: Open Ficha / Edit / Delete */}
              <div className="space-y-1.5 pt-1">
                <button
                  onClick={() => onSelectCi(activeCi)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <span>Abrir Ficha Completa do Ativo</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      setEditingCi(activeCi);
                      setShowEditDeviceModal(true);
                    }}
                    className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer border border-slate-700"
                  >
                    <Edit3 className="w-3 h-3 text-amber-400" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCurrentNode(activeCi.id)}
                    className="py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer border border-red-800/60"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                    <span>Excluir Nó</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center space-y-2">
              <Move className="w-6 h-6 text-blue-400 mx-auto" />
              <div className="font-bold text-white text-xs">Nenhum equipamento selecionado</div>
              <p className="text-[11px] text-slate-400">
                Clique em qualquer nó da topologia para inspecionar, editar atributos ou criar novas conexões.
              </p>
            </div>
          )}

          {/* 1. LEGENDA DE STATUS */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Status de Conectividade</h3>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span className="text-slate-200 font-semibold">🟢 ONLINE</span>
                <span className="text-slate-500 ml-auto">Dispositivo ativo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-slate-200 font-semibold">🟡 ALERTA</span>
                <span className="text-slate-500 ml-auto">Alta latência / CPU</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                <span className="text-slate-200 font-semibold">🔴 OFFLINE</span>
                <span className="text-slate-500 ml-auto">Sem resposta ping</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span className="text-slate-200 font-semibold">⚪ UNKNOWN</span>
                <span className="text-slate-500 ml-auto">Não monitorado</span>
              </div>
            </div>
          </div>

          {/* 2. LEGENDA DE FONTES DE EVIDÊNCIA */}
          <div className="pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Fontes de Evidência</h3>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-blue-300 font-mono">
                🏷️ LLDP (100%)
              </div>
              <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-mono">
                🏷️ CDP (95%)
              </div>
              <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-emerald-300 font-mono">
                🏷️ ARP (92%)
              </div>
              <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-teal-300 font-mono">
                🏷️ SNMP (90%)
              </div>
              <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-indigo-300 font-mono">
                🤖 AGENT (100%)
              </div>
              <div className="p-1.5 rounded bg-slate-900 border border-amber-800/80 text-amber-300 font-mono">
                ✍️ MANUAL 🔒
              </div>
            </div>
          </div>

          {/* 3. RESUMO EXECUTIVO */}
          <div className="pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Resumo da Infraestrutura</h3>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total de Equipamentos:</span>
                <span className="text-base font-black text-white">{totalCIs}</span>
              </div>

              {/* Online Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="text-slate-300 font-medium">Online</span>
                  <span className="font-bold text-emerald-400">{onlineCount} ({onlinePct}%)</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${onlinePct}%` }} />
                </div>
              </div>

              {/* Offline Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="text-slate-300 font-medium">Offline</span>
                  <span className="font-bold text-red-400">{offlineCount} ({offlinePct}%)</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full transition-all" style={{ width: `${offlinePct}%` }} />
                </div>
              </div>

              {/* In Alert Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="text-slate-300 font-medium">Em Alerta</span>
                  <span className="font-bold text-amber-400">{alertCount} ({alertPct}%)</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${alertPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* 4. INFORMAÇÃO DO CLIENTE */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Informação do Cliente</h3>
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>WorkPulse Matriz</span>
              </div>
              <div className="text-slate-400 text-[10px] font-mono">
                CNPJ: 12.345.678/0001-90
              </div>
              <div className="text-slate-400 text-[10px]">
                Unidade: <strong className="text-slate-200">Sede Principal</strong> (São Paulo - SP)
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* =========================================================
          MODAL 1: ADICIONAR NOVO EQUIPAMENTO / NÓ NA TOPOLOGIA
         ========================================================= */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Adicionar Equipamento na Topologia</h3>
                  <p className="text-xs text-slate-400">Cadastre um novo dispositivo de rede ou estação</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddDeviceModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Type selector */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tipo de Dispositivo</label>
                <select
                  value={newDeviceType}
                  onChange={(e) => setNewDeviceType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="switch">Switch de Distribuição / Acesso</option>
                  <option value="router">Roteador Gateway WAN</option>
                  <option value="firewall">Firewall NGFW</option>
                  <option value="access_point">Access Point Wi-Fi</option>
                  <option value="server">Servidor (Linux / Windows Server)</option>
                  <option value="banco_de_dados">Banco de Dados (SQL Server / Oracle / Postgres)</option>
                  <option value="workstation">Estação de Trabalho (Desktop PC)</option>
                  <option value="notebook">Notebook Corporativo</option>
                  <option value="printer">Impressora de Rede</option>
                  <option value="vpn">Acesso Remoto / Concentrador VPN</option>
                  <option value="link_internet">Link de Internet (ISP Provedor)</option>
                  <option value="ups">Nobreak (UPS)</option>
                  <option value="storage">Storage NAS / SAN</option>
                </select>
              </div>

              {/* Name & IP */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome / Hostname *</label>
                  <input
                    type="text"
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    placeholder="Ex: Switch-03-Andar2"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Endereço IP</label>
                  <input
                    type="text"
                    value={newDeviceIp}
                    onChange={(e) => setNewDeviceIp(e.target.value)}
                    placeholder="192.168.1.55"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Vendor & Model */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Fabricante</label>
                  <input
                    type="text"
                    value={newDeviceVendor}
                    onChange={(e) => setNewDeviceVendor(e.target.value)}
                    placeholder="Cisco / Dell / HP / Ubiquiti"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Modelo</label>
                  <input
                    type="text"
                    value={newDeviceModel}
                    onChange={(e) => setNewDeviceModel(e.target.value)}
                    placeholder="Catalyst 2960 / PowerEdge"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* MAC & Asset Tag */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">MAC Address</label>
                  <input
                    type="text"
                    value={newDeviceMac}
                    onChange={(e) => setNewDeviceMac(e.target.value)}
                    placeholder="00:1A:2B:3C:4D:5E"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Plaqueta / Tombo</label>
                  <input
                    type="text"
                    value={newDeviceAssetTag}
                    onChange={(e) => setNewDeviceAssetTag(e.target.value)}
                    placeholder="PAT-2026-0099"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Status Operacional</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewDeviceStatus('operacional')}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border cursor-pointer ${
                      newDeviceStatus === 'operacional' 
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300' 
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>🟢 Online</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDeviceStatus('atencao')}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border cursor-pointer ${
                      newDeviceStatus === 'atencao' 
                        ? 'bg-amber-950 border-amber-500 text-amber-300' 
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>🟡 Alerta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDeviceStatus('indisponivel')}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border cursor-pointer ${
                      newDeviceStatus === 'indisponivel' 
                        ? 'bg-red-950 border-red-500 text-red-300' 
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>🔴 Offline</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAddDeviceModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCreateDevice}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/40 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar ao Mapa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: ADICIONAR NOVA CONEXÃO / CABO ENTRE NÓS
         ========================================================= */}
      {showAddConnectionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-700 flex items-center justify-center text-blue-400">
                  <Cable className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Conectar Dispositivos de Rede</h3>
                  <p className="text-xs text-slate-400">Crie um enlace físico ou lógico com evidência validada</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddConnectionModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Source & Target Dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Origem (De:)</label>
                  <select
                    value={newRelSource}
                    onChange={(e) => setNewRelSource(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="">Selecione o equipamento...</option>
                    {localItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name || item.nome} ({item.ipAddress || 'Sem IP'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Destino (Para:)</label>
                  <select
                    value={newRelTarget}
                    onChange={(e) => setNewRelTarget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="">Selecione o equipamento...</option>
                    {localItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name || item.nome} ({item.ipAddress || 'Sem IP'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Type & Evidence Source */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo de Enlace</label>
                  <select
                    value={newRelType}
                    onChange={(e) => setNewRelType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="CONECTADO_A">FÍSICA (Cabo UTP / Fibra)</option>
                    <option value="ROTEADO_PARA">LÓGICA (VLAN / Roteamento)</option>
                    <option value="WIFI_ASSOCIADO">WIRELESS (Wi-Fi 802.11ax)</option>
                    <option value="TUNEL_VPN">TÚNEL VPN / IPsec</option>
                    <option value="LINK_INTERNET">LINK WAN / ISP Provedor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Protocolo / Evidência</label>
                  <select
                    value={newRelSourceType}
                    onChange={(e) => setNewRelSourceType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="AGENT">🤖 AGENT (Telemetria do Agente)</option>
                    <option value="LLDP">🏷️ LLDP (Link Layer Discovery)</option>
                    <option value="CDP">🏷️ CDP (Cisco Discovery Protocol)</option>
                    <option value="SNMP">🏷️ SNMP (Tabela MIB do Switch)</option>
                    <option value="ARP">🏷️ ARP Table</option>
                    <option value="MANUAL">✍️ MANUAL 🔒 (Auditoria de TI)</option>
                  </select>
                </div>
              </div>

              {/* Speed & Cable */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Velocidade & Detalhes</label>
                <input
                  type="text"
                  value={newRelSpeed}
                  onChange={(e) => setNewRelSpeed(e.target.value)}
                  placeholder="Ex: 10 Gbps Fibra OM4 / 1 Gbps CAT6"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAddConnectionModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCreateConnection}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-900/40 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Criar Conexão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 3: EDITAR DADOS DO EQUIPAMENTO
         ========================================================= */}
      {showEditDeviceModal && editingCi && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-700 flex items-center justify-center text-amber-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Editar Ativo / Equipamento</h3>
                  <p className="text-xs text-slate-400">{editingCi.name || editingCi.nome}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditDeviceModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome</label>
                  <input
                    type="text"
                    value={editingCi.name || editingCi.nome || ''}
                    onChange={(e) => setEditingCi({ ...editingCi, name: e.target.value, nome: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Endereço IP</label>
                  <input
                    type="text"
                    value={editingCi.ipAddress || ''}
                    onChange={(e) => setEditingCi({ ...editingCi, ipAddress: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Fabricante</label>
                  <input
                    type="text"
                    value={editingCi.manufacturer || editingCi.fabricante || ''}
                    onChange={(e) => setEditingCi({ ...editingCi, manufacturer: e.target.value, fabricante: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Modelo</label>
                  <input
                    type="text"
                    value={editingCi.model || editingCi.modelo || ''}
                    onChange={(e) => setEditingCi({ ...editingCi, model: e.target.value, modelo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">MAC Address</label>
                  <input
                    type="text"
                    value={editingCi.macAddress || ''}
                    onChange={(e) => setEditingCi({ ...editingCi, macAddress: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Patrimônio / Tombo</label>
                  <input
                    type="text"
                    value={editingCi.assetTag || editingCi.asset || ''}
                    onChange={(e) => setEditingCi({ ...editingCi, assetTag: e.target.value, asset: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Status Operacional</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCi({ ...editingCi, status: 'operacional' })}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border cursor-pointer ${
                      editingCi.status === 'operacional' 
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300' 
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>🟢 Online</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCi({ ...editingCi, status: 'atencao' })}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border cursor-pointer ${
                      editingCi.status === 'atencao' 
                        ? 'bg-amber-950 border-amber-500 text-amber-300' 
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>🟡 Alerta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCi({ ...editingCi, status: 'indisponivel' })}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border cursor-pointer ${
                      editingCi.status === 'indisponivel' 
                        ? 'bg-red-950 border-red-500 text-red-300' 
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>🔴 Offline</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowEditDeviceModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditedDevice}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-900/40 cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 4: DETALHES DE EVIDÊNCIA DA CONEXÃO
         ========================================================= */}
      {showEvidenceModal && selectedRel && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-sm">Registro de Evidência da Conexão</h3>
              </div>
              <button 
                onClick={() => setShowEvidenceModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400">Origem → Destino:</div>
                  <div className="font-bold text-white">{selectedRel.sourceCiName || selectedRel.sourceCiId} → {selectedRel.targetCiName || selectedRel.targetCiId}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Tipo de Conexão:</div>
                  <div className="font-mono text-blue-400 font-bold">{selectedRel.tipo || selectedRel.type}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Protocolo / Fonte:</div>
                  <div className="font-bold text-emerald-400">{selectedRel.evidence_source || selectedRel.evidenceDetails?.sourceType || 'AGENT'}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Índice de Confiança:</div>
                  <div className="font-bold text-white">{selectedRel.confianca ? `${Math.round(selectedRel.confianca * 100)}%` : '100% (CONFIRMADO)'}</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 font-semibold">Comprovante Técnico (Payload / Prova):</div>
                <div className="text-[11px] font-mono text-slate-300 bg-slate-900 p-2 rounded border border-slate-800">
                  {selectedRel.evidenceDetails?.proof || selectedRel.description || 'Validado por telemetria de rede e ARP table'}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Detectado por: <strong>{selectedRel.evidenceDetails?.detectedBy || 'WorkPulse Network Discovery'}</strong></span>
                <span>Data: {new Date(selectedRel.criado_em || selectedRel.createdAt || Date.now()).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
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
