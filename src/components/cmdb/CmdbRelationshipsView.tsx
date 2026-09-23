import React, { useState } from 'react';
import { 
  Share2, 
  Plus, 
  Trash2, 
  Search, 
  ArrowRight, 
  Network, 
  Layers, 
  ShieldAlert,
  CheckCircle2,
  X
} from 'lucide-react';
import { ConfigurationItem, CIRelationship } from '../../types/cmdb';

interface CmdbRelationshipsViewProps {
  items: ConfigurationItem[];
  relationships: CIRelationship[];
  onCreateRelationship: (rel: Partial<CIRelationship>) => void;
  onDeleteRelationship: (id: string) => void;
  onSelectCi: (ci: ConfigurationItem) => void;
}

export const CmdbRelationshipsView: React.FC<CmdbRelationshipsViewProps> = ({
  items,
  relationships,
  onCreateRelationship,
  onDeleteRelationship,
  onSelectCi
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New relationship state
  const [sourceCiId, setSourceCiId] = useState(items[0]?.id || '');
  const [targetCiId, setTargetCiId] = useState(items[1]?.id || '');
  const [relType, setRelType] = useState<CIRelationship['type']>('CONECTADO_A');
  const [criticality, setCriticality] = useState<CIRelationship['criticality']>('alta');
  const [description, setDescription] = useState('');

  const filteredRels = relationships.filter(rel => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || (
      rel.sourceCiName.toLowerCase().includes(q) ||
      rel.targetCiName.toLowerCase().includes(q) ||
      rel.type.toLowerCase().includes(q) ||
      rel.description.toLowerCase().includes(q)
    );
    const matchesType = selectedType === 'todos' || rel.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceCiId === targetCiId) {
      alert('O CI de origem não pode ser o mesmo do CI de destino.');
      return;
    }

    const source = items.find(i => i.id === sourceCiId);
    const target = items.find(i => i.id === targetCiId);
    if (!source || !target) return;

    onCreateRelationship({
      sourceCiId: source.id,
      sourceCiName: source.name,
      sourceCiCode: source.code,
      targetCiId: target.id,
      targetCiName: target.name,
      targetCiCode: target.code,
      type: relType,
      criticality,
      description: description || `Conexão [${relType}] entre ${source.name} e ${target.name}`
    });

    setDescription('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      
      {/* Action and Search bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por equipamento ou tipo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="todos">Todos os Tipos de Ligação</option>
            <option value="CONECTADO_A">CONECTADO_A</option>
            <option value="DEPENDE_DE">DEPENDE_DE</option>
            <option value="HOSPEDA">HOSPEDA</option>
            <option value="EXECUTA_EM">EXECUTA_EM</option>
            <option value="FORNECE">FORNECE</option>
            <option value="UTILIZA">UTILIZA</option>
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Relacionamento</span>
          </button>
        </div>

      </div>

      {/* Relationships List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-800/80">
          {filteredRels.length > 0 ? (
            filteredRels.map(rel => {
              const sourceItem = items.find(i => i.id === rel.sourceCiId);
              const targetItem = items.find(i => i.id === rel.targetCiId);

              return (
                <div key={rel.id} className="p-4 hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  
                  {/* Visual Connection nodes */}
                  <div className="flex items-center gap-3 flex-wrap">
                    
                    {/* Source CI */}
                    <button
                      onClick={() => sourceItem && onSelectCi(sourceItem)}
                      className="text-left bg-slate-950 hover:bg-slate-800 p-2.5 rounded-xl border border-slate-800 hover:border-blue-500 transition-all cursor-pointer min-w-[170px]"
                    >
                      <div className="font-bold text-white text-xs truncate">{rel.sourceCiName}</div>
                      <div className="font-mono text-[10px] text-blue-400">{rel.sourceCiCode}</div>
                    </button>

                    {/* Relationship Arrow & Badge */}
                    <div className="flex flex-col items-center px-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                        {rel.type.replace(/_/g, ' ')}
                      </span>
                      <ArrowRight className="w-4 h-4 text-blue-400 mt-1" />
                    </div>

                    {/* Target CI */}
                    <button
                      onClick={() => targetItem && onSelectCi(targetItem)}
                      className="text-left bg-slate-950 hover:bg-slate-800 p-2.5 rounded-xl border border-slate-800 hover:border-blue-500 transition-all cursor-pointer min-w-[170px]"
                    >
                      <div className="font-bold text-white text-xs truncate">{rel.targetCiName}</div>
                      <div className="font-mono text-[10px] text-blue-400">{rel.targetCiCode}</div>
                    </button>

                  </div>

                  {/* Description & Criticality */}
                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-xs text-slate-400 max-w-sm truncate">
                      {rel.description}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        rel.criticality === 'critica' ? 'bg-red-950 text-red-400 border-red-800' :
                        rel.criticality === 'alta' ? 'bg-orange-950 text-orange-400 border-orange-800' :
                        'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {rel.criticality}
                      </span>

                      <button
                        onClick={() => {
                          if (window.confirm(`Excluir ligação entre ${rel.sourceCiName} e ${rel.targetCiName}?`)) {
                            onDeleteRelationship(rel.id);
                          }
                        }}
                        className="p-1.5 hover:bg-red-950/60 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Remover ligação"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Nenhum relacionamento encontrado.
            </div>
          )}
        </div>
      </div>

      {/* CREATE RELATIONSHIP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden text-slate-200 shadow-2xl">
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Criar Novo Relacionamento na CMDB</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">CI de Origem (Upstream)</label>
                <select
                  value={sourceCiId}
                  onChange={e => setSourceCiId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code}) - {item.typeName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tipo de Relacionamento</label>
                <select
                  value={relType}
                  onChange={e => setRelType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="CONECTADO_A">CONECTADO_A (Cabo de rede / link físico)</option>
                  <option value="DEPENDE_DE">DEPENDE_DE (Dependência lógica de serviço)</option>
                  <option value="HOSPEDA">HOSPEDA (Virtualização / VMs / Containers)</option>
                  <option value="EXECUTA_EM">EXECUTA_EM (Aplicação rodando em servidor)</option>
                  <option value="FORNECE">FORNECE (Fornecimento de link ou recurso)</option>
                  <option value="UTILIZA">UTILIZA (Consumo de API ou banco de dados)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">CI de Destino (Downstream)</label>
                <select
                  value={targetCiId}
                  onChange={e => setTargetCiId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code}) - {item.typeName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Criticidade do Enlace</label>
                <select
                  value={criticality}
                  onChange={e => setCriticality(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Descrição / Justificativa</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ex: Conexão redundante 10Gbps com agregação de link LACP."
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
                  Vincular Relacionamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
