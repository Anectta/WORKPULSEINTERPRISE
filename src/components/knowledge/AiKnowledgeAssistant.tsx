import React, { useState } from 'react';
import { Bot, Send, Sparkles, BookOpen, ShieldCheck, AlertCircle, ArrowUpRight, HelpCircle } from 'lucide-react';
import { INITIAL_KB_ARTICLES, INITIAL_KB_FAQS } from '../../data/knowledgeData';
import { KBAiMessage, KBArticle } from '../../types/knowledge';

interface AiKnowledgeAssistantProps {
  onSelectArticle: (articleId: string) => void;
}

export const AiKnowledgeAssistant: React.FC<AiKnowledgeAssistantProps> = ({ onSelectArticle }) => {
  const [messages, setMessages] = useState<KBAiMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: 'Olá! Sou o Assistente IA de Conhecimento WorkPulse. Fui treinado exclusivamente com a documentação oficial da empresa. Como posso ajudar com dúvidas sobre módulos, bloqueios de sites, ociosidade, ponto eletrônico ou agentes?',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      groundedArticles: [
        { id: 'art-001', title: 'Configuração de Ociosidade & Toasts', slug: 'configuracao-ociosidade-alertas-toasts' },
        { id: 'art-002', title: 'Bloqueio de Sites & PC Lock', slug: 'bloqueio-sites-estacao-pos-expediente' }
      ]
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const suggestedPrompts = [
    'Como configurar limite de ociosidade?',
    'Como criar regra de bloqueio de site?',
    'Como resolver erro 403 na integração TOTVS?',
    'Como implantar o agente via GPO no Active Directory?'
  ];

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg: KBAiMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsThinking(true);

    setTimeout(() => {
      // Find matches in official KB articles & FAQs
      const matchedArticles: KBArticle[] = INITIAL_KB_ARTICLES.filter(art => 
        art.title.toLowerCase().includes(query.toLowerCase()) ||
        art.description.toLowerCase().includes(query.toLowerCase()) ||
        art.tags.some(t => t.toLowerCase().includes(query.toLowerCase())) ||
        art.moduleId.toLowerCase().includes(query.toLowerCase())
      );

      const matchedFaq = INITIAL_KB_FAQS.find(f => 
        f.question.toLowerCase().includes(query.toLowerCase()) ||
        f.answer.toLowerCase().includes(query.toLowerCase()) ||
        (f.errorCodes && f.errorCodes.some(ec => query.toUpperCase().includes(ec)))
      );

      let responseText = '';
      let groundedList: { id: string; title: string; slug: string }[] = [];

      if (query.toLowerCase().includes('ociosidade') || query.toLowerCase().includes('toast')) {
        responseText = `De acordo com a base oficial de conhecimento (Artigo KB-001):\n\n1. Para configurar o limite de ociosidade (10 min a 120 min), acesse o seletor rápido no topo da Navbar ou vá para a aba "4. Controle de Ociosidade".\n2. O agente corporativo monitora entradas de teclado e mouse e agrupa eventos em janelas de 10 minutos.\n3. Se precisar monitorar um colaborador mesmo com os alertas globais pausados, clique em "Ativar Exceção Individual" no card do funcionário.`;
        groundedList = [{ id: 'art-001', title: 'Guia Completo de Ociosidade & Alertas Toasts', slug: 'configuracao-ociosidade-alertas-toasts' }];
      } else if (query.toLowerCase().includes('bloqueio') || query.toLowerCase().includes('trava') || query.toLowerCase().includes('site')) {
        responseText = `Com base no manual de Segurança & Compliance (Artigo KB-002):\n\n1. Acesse o módulo "6. Bloqueio de Sites & PC".\n2. Clique em "+ Nova Regra de Bloqueio" para inserir domínios (ex: *tiktok.com) e vincular a departamentos.\n3. Para trava física de tela (PC Lock), defina o horário limite (ex: 18:00) e a tolerância de carência (15 min).`;
        groundedList = [{ id: 'art-002', title: 'Bloqueio de Sites & Bloqueio Físico de Estação', slug: 'bloqueio-sites-estacao-pos-expediente' }];
      } else if (query.toLowerCase().includes('totvs') || query.toLowerCase().includes('403') || query.toLowerCase().includes('ponto')) {
        responseText = `Segundo a documentação de Integrações ERP (Artigo KB-003):\n\nO erro HTTP 403 ou falha de autenticação TOTVS indica que a AppKey/Token inserida não possui permissão de leitura no Portal Protheus/RM.\n\nSolução:\n- Atualize as credenciais na aba "10. API & Integrações ERP".\n- Execute "Testar Endpoint" para confirmar o retorno HTTP 200 OK.`;
        groundedList = [{ id: 'art-003', title: 'Integração de Ponto Eletrônico ERP', slug: 'integracao-ponto-eletronico-erp' }];
      } else if (query.toLowerCase().includes('gpo') || query.toLowerCase().includes('agente') || query.toLowerCase().includes('msi')) {
        responseText = `Conforme o guia de Deployment Corporativo (Artigo KB-004):\n\n1. Baixe o pacote MSI contendo o Tenant ID na aba "11. Agente GPO & LGPD".\n2. No Active Directory, crie uma GPO no gpmc.msc e vincule em Software Installation (Assigned).\n3. O agente é instalado em segundo plano de forma silenciosa sem exigir reinicialização do usuário.`;
        groundedList = [{ id: 'art-004', title: 'Implantação em Massa do Agente Silencioso via GPO', slug: 'implantacao-agente-silencioso-gpo' }];
      } else if (matchedFaq) {
        responseText = `Encontrei uma resposta oficial no FAQ da plataforma:\n\nPergunta: "${matchedFaq.question}"\n\nResposta: ${matchedFaq.answer}`;
      } else if (matchedArticles.length > 0) {
        const primary = matchedArticles[0];
        responseText = `Encontrei informações na documentação do módulo "${primary.moduleName}":\n\n- Objetivo: ${primary.objective}\n- Fluxo Operacional: ${primary.operationalFlow}\n- Pré-requisitos: ${primary.prerequisites.join(', ')}`;
        groundedList = matchedArticles.map(a => ({ id: a.id, title: a.title, slug: a.slug }));
      } else {
        responseText = `Consultei a base oficial de conhecimento do WorkPulse. Não encontrei um artigo exato para "${query}".\n\nVocê pode procurar diretamente pelos módulos na busca inteligente acima ou verificar os manuais de Ociosidade, Bloqueios, Integrações ERP e Agente GPO.`;
        groundedList = INITIAL_KB_ARTICLES.slice(0, 2).map(a => ({ id: a.id, title: a.title, slug: a.slug }));
      }

      const aiMsg: KBAiMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: responseText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        groundedArticles: groundedList
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsThinking(false);
    }, 600);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl flex flex-col h-[650px] shadow-sm overflow-hidden font-sans">
      
      {/* AI Assistant Header */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-black text-slate-900 dark:text-white text-sm">Assistente IA da Base de Conhecimento</h3>
              <span className="text-[10px] bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded font-bold flex items-center">
                <ShieldCheck className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" /> Grounded RAG
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Respostas restritas exclusivamente à documentação oficial WorkPulse
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Base Indexada v3.0</span>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap flex items-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" /> Sugestões:
        </span>
        {suggestedPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-white transition-all whitespace-nowrap text-[11px] font-medium shadow-2xs shrink-0 cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages viewport */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed space-y-3 ${
              msg.sender === 'user'
                ? 'bg-slate-900 dark:bg-blue-600 text-white rounded-tr-none shadow-sm font-medium'
                : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm'
            }`}>
              <div className={`flex items-center justify-between text-[10px] border-b pb-1.5 mb-2 font-mono ${
                msg.sender === 'user' ? 'text-slate-400 dark:text-blue-200 border-slate-800 dark:border-blue-500/50' : 'text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800'
              }`}>
                <span className="font-bold uppercase tracking-wider flex items-center space-x-1">
                  {msg.sender === 'user' ? 'Você' : 'Assistente IA WorkPulse'}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              <div className="whitespace-pre-line font-sans leading-relaxed text-xs">
                {msg.text}
              </div>

              {/* Grounded Citations */}
              {msg.groundedArticles && msg.groundedArticles.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 font-mono flex items-center space-x-1">
                    <BookOpen className="w-3 h-3" />
                    <span>Fontes Oficiais Citadas:</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.groundedArticles.map((art) => (
                      <button
                        key={art.id}
                        onClick={() => onSelectArticle(art.id)}
                        className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        <span>{art.title}</span>
                        <ArrowUpRight className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl rounded-tl-none text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-2 shadow-sm">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
              <span>Consultando vetores e base de conhecimento...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Digite sua dúvida (ex: Como cadastrar um bloqueio? O que é erro 403?)..."
          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-medium placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputQuery.trim()}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all disabled:opacity-50 flex items-center space-x-1 shrink-0 shadow-sm cursor-pointer"
        >
          <span>Perguntar</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
