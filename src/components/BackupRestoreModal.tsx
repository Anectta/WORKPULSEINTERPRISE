/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  FileJson, 
  Trash2, 
  HardDrive, 
  Sparkles, 
  Settings, 
  FileText, 
  Copy, 
  Check, 
  ArrowRight, 
  X, 
  AlertOctagon,
  Eye,
  History,
  Info,
  Server
} from 'lucide-react';
import { 
  WorkPulseBackupPayload, 
  BackupSnapshotItem, 
  AutoBackupConfig, 
  CurrentUser 
} from '../types';
import { 
  generateBackupPayload, 
  downloadBackupAsJson, 
  saveLocalSnapshot, 
  getLocalSnapshots, 
  deleteLocalSnapshot, 
  clearAllSnapshots, 
  getAutoBackupConfig, 
  updateAutoBackupConfig, 
  validateBackupPayload, 
  restoreBackupPayload, 
  resetToFactoryDefaults, 
  getStorageUsageEstimate 
} from '../utils/backupManager';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: CurrentUser;
  onRestoreSuccess?: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRestoreSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'auto_snapshots' | 'export_json' | 'import_restore' | 'storage_diag'>('auto_snapshots');
  const [snapshots, setSnapshots] = useState<BackupSnapshotItem[]>([]);
  const [autoConfig, setAutoConfig] = useState<AutoBackupConfig>(getAutoBackupConfig());
  const [storageStats, setStorageStats] = useState(getStorageUsageEstimate());
  
  // Action Feedback States
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Import / File State
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [validatedImport, setValidatedImport] = useState<{
    isValid: boolean;
    errors: string[];
    payload?: WorkPulseBackupPayload;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detailed Snapshot View Modal / Popover
  const [inspectingSnapshot, setInspectingSnapshot] = useState<BackupSnapshotItem | null>(null);

  // Restore Confirmation Dialog State
  const [confirmRestoreTarget, setConfirmRestoreTarget] = useState<{
    payload: WorkPulseBackupPayload;
    sourceName: string;
  } | null>(null);

  // Reset Confirmation State
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // Reload snapshots & storage stats when opening modal or tab changes
  const reloadData = () => {
    setSnapshots(getLocalSnapshots());
    setAutoConfig(getAutoBackupConfig());
    setStorageStats(getStorageUsageEstimate());
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
      setActionSuccessMsg(null);
      setActionErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showFeedback = (msg: string, isError = false) => {
    if (isError) {
      setActionErrorMsg(msg);
      setActionSuccessMsg(null);
    } else {
      setActionSuccessMsg(msg);
      setActionErrorMsg(null);
    }
    setTimeout(() => {
      setActionSuccessMsg(null);
      setActionErrorMsg(null);
    }, 4500);
  };

  // Instant Manual Backup
  const handleCreateManualBackup = (downloadAfter = false) => {
    try {
      setIsProcessing(true);
      const payload = generateBackupPayload(currentUser);
      const snap = saveLocalSnapshot(payload, 'manual', `Backup Manual (${new Date().toLocaleTimeString('pt-BR')})`);
      reloadData();
      
      if (downloadAfter) {
        downloadBackupAsJson(payload);
        showFeedback('Backup manual gerado e arquivo JSON baixado com sucesso!');
      } else {
        showFeedback(`Snapshot salvo com sucesso! (${(snap.sizeBytes / 1024).toFixed(1)} KB)`);
      }
    } catch (e: any) {
      showFeedback('Erro ao gerar backup: ' + e.message, true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle Auto Backup
  const handleToggleAutoBackup = (enabled: boolean) => {
    const updated = updateAutoBackupConfig({ enabled });
    setAutoConfig(updated);
    showFeedback(enabled ? 'Rotina de backup automático ativada.' : 'Backup automático pausado.');
  };

  // Update Interval
  const handleChangeInterval = (mins: number) => {
    const updated = updateAutoBackupConfig({ intervalMinutes: mins });
    setAutoConfig(updated);
    showFeedback(`Intervalo de backup atualizado para ${mins} minutos.`);
  };

  // Update Max Retention
  const handleChangeMaxSnapshots = (max: number) => {
    const updated = updateAutoBackupConfig({ maxSnapshots: max });
    setAutoConfig(updated);
    reloadData();
    showFeedback(`Retenção máxima configurada para ${max} snapshots.`);
  };

  // Delete single snapshot
  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteLocalSnapshot(id);
    reloadData();
    showFeedback('Ponto de backup removido com sucesso.');
  };

  // Clear all snapshots
  const handleClearAllSnapshots = () => {
    if (confirm('Tem certeza que deseja limpar todo o histórico de backups locais do navegador?')) {
      clearAllSnapshots();
      reloadData();
      showFeedback('Histórico de snapshots locais limpo.');
    }
  };

  // File parsing and validation
  const handleFileSelected = (file: File) => {
    setImportedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const val = validateBackupPayload(parsed);
        setValidatedImport(val);
        if (!val.isValid) {
          showFeedback('Arquivo inválido: ' + val.errors.join(', '), true);
        }
      } catch (err) {
        setValidatedImport({
          isValid: false,
          errors: ['Falha ao processar o formato JSON do arquivo.']
        });
        showFeedback('Arquivo não é um JSON válido.', true);
      }
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const handleExecuteRestore = (payload: WorkPulseBackupPayload) => {
    setIsProcessing(true);
    const success = restoreBackupPayload(payload, true, currentUser);
    setIsProcessing(false);
    setConfirmRestoreTarget(null);

    if (success) {
      showFeedback('Configurações e dados restaurados com sucesso! O sistema foi sincronizado.');
      reloadData();
      if (onRestoreSuccess) onRestoreSuccess();
    } else {
      showFeedback('Ocorreu um erro ao restaurar os dados.', true);
    }
  };

  // Execute Factory Reset
  const handleExecuteReset = () => {
    setIsProcessing(true);
    const success = resetToFactoryDefaults(true, currentUser);
    setIsProcessing(false);
    setIsConfirmingReset(false);

    if (success) {
      showFeedback('O sistema foi redefinido para as configurações padrão de fábrica (Reset Limpo).');
      reloadData();
      if (onRestoreSuccess) onRestoreSuccess();
    } else {
      showFeedback('Erro ao redefinir sistema.', true);
    }
  };

  // Copy JSON to clipboard
  const handleCopyCurrentJson = () => {
    const payload = generateBackupPayload(currentUser);
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 3000);
    showFeedback('Conteúdo JSON do backup copiado para a área de transferência!');
  };

  const currentPayloadPreview = generateBackupPayload(currentUser);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-800 dark:text-slate-100">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-md">
              <Database className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Backup & Restauração de Configurações
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30 font-mono">
                  v2.6.0
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Snapshots automáticos no navegador, exportação JSON e recuperação instantânea
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Status indicator */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{autoConfig.enabled ? 'Auto-Backup Ativo' : 'Auto-Backup Pausado'}</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {actionSuccessMsg && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2.5 flex items-center space-x-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="flex-1">{actionSuccessMsg}</span>
          </div>
        )}
        {actionErrorMsg && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2.5 flex items-center space-x-2 text-xs font-semibold text-red-600 dark:text-red-400 animate-in slide-in-from-top-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="flex-1">{actionErrorMsg}</span>
          </div>
        )}

        {/* SUB-TABS NAVIGATION */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between overflow-x-auto shrink-0 gap-2">
          <div className="flex space-x-1 py-2">
            <button
              onClick={() => setActiveTab('auto_snapshots')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'auto_snapshots'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico de Snapshots</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'auto_snapshots' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                {snapshots.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('export_json')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'export_json'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar JSON</span>
            </button>

            <button
              onClick={() => setActiveTab('import_restore')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'import_restore'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar & Restaurar</span>
            </button>

            <button
              onClick={() => setActiveTab('storage_diag')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'storage_diag'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Configurações & Diagnóstico</span>
            </button>
          </div>

          <button
            onClick={() => handleCreateManualBackup(false)}
            disabled={isProcessing}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            title="Criar um snapshot manual imediato de todas as configurações"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>Criar Snapshot Agora</span>
          </button>
        </div>

        {/* MODAL BODY CONTENT */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: AUTO SNAPSHOTS & HISTORY */}
          {activeTab === 'auto_snapshots' && (
            <div className="space-y-6">
              {/* Top Controls Box */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    autoConfig.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Rotina de Backup Automático no Navegador
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Snapshots periódicos armazenados localmente com retenção de segurança
                    </p>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2.5">
                  <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-2xs">
                    <input
                      type="checkbox"
                      checked={autoConfig.enabled}
                      onChange={(e) => handleToggleAutoBackup(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Ativado</span>
                  </label>

                  <select
                    value={autoConfig.intervalMinutes}
                    onChange={(e) => handleChangeInterval(Number(e.target.value))}
                    disabled={!autoConfig.enabled}
                    className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <option value={5}>A cada 5 minutos</option>
                    <option value={15}>A cada 15 minutos</option>
                    <option value={30}>A cada 30 minutos</option>
                    <option value={60}>A cada 1 hora</option>
                  </select>

                  <button
                    onClick={() => handleCreateManualBackup(false)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Snapshot Manual</span>
                  </button>
                </div>
              </div>

              {/* Snapshots List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono">
                      Pontos de Restauração Disponíveis ({snapshots.length})
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      (Retenção: máx {autoConfig.maxSnapshots} itens)
                    </span>
                  </div>

                  {snapshots.length > 0 && (
                    <button
                      onClick={handleClearAllSnapshots}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpar Histórico</span>
                    </button>
                  )}
                </div>

                {snapshots.length === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-800/40 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3">
                    <Database className="w-10 h-10 text-slate-400 mx-auto" />
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Nenhum snapshot local registrado ainda
                      </p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                        O WorkPulse salva automaticamente snapshots periódicos no LocalStorage ou você pode clicar em "Snapshot Manual" para criar o primeiro ponto agora.
                      </p>
                    </div>
                    <button
                      onClick={() => handleCreateManualBackup(false)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                    >
                      Criar Primeiro Ponto de Backup
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {snapshots.map((snap, idx) => {
                      const isLatest = idx === 0;
                      const dateObj = new Date(snap.timestamp);
                      const formattedDate = dateObj.toLocaleDateString('pt-BR') + ' às ' + dateObj.toLocaleTimeString('pt-BR');
                      const sizeKb = (snap.sizeBytes / 1024).toFixed(1);

                      return (
                        <div
                          key={snap.id}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isLatest
                              ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 shadow-xs'
                              : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start space-x-3 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              snap.type === 'pre_restore'
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : snap.type === 'manual'
                                ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            }`}>
                              {snap.type === 'pre_restore' ? <ShieldCheck className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center space-x-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {snap.label}
                                </span>
                                {isLatest && (
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-600 text-white uppercase tracking-wider">
                                    Mais Recente
                                  </span>
                                )}
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                                  snap.type === 'pre_restore'
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                    : snap.type === 'manual'
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                  {snap.type === 'pre_restore' ? 'ROLLBACK' : snap.type === 'manual' ? 'MANUAL' : 'AUTO'}
                                </span>
                              </div>

                              <div className="flex items-center space-x-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                                <span className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>{formattedDate}</span>
                                </span>
                                <span>•</span>
                                <span>{sizeKb} KB</span>
                                <span>•</span>
                                <span>{snap.recordsCount} registros consolidados</span>
                                <span>•</span>
                                <span className="font-mono text-[10px] text-slate-400">{snap.payload.checksum}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700/60">
                            <button
                              onClick={() => setInspectingSnapshot(snap)}
                              className="px-2.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                              title="Inspecionar detalhes deste backup"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Ver Dados</span>
                            </button>

                            <button
                              onClick={() => downloadBackupAsJson(snap.payload, `workpulse_snapshot_${snap.id}.json`)}
                              className="px-2.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                              title="Baixar este snapshot como arquivo JSON"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Baixar JSON</span>
                            </button>

                            <button
                              onClick={() => setConfirmRestoreTarget({
                                payload: snap.payload,
                                sourceName: `${snap.label} (${formattedDate})`
                              })}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                              title="Restaurar o WorkPulse exatamente para este ponto de backup"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Restaurar</span>
                            </button>

                            <button
                              onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                              title="Excluir este snapshot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EXPORT JSON */}
          {activeTab === 'export_json' && (
            <div className="space-y-6">
              {/* Manifest Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <FileJson className="w-4 h-4 text-blue-500" />
                      <span>Manifesto do Pacote de Backup Completo</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Arquivo estruturado contendo 100% dos parâmetros, regras de produtividade, inventário patrimonial e usuários.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyCurrentJson}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center space-x-1.5"
                    >
                      {copiedToClipboard ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedToClipboard ? 'Copiado!' : 'Copiar JSON'}</span>
                    </button>

                    <button
                      onClick={() => handleCreateManualBackup(true)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Baixar Arquivo JSON (.json)</span>
                    </button>
                  </div>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Colaboradores</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400">{currentPayloadPreview.stats.employeesCount}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Regras de Apps</span>
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{currentPayloadPreview.stats.appRulesCount}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Ativos de TI (ITAM)</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{currentPayloadPreview.stats.assetsCount}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Nós de Topologia</span>
                    <span className="text-lg font-black text-purple-600 dark:text-purple-400">{currentPayloadPreview.stats.topologyNodesCount}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Bloqueios & PC Lock</span>
                    <span className="text-lg font-black text-rose-600 dark:text-rose-400">{currentPayloadPreview.stats.siteBlocksCount + currentPayloadPreview.stats.pcLockPoliciesCount}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Usuários & Acessos</span>
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400">{currentPayloadPreview.stats.systemUsersCount}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Tabelas Auxiliares</span>
                    <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">
                      {currentPayloadPreview.stats.suppliersCount + currentPayloadPreview.stats.roomsCount + currentPayloadPreview.stats.categoriesCount + currentPayloadPreview.stats.statusesCount}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Checksum SHA</span>
                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 truncate block mt-1">{currentPayloadPreview.checksum}</span>
                  </div>
                </div>

                {/* JSON Preview Snippet Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span>Pré-visualização do Schema JSON:</span>
                    <span>Versão: {currentPayloadPreview.version}</span>
                  </div>
                  <pre className="bg-slate-950 text-slate-300 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 border border-slate-800 scrollbar-thin">
                    {JSON.stringify(currentPayloadPreview, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: IMPORT & RESTORE */}
          {activeTab === 'import_restore' && (
            <div className="space-y-6">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelected(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[0.99]'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30 hover:border-blue-400'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                />

                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Selecione ou arraste o arquivo JSON de backup
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Compatível com backups gerados pelo WorkPulse Enterprise (.json)
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Escolher Arquivo no Computador</span>
                  </button>
                </div>
              </div>

              {/* Validation & File Review Card */}
              {importedFile && validatedImport && (
                <div className={`p-5 rounded-2xl border space-y-4 ${
                  validatedImport.isValid 
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                    : 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/60'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        validatedImport.isValid ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {validatedImport.isValid ? <CheckCircle2 className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                          <span>{importedFile.name}</span>
                          <span className="text-xs font-mono font-normal text-slate-500">
                            ({(importedFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </h4>
                        <p className={`text-xs font-medium ${validatedImport.isValid ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                          {validatedImport.isValid 
                            ? 'Estrutura JSON validada com sucesso! Pronto para restauração imediata.'
                            : 'Erros encontrados na validação do arquivo.'}
                        </p>
                      </div>
                    </div>

                    {validatedImport.isValid && validatedImport.payload && (
                      <button
                        onClick={() => setConfirmRestoreTarget({
                          payload: validatedImport.payload!,
                          sourceName: `Arquivo Importado: ${importedFile.name}`
                        })}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Restaurar Todas as Configurações</span>
                      </button>
                    )}
                  </div>

                  {/* Errors if any */}
                  {!validatedImport.isValid && (
                    <div className="bg-red-100/70 dark:bg-red-900/30 p-3 rounded-xl text-xs text-red-800 dark:text-red-300 space-y-1">
                      <p className="font-bold">Motivos de rejeição:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {validatedImport.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Summary of items inside import */}
                  {validatedImport.isValid && validatedImport.payload && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 text-center">
                        <span className="text-[10px] text-slate-500 uppercase font-mono block">Colaboradores</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{validatedImport.payload.stats.employeesCount}</span>
                      </div>
                      <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 text-center">
                        <span className="text-[10px] text-slate-500 uppercase font-mono block">Regras de Apps</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{validatedImport.payload.stats.appRulesCount}</span>
                      </div>
                      <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 text-center">
                        <span className="text-[10px] text-slate-500 uppercase font-mono block">Patrimônio ITAM</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{validatedImport.payload.stats.assetsCount}</span>
                      </div>
                      <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 text-center">
                        <span className="text-[10px] text-slate-500 uppercase font-mono block">Usuários</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{validatedImport.payload.stats.systemUsersCount}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: STORAGE & CONFIG DIAGNOSTICS */}
          {activeTab === 'storage_diag' && (
            <div className="space-y-6">
              {/* Storage Meter */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Uso de Armazenamento Local (HTML5 LocalStorage)
                      </h4>
                      <p className="text-xs text-slate-500">
                        {storageStats.usedKb} KB utilizados em {storageStats.itemsCount} registros de chaves
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    Quota estimada: ~5 MB
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(3, (storageStats.usedKb / 5120) * 100))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>0 KB</span>
                    <span>{storageStats.usedKb} KB em uso</span>
                    <span>5,120 KB</span>
                  </div>
                </div>
              </div>

              {/* Advanced Retention Controls */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono flex items-center space-x-2">
                  <Settings className="w-3.5 h-3.5" />
                  <span>Políticas de Retenção e Segurança</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Limite de Snapshots em Memória
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Snapshots mais antigos serão rotacionados automaticamente.
                    </p>
                    <select
                      value={autoConfig.maxSnapshots}
                      onChange={(e) => handleChangeMaxSnapshots(Number(e.target.value))}
                      className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value={5}>Manter últimos 5 snapshots</option>
                      <option value={10}>Manter últimos 10 snapshots (Recomendado)</option>
                      <option value={20}>Manter últimos 20 snapshots</option>
                    </select>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Ponto de Segurança Automático Pré-Restauração
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Cria automaticamente um snapshot de rollback antes de aplicar qualquer importação.
                    </p>
                    <div className="flex items-center space-x-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 pt-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Proteção Ativada (Sempre gera Snapshot de Rollback)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Factory Reset Box */}
              <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-red-900 dark:text-red-300">
                      Redefinição de Fábrica (Reset Limpo)
                    </h4>
                    <p className="text-xs text-red-700/80 dark:text-red-400">
                      Restaura as configurações originais e gera um ponto de segurança prévio automaticamente.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsConfirmingReset(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer shrink-0"
                >
                  Restaurar Padrões de Fábrica
                </button>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Criptografia e integridade SHA verificadas localmente</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>

      </div>

      {/* CONFIRM RESTORE MODAL */}
      {confirmRestoreTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirmar Restauração de Dados?
                </h4>
                <p className="text-xs text-slate-500">
                  {confirmRestoreTarget.sourceName}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Esta ação irá substituir as configurações atuais pelo ponto selecionado. Um <strong>ponto de segurança de rollback</strong> será criado automaticamente antes da aplicação.
            </p>

            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Colaboradores:</span>
                <span className="font-bold">{confirmRestoreTarget.payload.stats.employeesCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Regras de Apps:</span>
                <span className="font-bold">{confirmRestoreTarget.payload.stats.appRulesCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ativos de TI:</span>
                <span className="font-bold">{confirmRestoreTarget.payload.stats.assetsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Checksum de integridade:</span>
                <span className="font-mono text-[10px]">{confirmRestoreTarget.payload.checksum}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setConfirmRestoreTarget(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleExecuteRestore(confirmRestoreTarget.payload)}
                disabled={isProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>Sim, Restaurar Agora</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM RESET MODAL */}
      {isConfirmingReset && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-red-300 dark:border-red-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Restaurar Padrões de Fábrica?
                </h4>
                <p className="text-xs text-slate-500">
                  Reset Limpo para o estado inicial de demonstração
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Todas as modificações manuais de colaboradores, regras e patrimônio serão revertidas para os padrões iniciais de fábrica. Um snapshot de segurança prévio será salvo no seu histórico antes do reset.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsConfirmingReset(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteReset}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Reset de Fábrica</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT SNAPSHOT MODAL */}
      {inspectingSnapshot && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <FileJson className="w-5 h-5 text-blue-500" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {inspectingSnapshot.label}
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Timestamp: {inspectingSnapshot.timestamp}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInspectingSnapshot(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <pre className="bg-slate-950 text-slate-300 p-3.5 rounded-xl text-[11px] font-mono border border-slate-800 scrollbar-thin">
                {JSON.stringify(inspectingSnapshot.payload, null, 2)}
              </pre>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => downloadBackupAsJson(inspectingSnapshot.payload, `workpulse_snapshot_${inspectingSnapshot.id}.json`)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar JSON</span>
              </button>

              <button
                onClick={() => {
                  const target = inspectingSnapshot;
                  setInspectingSnapshot(null);
                  setConfirmRestoreTarget({
                    payload: target.payload,
                    sourceName: target.label
                  });
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restaurar Este Ponto</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
