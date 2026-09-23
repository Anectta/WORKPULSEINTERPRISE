import React, { useState } from 'react';
import {
  FileText,
  X,
  CheckCircle2,
  CalendarCheck,
  Building,
  ShieldCheck,
  Search,
  ArrowRight
} from 'lucide-react';
import {
  WifiConnectionStatus,
  WifiScoreBreakdown
} from '../../types/wifiPulse';

interface WifiAttachToTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: WifiConnectionStatus;
  score: WifiScoreBreakdown;
  onAttachSuccess: (ticketId: string) => void;
}

const SAMPLE_TICKETS = [
  { id: 'CH-2026-0841', client: 'Acme Corp', subject: 'Lentidão em chamadas do Microsoft Teams / Meet na sala de reuniões', priority: 'ALTA', date: 'Hoje às 14:20' },
  { id: 'CH-2026-0839', client: 'TechNova', subject: 'Quedas intermitentes de VPN e Wi-Fi no setor financeiro', priority: 'MÉDIA', date: 'Hoje às 11:05' },
  { id: 'CH-2026-0832', client: 'LogiGlobal', subject: 'Instalação de novo Access Point e auditoria de cobertura', priority: 'NORMAL', date: 'Ontem às 16:40' }
];

export const WifiAttachToTicketModal: React.FC<WifiAttachToTicketModalProps> = ({
  isOpen,
  onClose,
  connection,
  score,
  onAttachSuccess
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string>(SAMPLE_TICKETS[0].id);
  const [ticketSearch, setTicketSearch] = useState('');
  const [isAttaching, setIsAttaching] = useState(false);
  const [attached, setAttached] = useState(false);

  if (!isOpen) return null;

  const handleAttach = () => {
    setIsAttaching(true);
    setTimeout(() => {
      setIsAttaching(false);
      setAttached(true);
      setTimeout(() => {
        onAttachSuccess(selectedTicketId);
        onClose();
        setAttached(false);
      }, 1200);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Anexar Laudo de Wi-Fi ao Chamado ITSM
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Integração nativa com a Agenda Pro & Central de Chamados do WorkPulse.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Summary Preview of What is being attached */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-400 uppercase text-[10px]">Laudo a ser Anexado</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                Score {score.totalScore}% • {score.rating}
              </span>
            </div>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              SSID: {connection.ssid} (Canal {connection.channel} @ {connection.band})
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              Sinal: {connection.rssi} dBm • Taxa de Link: {connection.linkRateMbps} Mbps • Dispositivo: {connection.interfaceName} ({connection.ipAddress})
            </p>
          </div>

          {/* Select Ticket Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Selecione o Chamado de Suporte ou Ordem de Serviço:
            </label>

            <div className="space-y-2">
              {SAMPLE_TICKETS.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedTicketId === t.id
                      ? 'bg-blue-500/10 border-blue-500 dark:border-blue-500 text-slate-900 dark:text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{t.id}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{t.client}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {t.priority}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-1">{t.subject}</p>
                  </div>

                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedTicketId === t.id ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 dark:border-slate-700'
                  }`}>
                    {selectedTicketId === t.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleAttach}
            disabled={isAttaching || attached}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-2 shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{attached ? 'Laudo Vinculado!' : isAttaching ? 'Anexando...' : 'Confirmar e Vincular ao Chamado'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
