import React from 'react';
import { X, Printer, FileCheck, Building2, Tag, ShieldCheck, User } from 'lucide-react';
import { ITAsset } from '../../types';

interface AssetCustodyTermModalProps {
  asset: ITAsset;
  onClose: () => void;
  onConfirmSigned?: (assetId: string) => void;
}

export const AssetCustodyTermModal: React.FC<AssetCustodyTermModalProps> = ({
  asset,
  onClose,
  onConfirmSigned
}) => {
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header (No print) */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Termo de Responsabilidade & Cautela de Equipamento
              </h3>
              <p className="text-[11px] text-slate-500">
                Tombo: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{asset.assetTag}</strong> • {asset.name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Documento</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 overflow-y-auto flex-1 text-slate-800 dark:text-slate-200 text-xs space-y-6 bg-white dark:bg-slate-900 print:p-0 print:m-0 print:text-black print:dark:text-black">
          
          {/* Header of the Official Document */}
          <div className="text-center pb-4 border-b-2 border-slate-800 dark:border-slate-300">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <Building2 className="w-6 h-6 text-indigo-600" />
              <h1 className="text-lg font-black uppercase tracking-wider">
                WorkPulse IT Asset Management
              </h1>
            </div>
            <h2 className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">
              Termo de Entrega e Responsabilidade de Bem Patrimonial
            </h2>
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Registro: TR-{asset.assetTag}-{new Date().getFullYear()}
            </p>
          </div>

          {/* Custodian Details */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 border-b pb-1">
              1. Identificação do Colaborador / Responsável
            </h3>
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-500 block">Colaborador:</span>
                <strong className="text-xs">{asset.assignedEmployeeName || '_____________________________________________'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Departamento:</span>
                <strong className="text-xs">{asset.assignedDepartment || 'Tecnologia da Informação & Engenharia'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Local de Trabalho:</span>
                <strong className="text-xs">{asset.roomName || 'Sede Principal'} {asset.locationDetails ? `(${asset.locationDetails})` : ''}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Data de Entrega:</span>
                <strong className="text-xs">{currentDate}</strong>
              </div>
            </div>
          </div>

          {/* Asset Details */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 border-b pb-1">
              2. Identificação do Bem Patrimonial
            </h3>
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl font-mono">
              <div>
                <span className="text-[10px] text-slate-500 font-sans block">Número do Patrimônio / Tombo:</span>
                <strong className="text-sm text-indigo-600 dark:text-indigo-400">{asset.assetTag}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-sans block">Marca / Modelo:</span>
                <strong className="text-xs">{asset.brandModel}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-sans block">Número de Série (S/N):</span>
                <strong className="text-xs">{asset.serialNumber}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-sans block">Valor de Compra / Patrimonial:</span>
                <strong className="text-xs">R$ {(asset.purchaseValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-sans block">Nota Fiscal / PO:</span>
                <strong className="text-xs">{asset.invoiceNumber || 'NF-INTERNA'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-sans block">Garantia / Fornecedor:</span>
                <strong className="text-xs font-sans">{asset.supplier || 'Dell/Cisco/Lenovo'}</strong>
              </div>
            </div>
          </div>

          {/* Terms & Legal Clauses */}
          <div className="space-y-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            <h3 className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 border-b pb-1">
              3. Cláusulas de Responsabilidade e Guarda
            </h3>
            <p>
              1. O colaborador acima qualificado declara ter recebido em perfeitas condições de uso, conservação e funcionamento o bem patrimonial especificado neste termo.
            </p>
            <p>
              2. O equipamento destina-se <strong>exclusivamente para a execução das atividades profissionais</strong> a serviço da empresa, comprometendo-se o colaborador a zelar por sua integridade física e segurança lógica.
            </p>
            <p>
              3. O colaborador compromete-se a comunicar imediatamente à equipe de TI qualquer defeito, avaria, sinistro, furto ou roubo (acompanhado do competente Boletim de Ocorrência policial).
            </p>
            <p>
              4. Em caso de desligamento, rescisão de contrato de trabalho, licença prolongada ou solicitação formal do departamento de TI, o equipamento deverá ser <strong>restituído de imediato</strong> nas mesmas condições em que foi entregue.
            </p>
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center">
            <div className="space-y-2">
              <div className="border-t border-slate-700 dark:border-slate-300 pt-1" />
              <p className="font-bold text-xs">{asset.assignedEmployeeName || 'Assinatura do Colaborador'}</p>
              <p className="text-[10px] text-slate-500">Colaborador / Responsável pelo Equipamento</p>
            </div>
            <div className="space-y-2">
              <div className="border-t border-slate-700 dark:border-slate-300 pt-1" />
              <p className="font-bold text-xs">Gestão Patrimonial & Infraestrutura TI</p>
              <p className="text-[10px] text-slate-500">Responsável pela Entrega / WorkPulse</p>
            </div>
          </div>

        </div>

        {/* Modal Footer (No print) */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between print:hidden">
          <span className="text-[11px] text-slate-500">
            Status do termo: {asset.custodyTermSigned ? <strong className="text-emerald-600">Assinado em {asset.custodyTermDate || 'Registro'}</strong> : <strong className="text-amber-600">Pendente de Assinatura</strong>}
          </span>
          <div className="flex items-center space-x-2">
            {onConfirmSigned && !asset.custodyTermSigned && (
              <button
                onClick={() => onConfirmSigned(asset.id)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs"
              >
                Marcar como Termo Assinado
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
