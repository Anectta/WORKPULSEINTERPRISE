import React, { useState } from 'react';
import { 
  Box, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Users, 
  ShieldCheck, 
  Search,
  Server,
  X
} from 'lucide-react';
import { ITBusinessService, ConfigurationItem } from '../../types/cmdb';

interface CmdbServicesViewProps {
  services: ITBusinessService[];
  items: ConfigurationItem[];
  onCreateService: (svc: Partial<ITBusinessService>) => void;
  onSelectCi: (ci: ConfigurationItem) => void;
}

export const CmdbServicesView: React.FC<CmdbServicesViewProps> = ({
  services,
  items,
  onCreateService,
  onSelectCi
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<ITBusinessService>>({
    name: '',
    category: 'Negócio',
    slaHours: 4,
    slaTargetPct: 99.5,
    owner: '',
    affectedUsersCount: 20,
    description: '',
    underlyingCiIds: []
  });

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.owner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    onCreateService({
      ...formData,
      code: `SVC-${Math.floor(100 + Math.random() * 900)}`,
      status: 'operacional'
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar serviço por nome ou responsável..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Serviço de Negócio</span>
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredServices.map(svc => {
          const linkedCis = items.filter(i => svc.underlyingCiIds.includes(i.id));

          return (
            <div key={svc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800 flex items-center justify-center text-purple-400 shrink-0">
                      <Box className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{svc.name}</h3>
                      <span className="font-mono text-xs text-blue-400 font-bold">{svc.code}</span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {svc.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {svc.description}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <div className="text-slate-500 text-[11px]">SLA de Reparo</div>
                    <div className="font-bold text-white mt-0.5">{svc.slaHours} Horas</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[11px]">Meta Uptime</div>
                    <div className="font-bold text-emerald-400 mt-0.5">{svc.slaTargetPct}%</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[11px]">Usuários Afetados</div>
                    <div className="font-bold text-white mt-0.5">~{svc.affectedUsersCount}</div>
                  </div>
                </div>
              </div>

              {/* Underlying CIs */}
              <div className="pt-3 border-t border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  CIs Associados ({linkedCis.length})
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {linkedCis.map(ci => (
                    <button
                      key={ci.id}
                      onClick={() => onSelectCi(ci)}
                      className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500 text-slate-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Server className="w-3 h-3 text-blue-400" />
                      <span>{ci.name}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden text-slate-200 shadow-2xl">
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Cadastrar Serviço de Negócio (ITSM)</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nome do Serviço *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Portal de Vendas Web"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Categoria</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Negócio">Negócio</option>
                    <option value="Infraestrutura">Infraestrutura</option>
                    <option value="Segurança">Segurança</option>
                    <option value="Suporte">Suporte</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">SLA Máximo (Horas)</label>
                  <input
                    type="number"
                    value={formData.slaHours || 4}
                    onChange={e => setFormData({ ...formData, slaHours: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Gestor Responsável / Owner</label>
                <input
                  type="text"
                  value={formData.owner || ''}
                  onChange={e => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="Nome do gestor ou setor"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Impacto para o negócio e finalidade deste serviço..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                >
                  Cadastrar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
