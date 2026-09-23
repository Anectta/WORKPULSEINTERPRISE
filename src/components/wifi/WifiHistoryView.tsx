import React, { useState } from 'react';
import {
  History,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  SlidersHorizontal,
  Eye,
  PlusCircle,
  BookmarkPlus
} from 'lucide-react';
import {
  WifiDiagnosticHistoryRecord
} from '../../types/wifiPulse';

interface WifiHistoryViewProps {
  historyRecords: WifiDiagnosticHistoryRecord[];
  onViewReport: (record: WifiDiagnosticHistoryRecord) => void;
  onSaveCurrentMeasurement?: (tag: 'Antes' | 'Depois' | 'Padrão') => void;
}

export const WifiHistoryView: React.FC<WifiHistoryViewProps> = ({
  historyRecords,
  onViewReport,
  onSaveCurrentMeasurement
}) => {
  const [selectedRecord1, setSelectedRecord1] = useState<string>(historyRecords[1]?.id || historyRecords[0]?.id || '');
  const [selectedRecord2, setSelectedRecord2] = useState<string>(historyRecords[0]?.id || '');

  const rec1 = historyRecords.find(r => r.id === selectedRecord1) || historyRecords[1] || historyRecords[0];
  const rec2 = historyRecords.find(r => r.id === selectedRecord2) || historyRecords[0];

  const diffRssi = rec2 ? (rec2.rssi - (rec1 ? rec1.rssi : rec2.rssi)) : 0;
  const diffScore = rec2 ? (rec2.score - (rec1 ? rec1.score : rec2.score)) : 0;
  const diffSpeed = rec2 ? (rec2.downloadMbps - (rec1 ? rec1.downloadMbps : rec2.downloadMbps)) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <History className="w-5 h-5 text-indigo-500" />
            <span>Histórico de Diagnósticos & Comparativo Antes vs Depois</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Auditoria evolutiva das intervenções técnicas de RF e validação de melhorias de desempenho.
          </p>
        </div>

        {/* Save Current State Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onSaveCurrentMeasurement && onSaveCurrentMeasurement('Antes')}
            className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-700 hover:text-white dark:text-amber-300 font-bold text-xs flex items-center space-x-1.5 border border-amber-500/30 transition-all cursor-pointer"
            title="Salvar status atual como estado ANTES da intervenção"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Salvar como "Antes"</span>
          </button>
          <button
            onClick={() => onSaveCurrentMeasurement && onSaveCurrentMeasurement('Depois')}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            title="Salvar status atual como estado DEPOIS da intervenção"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Salvar como "Depois"</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Before vs After Comparison Hero */}
      {rec1 && rec2 && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 text-white shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5 rounded-full">
                Modo Comparativo de Intervenção
              </span>
              <h3 className="text-xl font-black text-white mt-1">
                Validação de Resultados: {rec1.beforeVsAfterTag || 'Antes'} vs {rec2.beforeVsAfterTag || 'Depois'}
              </h3>
            </div>

            {/* Difference KPI Pills */}
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-xl font-bold text-xs flex items-center space-x-1 border ${
                diffScore >= 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}>
                <ArrowUpRight className="w-4 h-4" />
                <span>Score: {diffScore >= 0 ? `+${diffScore}` : diffScore} pts</span>
              </span>
              <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold text-xs flex items-center space-x-1">
                <ArrowUpRight className="w-4 h-4" />
                <span>Sinal: {diffRssi >= 0 ? `+${diffRssi}` : diffRssi} dBm</span>
              </span>
              <span className="px-3 py-1 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold text-xs flex items-center space-x-1">
                <ArrowUpRight className="w-4 h-4" />
                <span>Velocidade: {diffSpeed >= 0 ? `+${diffSpeed}` : diffSpeed} Mbps</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1: Antes */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase text-[10px]">
                  1. Medição ({rec1.beforeVsAfterTag || 'Antes'})
                </span>
                <span className="text-slate-400 font-mono text-[11px]">{rec1.timestamp}</span>
              </div>

              <div>
                <h4 className="font-bold text-base text-white">{rec1.ssid}</h4>
                <p className="text-xs text-slate-400 font-mono">
                  Canal {rec1.channel} ({rec1.band}) • {rec1.channelWidthMhz} MHz
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
                <div className="bg-slate-900/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Score</span>
                  <span className="text-lg font-black text-amber-400 font-mono">{rec1.score}%</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Sinal</span>
                  <span className="text-lg font-black text-slate-200 font-mono">{rec1.rssi} dBm</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Download</span>
                  <span className="text-lg font-black text-slate-200 font-mono">{rec1.downloadMbps}M</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 italic pt-1">
                "{rec1.recommendation}"
              </p>
            </div>

            {/* Box 2: Depois */}
            <div className="bg-slate-950/70 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase text-[10px]">
                  2. Medição ({rec2.beforeVsAfterTag || 'Depois'})
                </span>
                <span className="text-slate-400 font-mono text-[11px]">{rec2.timestamp}</span>
              </div>

              <div>
                <h4 className="font-bold text-base text-white">{rec2.ssid}</h4>
                <p className="text-xs text-slate-400 font-mono">
                  Canal {rec2.channel} ({rec2.band}) • {rec2.channelWidthMhz} MHz
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
                <div className="bg-slate-900/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Score</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">{rec2.score}%</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Sinal</span>
                  <span className="text-lg font-black text-slate-200 font-mono">{rec2.rssi} dBm</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Download</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">{rec2.downloadMbps}M</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 italic pt-1">
                "{rec2.recommendation}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* History Records Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Registros de Diagnóstico Anteriores ({historyRecords.length})</span>
          </h3>
          <span className="text-xs text-slate-500">Selecione para comparar ou visualizar laudo técnico</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Chamado / Ticket</th>
                <th className="py-3 px-4">SSID / Banda</th>
                <th className="py-3 px-4">Canal</th>
                <th className="py-3 px-4">Sinal (RSSI)</th>
                <th className="py-3 px-4">Quality Score</th>
                <th className="py-3 px-4">Download / Upload</th>
                <th className="py-3 px-4">Tag</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {historyRecords.map(rec => {
                const isRec1 = rec.id === selectedRecord1;
                const isRec2 = rec.id === selectedRecord2;

                return (
                  <tr
                    key={rec.id}
                    className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                      isRec1 || isRec2 ? 'bg-indigo-500/5 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {rec.timestamp}
                    </td>

                    {/* Ticket */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {rec.ticketCode || '#1042'}
                      </span>
                    </td>

                    {/* SSID & Band */}
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{rec.ssid}</span>
                        <span className="text-[10px] text-slate-400">{rec.band}</span>
                      </div>
                    </td>

                    {/* Channel */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      Ch {rec.channel}
                    </td>

                    {/* RSSI */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {rec.rssi} dBm
                    </td>

                    {/* Score */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-xs ${
                        rec.score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                        rec.score >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                      }`}>
                        {rec.score}%
                      </span>
                    </td>

                    {/* Speed */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      ↓ {rec.downloadMbps}M / ↑ {rec.uploadMbps}M
                    </td>

                    {/* Tag */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.beforeVsAfterTag === 'Depois'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : rec.beforeVsAfterTag === 'Antes'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {rec.beforeVsAfterTag || 'Padrão'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => setSelectedRecord1(rec.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                            isRec1
                              ? 'bg-amber-500 text-slate-950 border-amber-600'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                          title="Definir como Registro 1 (Antes)"
                        >
                          Definir 1
                        </button>
                        <button
                          onClick={() => setSelectedRecord2(rec.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                            isRec2
                              ? 'bg-emerald-500 text-slate-950 border-emerald-600'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                          title="Definir como Registro 2 (Depois)"
                        >
                          Definir 2
                        </button>
                        <button
                          onClick={() => onViewReport(rec)}
                          className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all cursor-pointer"
                          title="Gerar Laudo deste Registro"
                        >
                          <FileText className="w-3.5 h-3.5" />
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
    </div>
  );
};
