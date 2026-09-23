import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  BookOpen, 
  HelpCircle, 
  Sparkles, 
  Compass, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Download, 
  ExternalLink, 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  ChevronRight, 
  Filter, 
  Layers, 
  Zap, 
  Tag, 
  Clock, 
  ArrowLeft, 
  X 
} from 'lucide-react';
import { 
  INITIAL_KB_ARTICLES, 
  INITIAL_KB_FAQS, 
  INITIAL_KB_TUTORIALS 
} from '../../data/knowledgeData';
import { 
  KBArticle, 
  KBFaq, 
  KBTutorial, 
  KBModuleId
} from '../../types/knowledge';

interface HelpCenterModuleProps {
  initialArticleId?: string;
  onStartTour: (tabId: string) => void;
  openCreateModalTrigger?: number;
}

export const HelpCenterModule: React.FC<HelpCenterModuleProps> = ({
  initialArticleId,
  onStartTour,
  openCreateModalTrigger
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'articles' | 'faq' | 'tutorials'>('overview');
  
  // Articles & CMS State
  const [articles, setArticles] = useState<KBArticle[]>(INITIAL_KB_ARTICLES);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(initialArticleId || null);
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<KBModuleId | 'Todos'>('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // FAQs State
  const [faqs, setFaqs] = useState<KBFaq[]>(INITIAL_KB_FAQS);
  const [faqCategoryFilter, setFaqCategoryFilter] = useState<string>('Todas');

  // CMS Article Editor Modal State
  const [isCreateArticleModalOpen, setIsCreateArticleModalOpen] = useState(false);
  const [newArticleTitle, setNewArticleTitle] = useState('');
  const [newArticleModule, setNewArticleModule] = useState<KBModuleId>('Dashboard');
  const [newArticleDesc, setNewArticleDesc] = useState('');
  const [newArticleObj, setNewArticleObj] = useState('');

  useEffect(() => {
    if (openCreateModalTrigger && openCreateModalTrigger > 0) {
      setIsCreateArticleModalOpen(true);
    }
  }, [openCreateModalTrigger]);

  // Filtered Articles Search
  const filteredArticles = useMemo(() => {
    return articles.filter(art => {
      const matchesModule = selectedModuleFilter === 'Todos' || art.moduleId === selectedModuleFilter;
      const q = searchQuery.toLowerCase();
      const matchesQuery = !q || 
        art.title.toLowerCase().includes(q) ||
        art.description.toLowerCase().includes(q) ||
        art.tags.some(t => t.toLowerCase().includes(q)) ||
        art.commonErrors.some(e => e.error.toLowerCase().includes(q) || (e.code && e.code.toLowerCase().includes(q)));
      
      return matchesModule && matchesQuery;
    });
  }, [articles, selectedModuleFilter, searchQuery]);

  // Selected Article Object
  const currentArticle = useMemo(() => {
    return articles.find(a => a.id === selectedArticleId) || articles[0];
  }, [articles, selectedArticleId]);

  const handleCreateArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticleTitle) return;

    const newArt: KBArticle = {
      id: `art-${Date.now()}`,
      title: newArticleTitle,
      slug: newArticleTitle.toLowerCase().replace(/ /g, '-'),
      moduleId: newArticleModule,
      moduleName: newArticleModule,
      description: newArticleDesc || 'Descrição do novo artigo operacional cadastrado via CMS.',
      objective: newArticleObj || 'Instruir os colaboradores sobre a utilização das telas.',
      operationalFlow: '1. Acessar o sistema -> 2. Executar validação -> 3. Salvar alterações.',
      prerequisites: ['Acesso ao módulo ' + newArticleModule],
      examples: ['Exemplo prático de configuração'],
      stepByStep: [
        { stepNumber: 1, title: 'Acessar a tela', detail: 'Navegue pelo menu lateral até a seção correspondente.' }
      ],
      commonErrors: [
        { error: 'Acesso negado', code: 'ERR_PERM_DENIED', solution: 'Solicite permissão ao administrador no painel de RBAC.' }
      ],
      videos: [],
      faqs: [{ question: 'Como acessar?', answer: 'Pelo menu lateral do sistema.' }],
      files: [],
      externalLinks: [],
      tags: ['CMS', newArticleModule],
      targetRoles: ['Administrador', 'Gestor'],
      version: '1.0.0',
      updatedAt: new Date().toISOString().split('T')[0],
      author: 'Administrador CMS',
      viewsCount: 1,
      helpfulCount: 0,
      unhelpfulCount: 0
    };

    setArticles([newArt, ...articles]);

    setIsCreateArticleModalOpen(false);
    setNewArticleTitle('');
    setSelectedArticleId(newArt.id);
    setActiveSubTab('articles');
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      
      {/* Module Navigation Sub-Tabs */}
      <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm text-xs justify-between items-center flex-wrap gap-2">
        <div className="flex items-center space-x-1 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'overview'
                ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Visão Geral & Pesquisa</span>
          </button>

          <button
            onClick={() => setActiveSubTab('articles')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'articles'
                ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Base de Artigos ({filteredArticles.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('faq')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'faq'
                ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FAQ Inteligente</span>
          </button>

          <button
            onClick={() => setActiveSubTab('tutorials')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'tutorials'
                ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Guias & Tutoriais</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 shrink-0 ml-auto pr-1">
          <button
            onClick={() => onStartTour('knowledge_base')}
            className="flex items-center space-x-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            title="Iniciar tour guiado interativo desta tela"
          >
            <Compass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Tour desta Tela</span>
          </button>

          <button
            onClick={() => setIsCreateArticleModalOpen(true)}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
            title="Criar novo artigo ou manual operacional"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400 dark:text-blue-200" />
            <span>Novo Artigo (CMS)</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: VISÃO GERAL & PESQUISA INTELIGENTE */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Smart Search Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Pesquisa Inteligente na Base de Conhecimento</span>
            </h3>

            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquise por palavra, frase, erro (ex: 403), módulo, função ou tag (ex: ociosidade, gpo, totvs)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 font-medium focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Module Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto text-xs pt-1">
              <span className="text-slate-500 dark:text-slate-400 font-bold shrink-0">Módulos:</span>
              {(['Todos', 'Ociosidade', 'Bloqueios', 'Integracoes', 'GPO_LGPD', 'Classificacao', 'Dashboard'] as const).map(mod => (
                <button
                  key={mod}
                  onClick={() => setSelectedModuleFilter(mod)}
                  className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedModuleFilter === mod
                      ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Access Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredArticles.slice(0, 4).map(art => (
              <div 
                key={art.id}
                onClick={() => {
                  setSelectedArticleId(art.id);
                  setActiveSubTab('articles');
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 p-5 rounded-2xl cursor-pointer transition-all space-y-3 group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded">
                    {art.moduleName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-bold">v{art.version}</span>
                </div>

                <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                  {art.title}
                </h4>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 font-medium leading-relaxed">
                  {art.description}
                </p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>👀 {art.viewsCount} acessos</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold group-hover:translate-x-1 transition-transform flex items-center">
                    Ler Artigo <ChevronRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* SUB-TAB 2: BASE DE ARTIGOS & DOCUMENTAÇÕES */}
      {activeSubTab === 'articles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Article List & Search */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl space-y-4 h-[700px] flex flex-col shadow-sm">
            <div className="space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar manuais..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500"
                />
              </div>

              <select
                value={selectedModuleFilter}
                onChange={(e) => setSelectedModuleFilter(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="Todos">Todos os Módulos</option>
                <option value="Ociosidade">Controle de Ociosidade</option>
                <option value="Bloqueios">Bloqueio de Sites & PC</option>
                <option value="Integracoes">API & ERPs</option>
                <option value="GPO_LGPD">Agente GPO & LGPD</option>
              </select>
            </div>

            {/* Articles List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredArticles.map(art => {
                const isSelected = art.id === currentArticle.id;
                return (
                  <div
                    key={art.id}
                    onClick={() => setSelectedArticleId(art.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all space-y-1 ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-300 dark:border-blue-700 text-slate-900 dark:text-white font-bold shadow-sm'
                        : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded">
                        {art.moduleName}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">v{art.version}</span>
                    </div>

                    <h4 className="text-xs font-black leading-snug text-slate-900 dark:text-white">{art.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">{art.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 2 Columns: Full Reader View */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 rounded-2xl space-y-6 h-[700px] overflow-y-auto shadow-sm">
            
            {/* Reader Header */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs uppercase font-bold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-lg">
                  {currentArticle.moduleName}
                </span>
                <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
                  <span>Versão {currentArticle.version}</span>
                  <span>•</span>
                  <span>Atualizado: {currentArticle.updatedAt}</span>
                  <span>•</span>
                  <span>Autor: {currentArticle.author}</span>
                </div>
              </div>

              <h2 className="text-lg font-black text-slate-900 dark:text-white">{currentArticle.title}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                {currentArticle.description}
              </p>
            </div>

            {/* Objective & Operational Flow */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide text-[11px] flex items-center space-x-1.5 font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Objetivo do Recurso</span>
                </h4>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{currentArticle.objective}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide text-[11px] flex items-center space-x-1.5 font-mono">
                  <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Fluxo Operacional</span>
                </h4>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{currentArticle.operationalFlow}</p>
              </div>
            </div>

            {/* Prerequisites */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Pré-Requisitos</h4>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                {currentArticle.prerequisites.map((req, i) => (
                  <li key={i} className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/70 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Step by Step */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 font-mono">Passo a Passo Detalhado</h4>
              <div className="space-y-2">
                {currentArticle.stepByStep.map((s) => (
                  <div key={s.stepNumber} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-1 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                        {s.stepNumber}
                      </span>
                      <h5 className="font-bold text-slate-900 dark:text-white">{s.title}</h5>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 pl-7 text-[11px] leading-relaxed font-medium">{s.detail}</p>
                    {s.tip && (
                      <div className="ml-7 mt-1 text-[10px] text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 p-1.5 rounded border border-amber-200 dark:border-amber-800 font-medium">
                        💡 Dica: {s.tip}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Common Errors & Fixes */}
            {currentArticle.commonErrors.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 font-mono">Erros Comuns & Soluções</h4>
                <div className="space-y-2">
                  {currentArticle.commonErrors.map((err, i) => (
                    <div key={i} className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 space-y-1 text-xs">
                      <div className="flex items-center justify-between font-bold text-rose-900 dark:text-rose-300">
                        <span>⚠️ {err.error}</span>
                        {err.code && <span className="text-[10px] font-mono text-rose-700 dark:text-rose-400">{err.code}</span>}
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed font-medium">Solução: {err.solution}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video & Attachments */}
            {currentArticle.videos.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Vídeo Demonstração</span>
                </h4>
                {currentArticle.videos.map((vid, idx) => (
                  <div key={idx} className="flex items-center justify-between text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="font-medium">{vid.title} ({vid.duration})</span>
                    <button className="px-2.5 py-1 rounded bg-slate-900 dark:bg-blue-600 text-white font-bold text-[10px] cursor-pointer">
                      Assistir
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      )}

      {/* SUB-TAB 3: FAQ INTELIGENTE */}
      {activeSubTab === 'faq' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 rounded-2xl space-y-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Perguntas Frequentes & Códigos de Erro</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Respostas diretas para dúvidas operacionais do dia a dia.</p>
            </div>

            <div className="w-full md:w-72">
              <input
                type="text"
                placeholder="Buscar no FAQ ou código de erro (ex: 403)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500 placeholder-slate-400"
              />
            </div>
          </div>

          <div className="space-y-3">
            {faqs.map((f) => (
              <div key={f.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded">
                    {f.category}
                  </span>
                  {f.errorCodes && (
                    <div className="flex items-center space-x-1">
                      {f.errorCodes.map((ec, idx) => (
                        <span key={idx} className="font-mono text-[10px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded font-bold">
                          {ec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <h4 className="font-bold text-slate-900 dark:text-white text-sm">❓ {f.question}</h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs font-medium">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: GUIAS & TUTORIAIS */}
      {activeSubTab === 'tutorials' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {INITIAL_KB_TUTORIALS.map((tut) => (
            <div key={tut.id} className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded">
                  Trilha Interativa
                </span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">{tut.completedByUsersPct}% Concluído no LMS</span>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">{tut.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{tut.description}</p>
              </div>

              <div className="space-y-2">
                {tut.steps.map((st) => (
                  <div key={st.step} className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs space-y-1">
                    <span className="font-bold text-blue-700 dark:text-blue-400">Passo {st.step}: {st.title}</span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] font-medium">{st.content}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onStartTour('overview')}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Iniciar Treinamento Guiado
              </button>
            </div>
          ))}
        </div>
      )}

      {/* CMS Article Creator Modal */}
      {isCreateArticleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-lg w-full rounded-3xl p-6 text-slate-900 dark:text-white space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Novo Artigo na Base (CMS Admin)</span>
              </h3>
              <button onClick={() => setIsCreateArticleModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateArticle} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-bold font-mono uppercase">Título do Manual</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Guia de Configuração de Regras..."
                  value={newArticleTitle}
                  onChange={(e) => setNewArticleTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-bold font-mono uppercase">Módulo do Sistema</label>
                <select
                  value={newArticleModule}
                  onChange={(e) => setNewArticleModule(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Dashboard">Dashboard</option>
                  <option value="Ociosidade">Controle de Ociosidade</option>
                  <option value="Bloqueios">Bloqueio de Sites & PC</option>
                  <option value="Integracoes">API & ERPs</option>
                  <option value="GPO_LGPD">Agente GPO & LGPD</option>
                  <option value="Classificacao">Classificação de Apps</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-bold font-mono uppercase">Resumo Executivo</label>
                <textarea
                  rows={3}
                  placeholder="Descreva o propósito deste artigo..."
                  value={newArticleDesc}
                  onChange={(e) => setNewArticleDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateArticleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold shadow-sm cursor-pointer"
                >
                  Publicar Artigo (CMS)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
