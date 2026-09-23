import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  FileCheck, 
  Database, 
  AlertTriangle, 
  CheckCircle2 
} from 'lucide-react';
import { ConfigurationItem, CIRelationship } from '../../types/cmdb';

interface CmdbImportExportViewProps {
  items: ConfigurationItem[];
  relationships: CIRelationship[];
  onImportBulk: (importedItems: Partial<ConfigurationItem>[]) => void;
}

export const CmdbImportExportView: React.FC<CmdbImportExportViewProps> = ({
  items,
  relationships,
  onImportBulk
}) => {
  const [importText, setImportText] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExportJson = () => {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      tenantId: 'tenant-demo',
      configurationItems: items,
      relationships: relationships
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cmdb_export_full_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Código', 'Nome', 'Tipo', 'IP', 'Hostname', 'Patrimônio', 'Série', 'Status', 'Criticidade', 'Responsável', 'Local'];
    const rows = items.map(i => [
      i.id,
      i.code,
      i.name,
      i.typeName,
      i.ipAddress || '',
      i.hostname || '',
      i.assetTag || '',
      i.serialNumber || '',
      i.status,
      i.criticality,
      i.responsible || '',
      i.location || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = `cmdb_itens_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const handleImportSubmit = () => {
    try {
      const parsed = JSON.parse(importText);
      const itemsToImport = Array.isArray(parsed) ? parsed : (parsed.configurationItems || []);
      if (itemsToImport.length === 0) {
        setStatusMessage({ type: 'error', text: 'Nenhum item válido encontrado no JSON.' });
        return;
      }
      onImportBulk(itemsToImport);
      setStatusMessage({ type: 'success', text: `${itemsToImport.length} Itens de Configuração importados com sucesso!` });
      setImportText('');
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: `Erro de sintaxe no JSON: ${e.message}` });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-400" />
          <span>Central de Importação e Exportação CMDB (CSV / JSON)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Migre e sincronize inventários legados, planilhas do Excel ou realize backups completos da base de configuração e topologia.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Export Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950/70 border border-blue-800 flex items-center justify-center text-blue-400 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Exportar Dados da CMDB</h3>
              <p className="text-xs text-slate-400">Download em tempo real com metadados e topologia</p>
            </div>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <span>Total de CIs:</span>
              <strong className="text-white">{items.length} itens</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Relacionamentos:</span>
              <strong className="text-white">{relationships.length} conexões</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Formato:</span>
              <strong className="text-blue-400 font-mono">UTF-8 RFC-4180</strong>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleExportCsv}
              className="flex-1 py-2.5 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Planilha (CSV)</span>
            </button>

            <button
              onClick={handleExportJson}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>Exportar Backup (JSON)</span>
            </button>
          </div>
        </div>

        {/* Import Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Carga Massiva (JSON Ingestion)</h3>
              <p className="text-xs text-slate-400">Cole a carga útil para importar múltiplos CIs</p>
            </div>
          </div>

          <textarea
            rows={5}
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder='[ { "name": "Servidor Teste", "typeId": "servidor", "ipAddress": "10.0.0.5", "status": "operacional" } ]'
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
          />

          {statusMessage && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              statusMessage.type === 'success' ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' : 'bg-red-950/80 border-red-800 text-red-300'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <button
            onClick={handleImportSubmit}
            disabled={!importText.trim()}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Processar e Ingerir Carga</span>
          </button>
        </div>

      </div>

    </div>
  );
};
