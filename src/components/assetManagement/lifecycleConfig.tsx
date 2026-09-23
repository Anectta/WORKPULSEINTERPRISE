import React from 'react';
import { 
  ShoppingCart, 
  Truck, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Repeat, 
  RefreshCw, 
  Trash2,
  Box
} from 'lucide-react';
import { AssetLifecycleStage } from '../../types';

export interface LifecycleStageDefinition {
  stage: AssetLifecycleStage;
  id: AssetLifecycleStage;
  key: AssetLifecycleStage;
  label: string;
  shortLabel: string;
  stepNumber: number;
  step: number;
  order: number;
  description: string;
  icon: React.ReactNode;
  bgLight: string;
  textLight: string;
  borderLight: string;
  bgDark: string;
  textDark: string;
  dotColor: string;
  badgeColor: string;
  color: string;
}

export const LIFECYCLE_STAGES: LifecycleStageDefinition[] = [
  {
    stage: 'compra',
    id: 'compra',
    key: 'compra',
    label: '1. Compra',
    shortLabel: 'Compra',
    stepNumber: 1,
    step: 1,
    order: 1,
    description: 'Pedido emitido / Em faturamento e expedição',
    icon: <ShoppingCart className="w-4 h-4" />,
    bgLight: 'bg-sky-50',
    textLight: 'text-sky-700',
    borderLight: 'border-sky-300',
    bgDark: 'dark:bg-sky-950/70',
    textDark: 'dark:text-sky-300',
    dotColor: 'bg-sky-500',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300',
    color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300'
  },
  {
    stage: 'entrada',
    id: 'entrada',
    key: 'entrada',
    label: '2. Entrada',
    shortLabel: 'Entrada',
    stepNumber: 2,
    step: 2,
    order: 2,
    description: 'Recebido na doca / Tombamento e conferência de NF',
    icon: <Truck className="w-4 h-4" />,
    bgLight: 'bg-indigo-50',
    textLight: 'text-indigo-700',
    borderLight: 'border-indigo-300',
    bgDark: 'dark:bg-indigo-950/70',
    textDark: 'dark:text-indigo-300',
    dotColor: 'bg-indigo-500',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-300',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
  },
  {
    stage: 'instalacao',
    id: 'instalacao',
    key: 'instalacao',
    label: '3. Instalação',
    shortLabel: 'Instalação',
    stepNumber: 3,
    step: 3,
    order: 3,
    description: 'Deploy de SO, imagem corporativa, rede e fixação',
    icon: <Wrench className="w-4 h-4" />,
    bgLight: 'bg-amber-50',
    textLight: 'text-amber-700',
    borderLight: 'border-amber-300',
    bgDark: 'dark:bg-amber-950/70',
    textDark: 'dark:text-amber-300',
    dotColor: 'bg-amber-500',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
  },
  {
    stage: 'utilizacao',
    id: 'utilizacao',
    key: 'utilizacao',
    label: '4. Utilização',
    shortLabel: 'Utilização',
    stepNumber: 4,
    step: 4,
    order: 4,
    description: 'Em produção ativa com colaborador ou infraestrutura',
    icon: <CheckCircle2 className="w-4 h-4" />,
    bgLight: 'bg-emerald-50',
    textLight: 'text-emerald-700',
    borderLight: 'border-emerald-300',
    bgDark: 'dark:bg-emerald-950/70',
    textDark: 'dark:text-emerald-300',
    dotColor: 'bg-emerald-500',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
  },
  {
    stage: 'manutencao',
    id: 'manutencao',
    key: 'manutencao',
    label: '5. Manutenção',
    shortLabel: 'Manutenção',
    stepNumber: 5,
    step: 5,
    order: 5,
    description: 'Em reparo técnico preventivo, corretivo ou garantia',
    icon: <AlertTriangle className="w-4 h-4" />,
    bgLight: 'bg-orange-50',
    textLight: 'text-orange-700',
    borderLight: 'border-orange-300',
    bgDark: 'dark:bg-orange-950/70',
    textDark: 'dark:text-orange-300',
    dotColor: 'bg-orange-500',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/70 dark:text-orange-300',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
  },
  {
    stage: 'transferencia',
    id: 'transferencia',
    key: 'transferencia',
    label: '6. Transferência',
    shortLabel: 'Transferência',
    stepNumber: 6,
    step: 6,
    order: 6,
    description: 'Em processo de remanejamento entre colaboradores ou salas',
    icon: <Repeat className="w-4 h-4" />,
    bgLight: 'bg-purple-50',
    textLight: 'text-purple-700',
    borderLight: 'border-purple-300',
    bgDark: 'dark:bg-purple-950/70',
    textDark: 'dark:text-purple-300',
    dotColor: 'bg-purple-500',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
  },
  {
    stage: 'substituicao',
    id: 'substituicao',
    key: 'substituicao',
    label: '7. Substituição',
    shortLabel: 'Substituição',
    stepNumber: 7,
    step: 7,
    order: 7,
    description: 'Fim de ciclo de vida / Substituição tecnológica programada',
    icon: <RefreshCw className="w-4 h-4" />,
    bgLight: 'bg-teal-50',
    textLight: 'text-teal-700',
    borderLight: 'border-teal-300',
    bgDark: 'dark:bg-teal-950/70',
    textDark: 'dark:text-teal-300',
    dotColor: 'bg-teal-500',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-950/70 dark:text-teal-300',
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300'
  },
  {
    stage: 'descarte',
    id: 'descarte',
    key: 'descarte',
    label: '8. Descarte',
    shortLabel: 'Descarte',
    stepNumber: 8,
    step: 8,
    order: 8,
    description: 'Baixa patrimonial concluída / Descarte ecológico com laudo',
    icon: <Trash2 className="w-4 h-4" />,
    bgLight: 'bg-rose-50',
    textLight: 'text-rose-700',
    borderLight: 'border-rose-300',
    bgDark: 'dark:bg-rose-950/70',
    textDark: 'dark:text-rose-300',
    dotColor: 'bg-rose-500',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300',
    color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
  }
];

export const getLifecycleStageConfig = (stage?: AssetLifecycleStage | string): LifecycleStageDefinition => {
  const found = LIFECYCLE_STAGES.find(s => s.stage === stage || s.id === stage || s.key === stage);
  return found || {
    stage: 'utilizacao',
    id: 'utilizacao',
    key: 'utilizacao',
    label: '4. Utilização',
    shortLabel: 'Utilização',
    stepNumber: 4,
    step: 4,
    order: 4,
    description: 'Em produção ativa',
    icon: <CheckCircle2 className="w-4 h-4" />,
    bgLight: 'bg-slate-50',
    textLight: 'text-slate-700',
    borderLight: 'border-slate-300',
    bgDark: 'dark:bg-slate-900',
    textDark: 'dark:text-slate-300',
    dotColor: 'bg-slate-500',
    badgeColor: 'bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300'
  };
};
