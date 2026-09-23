import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Mail, 
  Server, 
  Download, 
  Clock, 
  CheckCircle2, 
  Copy, 
  ExternalLink,
  Send,
  Zap
} from 'lucide-react';

export const AutomatedReportsAndExport: React.FC = () => {
  const [copiedPowerBi, setCopiedPowerBi] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('diretoria@workpulse-corp.com.br');

  const powerBiEndpoint = 'https://ais-dev-j5xfxvq46npqvw5wbs7pnc-660100840056.us-west2.run.app/api/export/powerbi-feed';

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(powerBiEndpoint);
    setCopiedPowerBi(true);
    setTimeout(() => setCopiedPowerBi(false), 3000);
  };

  const handleSendReportNow = () => {
    setEmailSuccess(true);
    setTimeout(() => setEmailSuccess(false), 4000);
  };

  const handleDownloadCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Colaborador,Departamento,Modelo,ScoreProdutividade,HorasProdutivas,HorasOciosas\n" +
      "Ana Beatris Silva,Engenharia,Home Office,92,6.6,0.2\n" +
      "Carlos Eduardo Mendes,Vendas,Hibrido,88,5.9,0.3\n" +
      "Mariana Costa Oliveira,RH & Pessoas,Presencial,85,5.8,0.2\n" +
      "Lucas Gabriel Rocha,Atendimento & Suporte,Home Office,54,3.5,1.0\n" +
      "Juliana Fernandes Lima,Marketing,Hibrido,91,6.7,0.2\n" +
      "Roberto Viana Santos,Financeiro & Juridico,Presencial,76,6.1,0.5\n";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `WorkPulse_Relatorio_Produtividade_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Action Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">Relatórios Automáticos & Exportação de Dados BI</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Programe envios por e-mail, configure sincronização FTP diária ou conecte o Power BI diretamente ao endpoint REST.
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Baixar Relatório CSV Completo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Automation Builder */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Mail className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Disparo Programado por E-mail</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Ativo (Diário 18:00)
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1 font-mono uppercase">Destinatários:</label>
              <input
                type="text"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleSendReportNow}
                className="flex items-center space-x-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Agora por E-mail</span>
              </button>

              {emailSuccess && (
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600 dark:text-emerald-400" />
                  Relatório enviado com sucesso!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Power BI Rest Connector */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Feed OData / Power BI API Endpoint</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              REST JSON / OData
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Copie a URL abaixo e cole no Power BI Desktop na opção <strong className="text-slate-900 dark:text-white">Obter Dados → Web / REST Endpoint</strong>.
          </p>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={powerBiEndpoint}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 select-all font-medium"
            />
            <button
              onClick={handleCopyEndpoint}
              className="p-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Copiar URL"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          {copiedPowerBi && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600 dark:text-emerald-400" /> Endpoint copiado para a área de transferência!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
