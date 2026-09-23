import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  CheckSquare,
  Bell,
  Users,
  Activity,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Tag,
  AlertCircle,
  Phone,
  Mail,
  Building,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Volume2,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Layers,
  LayoutDashboard,
  Filter,
  ArrowUpRight,
  Sliders,
  Play,
  FileText,
  FileTerminal,
  ExternalLink,
  MessageSquare,
  Star,
  Check,
  CalendarCheck,
  Laptop,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { CurrentUser } from '../types';

/* ==========================================================================
   1. TYPES & INTERFACES
   ========================================================================== */

export type EventCategory = 
  | 'trabalho' 
  | 'reuniao' 
  | 'suporte_tecnico' 
  | 'manutencao' 
  | 'cliente' 
  | 'pessoal' 
  | 'financeiro' 
  | 'outro';

export type EventPriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type EventStatus = 'agendado' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado';
export type TaskStatus = 'a_fazer' | 'em_progresso' | 'concluida' | 'cancelada';
export type MainTab = 'calendario' | 'tarefas' | 'lembretes' | 'contatos' | 'ocorrencias' | 'dashboard';
export type CalendarViewMode = 'mes' | 'agenda';

export interface CustomReminder {
  id: string;
  targetId: string;
  targetType: 'event' | 'task';
  targetTitle: string;
  date: string;
  time: string;
  soundAlert: boolean;
  browserNotification: boolean;
  customMessage?: string;
  isActive: boolean;
  lastTriggeredAt?: string;
  snoozedUntil?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  category: EventCategory;
  priority: EventPriority;
  status: EventStatus;
  location?: string;
  isOnline?: boolean;
  contactId?: string;
  reminders?: CustomReminder[];
  tags?: string[];
  notes?: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  category: 'cliente' | 'fornecedor' | 'parceiro' | 'equipe' | 'outro';
  starred?: boolean;
  address?: string;
  hostOrIp?: string;
  notes?: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: EventPriority;
  dueDate?: string;
  dueTime?: string;
  contactId?: string;
  category?: EventCategory;
  subtasks?: Subtask[];
  reminders?: CustomReminder[];
  completedAt?: string;
  createdAt: string;
}

export interface TechnicalOccurrence {
  id: string;
  rawDateString: string;
  parsedDate: string;
  parsedTime?: string;
  clientIdentifier: string;
  errorType: string;
  errorCode: string;
  description: string;
  status: 'pendente' | 'em_andamento' | 'resolvido';
  solutionNotes?: string;
  resolvedAt?: string;
}

export interface AgendaProModuleProps {
  currentUser?: CurrentUser;
  openCreateEventTrigger?: number;
}

/* ==========================================================================
   2. INITIAL DEMO DATA
   ========================================================================== */

const today = new Date();
const pad = (n: number) => n.toString().padStart(2, '0');
const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'c-amoroso',
    name: 'Carlos Amoroso',
    company: 'Amoroso Corp Tecnologia',
    role: 'Diretor / Administrador de TI',
    email: 'carlosamorfbr@gmail.com',
    phone: '(11) 98765-4321',
    whatsapp: '5511987654321',
    category: 'cliente',
    starred: true,
    address: 'Av. Paulista, 1000 - São Paulo/SP',
    hostOrIp: '192.168.1.105 (Terminal AMOROSO)',
    notes: 'Cliente VIP. Utiliza sistema cliente/servidor com banco de dados centralizado. Atenção prioritária para estabilidade de conexão.',
    createdAt: '2021-03-05'
  },
  {
    id: 'c-userpc',
    name: 'Estação Operacional USER-PC',
    company: 'Amoroso Corp Tecnologia',
    role: 'Terminal de Caixa / Vendas',
    email: 'suporte@amoroso.com.br',
    phone: '(11) 91234-5678',
    category: 'cliente',
    starred: true,
    address: 'Setor de Produção - Bloco B',
    hostOrIp: '192.168.1.200 (USER-PC)',
    notes: 'Estação com histórico de tentativas de conexão de rede. Verificar status do serviço e regras do Firewall local.',
    createdAt: '2022-02-03'
  },
  {
    id: 'c-luciana',
    name: 'Luciana Ferreira',
    company: 'Alpha Distribuidora',
    role: 'Gerente Financeira',
    email: 'luciana@alphadistrib.com.br',
    phone: '(11) 97777-8888',
    whatsapp: '5511977778888',
    category: 'cliente',
    starred: false,
    address: 'Alameda Santos, 450 - SP',
    createdAt: '2023-08-10'
  }
];

export const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 'evt-1',
    title: 'Manutenção Preventiva Servidor & Banco de Dados',
    description: 'Verificação dos serviços de conexão, otimização de índices e conferência de logs de rede.',
    date: todayStr,
    startTime: '09:30',
    endTime: '11:00',
    category: 'suporte_tecnico',
    priority: 'alta',
    status: 'agendado',
    contactId: 'c-amoroso',
    location: 'Servidor Principal (192.168.1.105)',
    isOnline: false,
    tags: ['Suporte', 'Servidor', 'TI', 'Manutenção'],
    reminders: [
      {
        id: 'rem-1',
        targetId: 'evt-1',
        targetType: 'event',
        targetTitle: 'Manutenção Preventiva Servidor & Banco de Dados',
        date: todayStr,
        time: '09:15',
        soundAlert: true,
        browserNotification: true,
        customMessage: 'Preparar ferramentas de diagnóstico e testar conectividade do servidor.',
        isActive: true
      }
    ],
    createdAt: '2026-09-01T08:00:00Z'
  },
  {
    id: 'evt-2',
    title: 'Alinhamento Semanal de Metas & Projetos',
    description: 'Apresentação do relatório mensal e novos chamados de suporte técnico.',
    date: todayStr,
    startTime: '14:00',
    endTime: '15:00',
    category: 'reuniao',
    priority: 'media',
    status: 'agendado',
    isOnline: true,
    location: 'Google Meet (meet.google.com/xyz-amoroso)',
    tags: ['Reunião', 'Planejamento', 'Diretoria'],
    reminders: [
      {
        id: 'rem-2',
        targetId: 'evt-2',
        targetType: 'event',
        targetTitle: 'Alinhamento Semanal de Metas & Projetos',
        date: todayStr,
        time: '13:50',
        soundAlert: true,
        browserNotification: true,
        customMessage: 'Abrir a sala do Google Meet 10 minutos antes.',
        isActive: true
      }
    ],
    createdAt: '2026-09-02T10:00:00Z'
  }
];

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'tsk-1',
    title: 'Diagnosticar e tratar causa raiz do erro 10061 (USER-PC)',
    description: 'Investigar log técnico: INET/inet_error: connect errno = 10061. Validar serviço de banco e liberar portas de rede.',
    status: 'em_progresso',
    priority: 'urgente',
    dueDate: todayStr,
    dueTime: '17:00',
    contactId: 'c-userpc',
    category: 'suporte_tecnico',
    subtasks: [
      { id: 'st-1', title: 'Verificar se o serviço do servidor está "Em Execução"', completed: true },
      { id: 'st-2', title: 'Testar conectividade e ping para o host 192.168.1.200', completed: true },
      { id: 'st-3', title: 'Configurar Regra de Entrada no Windows Firewall', completed: false },
      { id: 'st-4', title: 'Testar aplicação cliente no terminal USER-PC', completed: false }
    ],
    reminders: [
      {
        id: 'rem-t1',
        targetId: 'tsk-1',
        targetType: 'task',
        targetTitle: 'Diagnosticar e tratar causa raiz do erro 10061 (USER-PC)',
        date: todayStr,
        time: '16:30',
        soundAlert: true,
        browserNotification: true,
        customMessage: 'Finalizar testes de firewall no terminal USER-PC antes do fechamento.',
        isActive: true
      }
    ],
    createdAt: '2026-09-03T11:00:00Z'
  },
  {
    id: 'tsk-2',
    title: 'Emitir e enviar relatório mensal de chamados de TI',
    description: 'Compilar todas as ocorrências de conexão atendidas no mês de Agosto.',
    status: 'a_fazer',
    priority: 'media',
    dueDate: todayStr,
    dueTime: '18:00',
    category: 'financeiro',
    subtasks: [
      { id: 'st-21', title: 'Gerar PDF com gráficos de chamados', completed: false },
      { id: 'st-22', title: 'Enviar e-mail para a diretoria', completed: false }
    ],
    createdAt: '2026-09-03T14:00:00Z'
  }
];

export const INITIAL_OCCURRENCES: TechnicalOccurrence[] = [
  {
    id: 'occ-1',
    rawDateString: 'Fri Feb  3 10:48:47 2012',
    parsedDate: '2012-02-03',
    parsedTime: '10:48:47',
    clientIdentifier: 'USER-PC',
    errorType: 'INET/inet_error',
    errorCode: '10061',
    description: 'Falha de conexão: WSAECONNREFUSED (O servidor recusou ativamente a tentativa de conexão na porta TCP)',
    status: 'em_andamento',
    solutionNotes: 'Servidor estava reiniciando atualizações do Windows. Porta foi liberada no Firewall.'
  },
  {
    id: 'occ-2',
    rawDateString: 'Mon Sep  1 08:30:12 2026',
    parsedDate: '2026-09-01',
    parsedTime: '08:30:12',
    clientIdentifier: 'AMOROSO',
    errorType: 'INET/inet_error',
    errorCode: '10061',
    description: 'Tentativa de conexão falhou: Serviço não respondeu a tempo.',
    status: 'resolvido',
    solutionNotes: 'Serviço reiniciado com sucesso via services.msc.',
    resolvedAt: '2026-09-01'
  }
];

/* ==========================================================================
   3. SOUND & NOTIFICATION SYNTHESIZER
   ========================================================================== */

export function playWebAudioTone(frequency = 880, durationMs = 300, type: OscillatorType = 'sine') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // AudioContext fallback
  }
}

export function playChimeSound() {
  playWebAudioTone(659.25, 200, 'triangle'); // E5
  setTimeout(() => playWebAudioTone(880, 400, 'triangle'), 150); // A5
  setTimeout(() => playWebAudioTone(1174.66, 600, 'sine'), 300); // D6
}

export function sendNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icon.png' });
  }
}

/* ==========================================================================
   4. LOG PARSER
   ========================================================================== */

export function parseRawLogs(rawText: string): TechnicalOccurrence[] {
  const result: TechnicalOccurrence[] = [];
  const lines = rawText.split('\n');
  let currentHost = 'DESCONHECIDO';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const headerMatch = line.match(/^([A-Za-z0-9_-]+)\s+\((Server|Client)\)\s+([A-Za-z]{3}\s+[A-Za-z]{3}\s+\d+\s+\d+:\d+:\d+\s+\d{4})/i);
    if (headerMatch) {
      currentHost = headerMatch[1];
      continue;
    }

    if (line.includes('10061') || line.includes('errno') || line.includes('error')) {
      const isErr10061 = line.includes('10061');
      result.push({
        id: `occ-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        rawDateString: new Date().toLocaleString(),
        parsedDate: todayStr,
        parsedTime: new Date().toTimeString().split(' ')[0],
        clientIdentifier: currentHost,
        errorType: 'INET/Connection_Error',
        errorCode: isErr10061 ? '10061' : 'ERR',
        description: `Falha de conexão detectada: ${line}`,
        status: 'pendente',
        solutionNotes: isErr10061 
          ? 'WSAECONNREFUSED: O servidor recusou a conexão. Cheque se o serviço está ativo e as portas liberadas.'
          : 'Verifique conectividade de rede.'
      });
    }
  }

  return result;
}

/* ==========================================================================
   5. COLOR HELPER UTILS
   ========================================================================== */

const CATEGORY_COLORS: Record<EventCategory, { bg: string; text: string; border: string; label: string }> = {
  suporte_tecnico: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', label: 'Suporte Técnico' },
  manutencao: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', label: 'Manutenção' },
  reuniao: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800', label: 'Reunião' },
  trabalho: { bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800', label: 'Trabalho' },
  cliente: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', label: 'Cliente' },
  financeiro: { bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800', label: 'Financeiro' },
  pessoal: { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800', label: 'Pessoal' },
  outro: { bg: 'bg-slate-50 dark:bg-slate-800/60', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', label: 'Geral' }
};

const PRIORITY_BADGES: Record<EventPriority, { bg: string; text: string; label: string }> = {
  urgente: { bg: 'bg-rose-500 text-white', text: 'text-rose-600 dark:text-rose-400', label: 'Urgente' },
  alta: { bg: 'bg-amber-500 text-white', text: 'text-amber-600 dark:text-amber-400', label: 'Alta' },
  media: { bg: 'bg-sky-500 text-white', text: 'text-sky-600 dark:text-sky-400', label: 'Média' },
  baixa: { bg: 'bg-slate-400 text-white', text: 'text-slate-500 dark:text-slate-400', label: 'Baixa' }
};

/* ==========================================================================
   6. AGENDA PRO COMPONENT (WORKPULSE MODULE)
   ========================================================================== */

export const AgendaProModule: React.FC<AgendaProModuleProps> = ({
  currentUser,
  openCreateEventTrigger
}) => {
  // Persistence state
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('applet_agenda_pro_events');
    return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('applet_agenda_pro_contacts');
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('applet_agenda_pro_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [occurrences, setOccurrences] = useState<TechnicalOccurrence[]>(() => {
    const saved = localStorage.getItem('applet_agenda_pro_occurrences');
    return saved ? JSON.parse(saved) : INITIAL_OCCURRENCES;
  });

  // UI state
  const [currentTab, setCurrentTab] = useState<MainTab>('calendario');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('mes');
  const [activeAlarm, setActiveAlarm] = useState<CustomReminder | null>(null);

  // Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [isImportLogsOpen, setIsImportLogsOpen] = useState(false);
  const [rawLogsInput, setRawLogsInput] = useState('');

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('applet_agenda_pro_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('applet_agenda_pro_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('applet_agenda_pro_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('applet_agenda_pro_occurrences', JSON.stringify(occurrences));
  }, [occurrences]);

  // Handle header action trigger
  useEffect(() => {
    if (openCreateEventTrigger && openCreateEventTrigger > 0) {
      setEditingEvent(null);
      setIsEventModalOpen(true);
    }
  }, [openCreateEventTrigger]);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Periodic Reminder Engine
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = pad(now.getHours());
      const currentMins = pad(now.getMinutes());
      const currentFullTime = `${currentHours}:${currentMins}`;
      const currentDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      const allReminders: CustomReminder[] = [
        ...events.flatMap(e => e.reminders || []),
        ...tasks.flatMap(t => t.reminders || [])
      ];

      for (const rem of allReminders) {
        if (rem.isActive && rem.date === currentDate && rem.time === currentFullTime && rem.lastTriggeredAt !== currentFullTime) {
          playChimeSound();
          if (rem.browserNotification) {
            sendNotification(`Lembrete: ${rem.targetTitle}`, rem.customMessage || `Horário agendado: ${rem.time}`);
          }
          setActiveAlarm(rem);
          rem.lastTriggeredAt = currentFullTime;
          break;
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [events, tasks]);

  // Filtered lists
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const q = searchQuery.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.tags?.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [events, searchQuery]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
    });
  }, [tasks, searchQuery]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.hostOrIp?.toLowerCase().includes(q)
      );
    });
  }, [contacts, searchQuery]);

  // Calendar calculations
  const currentMonthYear = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [selectedDate]);

  const monthCalendarDays = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    const year = d.getFullYear();
    const month = d.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDay.getDay(); // 0 = Dom
    const daysInMonth = lastDay.getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, pDay);
      days.push({
        dateStr: `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}-${pad(pDay)}`,
        dayNum: pDay,
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        dateStr: `${year}-${pad(month + 1)}-${pad(i)}`,
        dayNum: i,
        isCurrentMonth: true
      });
    }

    // Next month padding to fill slots
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        dateStr: `${nextDate.getFullYear()}-${pad(nextDate.getMonth() + 1)}-${pad(i)}`,
        dayNum: i,
        isCurrentMonth: false
      });
    }

    return days;
  }, [selectedDate]);

  // Export JSON data
  const handleExportData = () => {
    const data = { events, contacts, tasks, occurrences, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workpulse_agenda_pro_${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON data
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.events) setEvents(data.events);
        if (data.contacts) setContacts(data.contacts);
        if (data.tasks) setTasks(data.tasks);
        if (data.occurrences) setOccurrences(data.occurrences);
        alert('Dados da Agenda importados com sucesso!');
      } catch (err) {
        alert('Erro ao carregar arquivo JSON da Agenda.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      
      {/* 🔔 ACTIVE ALARM POPUP */}
      {activeAlarm && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full p-4 bg-indigo-600 text-white rounded-2xl shadow-2xl border border-indigo-400 flex items-start gap-3.5 animate-bounce">
          <div className="p-2.5 bg-white/20 rounded-xl">
            <Bell className="w-6 h-6 animate-pulse text-amber-300" />
          </div>
          <div className="flex-1">
            <h4 className="font-extrabold text-sm flex items-center gap-2">
              Lembrete: {activeAlarm.targetTitle}
            </h4>
            <p className="text-xs text-indigo-100 mt-1">
              {activeAlarm.customMessage || `Horário programado: ${activeAlarm.time}`}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setActiveAlarm(null)}
                className="px-3 py-1 bg-white text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                Dispensar
              </button>
              <button
                onClick={() => {
                  playChimeSound();
                  setActiveAlarm(null);
                }}
                className="px-3 py-1 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Soneca (5 min)
              </button>
            </div>
          </div>
          <button onClick={() => setActiveAlarm(null)} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 🧭 SUB-BAR NAVIGATION & ACTIONS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'calendario', label: `Calendário (${events.length})`, icon: CalendarIcon },
            { id: 'tarefas', label: `Tarefas (${tasks.filter(t => t.status !== 'concluida').length})`, icon: CheckSquare },
            { id: 'lembretes', label: 'Lembretes & Alarmes', icon: Bell },
            { id: 'contatos', label: `Clientes & Contatos (${contacts.length})`, icon: Users },
            { id: 'ocorrencias', label: `Suporte & Diagnóstico (${occurrences.length})`, icon: Activity },
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as MainTab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Search & Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="relative w-full md:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <button
            onClick={() => {
              setEditingEvent(null);
              setIsEventModalOpen(true);
            }}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Evento</span>
          </button>

          <button
            onClick={handleExportData}
            title="Exportar dados da Agenda em JSON"
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <label
            title="Importar dados da Agenda em JSON"
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: CALENDAR VIEW
          ========================================================================= */}
      {currentTab === 'calendario' && (
        <div className="space-y-4">
          
          {/* Calendar Controls & Month Switcher */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const d = new Date(selectedDate + 'T00:00:00');
                  d.setMonth(d.getMonth() - 1);
                  setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
                }}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white capitalize min-w-[150px] text-center">
                {currentMonthYear}
              </h3>
              <button
                onClick={() => {
                  const d = new Date(selectedDate + 'T00:00:00');
                  d.setMonth(d.getMonth() + 1);
                  setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
                }}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg hover:bg-indigo-100 cursor-pointer"
              >
                Hoje
              </button>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {(['mes', 'agenda'] as CalendarViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setCalendarViewMode(mode)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    calendarViewMode === mode 
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs' 
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {mode === 'mes' ? 'Mês' : 'Lista / Agenda'}
                </button>
              ))}
            </div>
          </div>

          {/* MONTH GRID VIEW */}
          {calendarViewMode === 'mes' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <div>Dom</div>
                <div>Seg</div>
                <div>Ter</div>
                <div>Qua</div>
                <div>Qui</div>
                <div>Sex</div>
                <div>Sáb</div>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
                {monthCalendarDays.map((dayItem, idx) => {
                  const dayEvents = filteredEvents.filter(e => e.date === dayItem.dateStr);
                  const isToday = dayItem.dateStr === todayStr;
                  const isSelected = dayItem.dateStr === selectedDate;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(dayItem.dateStr)}
                      className={`min-h-[115px] p-2 flex flex-col justify-between transition-colors cursor-pointer ${
                        !dayItem.isCurrentMonth ? 'bg-slate-50/40 dark:bg-slate-950/40 text-slate-400 opacity-60' : 'bg-white dark:bg-slate-900'
                      } ${isSelected ? 'ring-2 ring-indigo-500 ring-inset z-10' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                            isToday
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {dayItem.dayNum}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] font-bold text-indigo-500 font-mono">
                            {dayEvents.length} ev
                          </span>
                        )}
                      </div>

                      {/* Events list in cell */}
                      <div className="mt-1.5 space-y-1 overflow-y-auto max-h-[70px] scrollbar-none">
                        {dayEvents.map(evt => {
                          const catColor = CATEGORY_COLORS[evt.category] || CATEGORY_COLORS.outro;
                          return (
                            <div
                              key={evt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEvent(evt);
                                setIsEventModalOpen(true);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate border ${catColor.bg} ${catColor.text} ${catColor.border} hover:opacity-80 transition-opacity`}
                              title={`${evt.startTime} - ${evt.title}`}
                            >
                              {evt.startTime} {evt.title}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LIST / AGENDA VIEW */}
          {calendarViewMode === 'agenda' && (
            <div className="space-y-3">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <CalendarIcon className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-slate-500">Nenhum compromisso encontrado.</p>
                </div>
              ) : (
                filteredEvents
                  .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
                  .map(evt => {
                    const catColor = CATEGORY_COLORS[evt.category] || CATEGORY_COLORS.outro;
                    const priorityColor = PRIORITY_BADGES[evt.priority] || PRIORITY_BADGES.media;
                    const contact = contacts.find(c => c.id === evt.contactId);

                    return (
                      <div
                        key={evt.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-center min-w-[70px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              {new Date(evt.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                            </span>
                            <span className="text-base font-extrabold text-slate-900 dark:text-white">
                              {evt.date.split('-')[2]}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {evt.startTime}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                                {evt.title}
                              </h4>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                                {catColor.label}
                              </span>
                              <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${priorityColor.bg}`}>
                                {priorityColor.label}
                              </span>
                            </div>

                            {evt.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                {evt.description}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                              {evt.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  {evt.location}
                                </span>
                              )}
                              {contact && (
                                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                                  <Users className="w-3.5 h-3.5" />
                                  {contact.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end md:self-center">
                          <button
                            onClick={() => {
                              setEditingEvent(evt);
                              setIsEventModalOpen(true);
                            }}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Excluir este evento?')) {
                                setEvents(prev => prev.filter(e => e.id !== evt.id));
                              }
                            }}
                            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: TASKS VIEW
          ========================================================================= */}
      {currentTab === 'tarefas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Quadro de Tarefas & Chamados Operacionais
              </h3>
              <p className="text-xs text-slate-500">
                {tasks.filter(t => t.status !== 'concluida').length} tarefas pendentes no momento
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Tarefa</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map(task => {
              const isCompleted = task.status === 'concluida';
              const priority = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.media;
              const contact = contacts.find(c => c.id === task.contactId);

              return (
                <div
                  key={task.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border transition-all ${
                    isCompleted 
                      ? 'border-slate-200 dark:border-slate-800 opacity-60' 
                      : 'border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-200 dark:hover:border-indigo-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => {
                          setTasks(prev => prev.map(t => {
                            if (t.id === task.id) {
                              return {
                                ...t,
                                status: t.status === 'concluida' ? 'a_fazer' : 'concluida',
                                completedAt: t.status !== 'concluida' ? new Date().toISOString() : undefined
                              };
                            }
                            return t;
                          }));
                        }}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                          isCompleted 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'
                        }`}
                      >
                        {isCompleted && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <div>
                        <h4 className={`text-sm font-bold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${priority.bg}`}>
                      {priority.label}
                    </span>
                  </div>

                  {/* Subtasks checklist */}
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Checklist ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})
                      </span>
                      {task.subtasks.map(st => (
                        <div
                          key={st.id}
                          onClick={() => {
                            setTasks(prev => prev.map(t => {
                              if (t.id === task.id) {
                                return {
                                  ...t,
                                  subtasks: t.subtasks?.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s)
                                };
                              }
                              return t;
                            }));
                          }}
                          className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${st.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                            {st.completed && <Check className="w-2.5 h-2.5" />}
                          </div>
                          <span className={st.completed ? 'line-through text-slate-400' : ''}>
                            {st.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Task Footer */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {task.dueDate} {task.dueTime}
                        </span>
                      )}
                      {contact && (
                        <span className="text-indigo-600 dark:text-indigo-400">
                          • {contact.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingTask(task);
                          setIsTaskModalOpen(true);
                        }}
                        className="p-1 hover:text-indigo-600 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Excluir tarefa?')) {
                            setTasks(prev => prev.filter(t => t.id !== task.id));
                          }
                        }}
                        className="p-1 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: CONTACTS VIEW
          ========================================================================= */}
      {currentTab === 'contatos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Cadastro de Clientes, Terminais & Contatos
              </h3>
              <p className="text-xs text-slate-500">
                {contacts.length} registros cadastrados na base corporativa
              </p>
            </div>
            <button
              onClick={() => {
                setEditingContact(null);
                setIsContactModalOpen(true);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Contato / Terminal</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredContacts.map(contact => (
              <div
                key={contact.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center justify-center text-sm">
                      {contact.name.substring(0, 2).toUpperCase()}
                    </div>
                    <button
                      onClick={() => {
                        setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, starred: !c.starred } : c));
                      }}
                      className={`p-1.5 rounded-lg cursor-pointer ${contact.starred ? 'text-amber-400' : 'text-slate-300 hover:text-slate-400'}`}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-2">
                    {contact.name}
                  </h4>
                  {contact.company && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {contact.company} • {contact.role}
                    </p>
                  )}

                  <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{contact.email}</span>
                      </div>
                    )}
                    {contact.hostOrIp && (
                      <div className="flex items-center gap-2 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                        <Activity className="w-3 h-3" />
                        <span>{contact.hostOrIp}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {contact.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingContact(contact);
                        setIsContactModalOpen(true);
                      }}
                      className="p-1 hover:text-indigo-600 text-slate-400 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Excluir contato?')) {
                          setContacts(prev => prev.filter(c => c.id !== contact.id));
                        }
                      }}
                      className="p-1 hover:text-rose-600 text-slate-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: REMINDERS & ALARMS VIEW
          ========================================================================= */}
      {currentTab === 'lembretes' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold flex items-center gap-2 font-['Outfit']">
                <Bell className="w-5 h-5 text-amber-300" />
                Central de Lembretes & Alarmes Sonoros
              </h3>
              <p className="text-xs text-indigo-200 mt-1 max-w-xl leading-relaxed">
                Sistema ativo de verificação periódica. Emite bipes sintetizados via Web Audio API e notificações no navegador quando chega o horário programado de manutenções e compromissos.
              </p>
            </div>
            <button
              onClick={playChimeSound}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>Testar Som de Alarme</span>
            </button>
          </div>

          {/* All registered reminders */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Lembretes Ativos em Compromissos e Tarefas
            </h4>

            {[...events.flatMap(e => e.reminders || []), ...tasks.flatMap(t => t.reminders || [])].length === 0 ? (
              <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500">Nenhum lembrete configurado no momento.</p>
              </div>
            ) : (
              [...events.flatMap(e => e.reminders || []), ...tasks.flatMap(t => t.reminders || [])].map((rem, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                        {rem.targetTitle}
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Agendado para: <strong>{rem.date} às {rem.time}</strong> • {rem.customMessage || 'Alarme sonoro ativo'}
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                    Ativo
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: TECHNICAL OCCURRENCES & LOG PARSER
          ========================================================================= */}
      {currentTab === 'ocorrencias' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Diagnóstico Técnico & Ocorrências de Conexão de Rede
              </h3>
              <p className="text-xs text-slate-500">
                Importe logs técnicos brutos para converter automaticamente em ocorrências, manutenções e tarefas.
              </p>
            </div>

            <button
              onClick={() => setIsImportLogsOpen(!isImportLogsOpen)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileTerminal className="w-4 h-4" />
              <span>{isImportLogsOpen ? 'Fechar Importador' : 'Importar Logs Brutos'}</span>
            </button>
          </div>

          {/* Raw Log Importer Panel */}
          {isImportLogsOpen && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-indigo-200 dark:border-indigo-900 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Cole o log técnico de rede / servidor:
              </h4>
              <textarea
                rows={4}
                value={rawLogsInput}
                onChange={(e) => setRawLogsInput(e.target.value)}
                placeholder="Ex: USER-PC (Server) Fri Feb  3 10:48:47 2012&#10;    INET/inet_error: connect errno = 10061"
                className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    const parsed = parseRawLogs(rawLogsInput);
                    if (parsed.length > 0) {
                      setOccurrences(prev => [...parsed, ...prev]);
                      setRawLogsInput('');
                      setIsImportLogsOpen(false);
                      alert(`${parsed.length} ocorrências importadas com sucesso!`);
                    } else {
                      alert('Nenhum erro de conexão reconhecido no log.');
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Processar e Adicionar Ocorrências
                </button>
              </div>
            </div>
          )}

          {/* List of occurrences */}
          <div className="space-y-3">
            {occurrences.map(occ => (
              <div
                key={occ.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 rounded-xl">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">
                        {occ.clientIdentifier}
                      </span>
                      <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded text-[10px] font-mono font-bold">
                        Erro {occ.errorCode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {occ.description}
                    </p>
                    {occ.solutionNotes && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        💡 Solução sugerida: {occ.solutionNotes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => {
                      const newEvt: CalendarEvent = {
                        id: `evt-from-${Date.now()}`,
                        title: `Manutenção: ${occ.clientIdentifier} (Erro ${occ.errorCode})`,
                        date: todayStr,
                        startTime: '10:00',
                        endTime: '11:00',
                        category: 'suporte_tecnico',
                        priority: 'alta',
                        status: 'agendado',
                        description: occ.description,
                        createdAt: new Date().toISOString()
                      };
                      setEvents(prev => [newEvt, ...prev]);
                      setCurrentTab('calendario');
                    }}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Converter em Evento
                  </button>
                  <button
                    onClick={() => setOccurrences(prev => prev.filter(o => o.id !== occ.id))}
                    className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: DASHBOARD OVERVIEW
          ========================================================================= */}
      {currentTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Compromissos</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{events.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tarefas Pendentes</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">{tasks.filter(t => t.status !== 'concluida').length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes / Terminais</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{contacts.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ocorrências Técnicas</span>
              <p className="text-2xl font-black text-rose-600 mt-1">{occurrences.length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3">
              Próximos Compromissos Agendados
            </h4>
            <div className="space-y-2">
              {events.slice(0, 5).map(evt => (
                <div key={evt.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{evt.title}</span>
                    <p className="text-[11px] text-slate-500">{evt.date} às {evt.startTime}</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 capitalize">{evt.category.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: NOVO / EDITAR EVENTO
          ========================================================================= */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingEvent ? 'Editar Compromisso' : 'Novo Compromisso na Agenda'}
              </h3>
              <button onClick={() => setIsEventModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const titleVal = (form.elements.namedItem('title') as HTMLInputElement).value;
                const dateVal = (form.elements.namedItem('date') as HTMLInputElement).value;
                const startVal = (form.elements.namedItem('startTime') as HTMLInputElement).value;
                const endVal = (form.elements.namedItem('endTime') as HTMLInputElement).value;
                const catVal = (form.elements.namedItem('category') as HTMLSelectElement).value as EventCategory;
                const descVal = (form.elements.namedItem('description') as HTMLTextAreaElement).value;

                if (editingEvent) {
                  setEvents(prev => prev.map(ev => ev.id === editingEvent.id ? {
                    ...ev,
                    title: titleVal,
                    date: dateVal,
                    startTime: startVal,
                    endTime: endVal,
                    category: catVal,
                    description: descVal
                  } : ev));
                } else {
                  const newEv: CalendarEvent = {
                    id: `evt-${Date.now()}`,
                    title: titleVal,
                    date: dateVal,
                    startTime: startVal,
                    endTime: endVal,
                    category: catVal,
                    priority: 'media',
                    status: 'agendado',
                    description: descVal,
                    createdAt: new Date().toISOString()
                  };
                  setEvents(prev => [newEv, ...prev]);
                }
                setIsEventModalOpen(false);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Título do Evento</label>
                <input
                  name="title"
                  defaultValue={editingEvent?.title || ''}
                  required
                  placeholder="Ex: Manutenção de Servidor"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Data</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={editingEvent?.date || selectedDate}
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Início</label>
                  <input
                    type="time"
                    name="startTime"
                    defaultValue={editingEvent?.startTime || '09:00'}
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Término</label>
                  <input
                    type="time"
                    name="endTime"
                    defaultValue={editingEvent?.endTime || '10:00'}
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Categoria</label>
                <select
                  name="category"
                  defaultValue={editingEvent?.category || 'suporte_tecnico'}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                >
                  <option value="suporte_tecnico">Suporte Técnico</option>
                  <option value="manutencao">Manutenção</option>
                  <option value="reuniao">Reunião</option>
                  <option value="trabalho">Trabalho</option>
                  <option value="cliente">Cliente</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="pessoal">Pessoal</option>
                  <option value="outro">Geral</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Descrição</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingEvent?.description || ''}
                  placeholder="Detalhes adicionais..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Salvar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: NOVO / EDITAR CONTATO
          ========================================================================= */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingContact ? 'Editar Contato' : 'Novo Cliente / Terminal'}
              </h3>
              <button onClick={() => setIsContactModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const nameVal = (form.elements.namedItem('name') as HTMLInputElement).value;
                const compVal = (form.elements.namedItem('company') as HTMLInputElement).value;
                const phoneVal = (form.elements.namedItem('phone') as HTMLInputElement).value;
                const ipVal = (form.elements.namedItem('hostOrIp') as HTMLInputElement).value;

                if (editingContact) {
                  setContacts(prev => prev.map(c => c.id === editingContact.id ? {
                    ...c,
                    name: nameVal,
                    company: compVal,
                    phone: phoneVal,
                    hostOrIp: ipVal
                  } : c));
                } else {
                  const newCt: Contact = {
                    id: `c-${Date.now()}`,
                    name: nameVal,
                    company: compVal,
                    phone: phoneVal,
                    hostOrIp: ipVal,
                    category: 'cliente',
                    createdAt: new Date().toISOString()
                  };
                  setContacts(prev => [newCt, ...prev]);
                }
                setIsContactModalOpen(false);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Nome / Identificação</label>
                <input
                  name="name"
                  defaultValue={editingContact?.name || ''}
                  required
                  placeholder="Ex: Carlos Amoroso ou USER-PC"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Empresa / Departamento</label>
                <input
                  name="company"
                  defaultValue={editingContact?.company || ''}
                  placeholder="Ex: Setor Financeiro"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Telefone / WhatsApp</label>
                <input
                  name="phone"
                  defaultValue={editingContact?.phone || ''}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Host / IP / Terminal</label>
                <input
                  name="hostOrIp"
                  defaultValue={editingContact?.hostOrIp || ''}
                  placeholder="Ex: 192.168.1.105 (Terminal AMOROSO)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Salvar Contato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: NOVO / EDITAR TAREFA
          ========================================================================= */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
              </h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const titleVal = (form.elements.namedItem('title') as HTMLInputElement).value;
                const dueVal = (form.elements.namedItem('dueDate') as HTMLInputElement).value;
                const descVal = (form.elements.namedItem('description') as HTMLTextAreaElement).value;

                if (editingTask) {
                  setTasks(prev => prev.map(t => t.id === editingTask.id ? {
                    ...t,
                    title: titleVal,
                    dueDate: dueVal,
                    description: descVal
                  } : t));
                } else {
                  const newTk: TaskItem = {
                    id: `tsk-${Date.now()}`,
                    title: titleVal,
                    dueDate: dueVal,
                    description: descVal,
                    status: 'a_fazer',
                    priority: 'alta',
                    createdAt: new Date().toISOString()
                  };
                  setTasks(prev => [newTk, ...prev]);
                }
                setIsTaskModalOpen(false);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Título da Tarefa</label>
                <input
                  name="title"
                  defaultValue={editingTask?.title || ''}
                  required
                  placeholder="Ex: Verificar portas de rede do firewall"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Data Limite</label>
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={editingTask?.dueDate || todayStr}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Descrição</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingTask?.description || ''}
                  placeholder="Instruções ou checklist..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Salvar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AgendaProModule;
