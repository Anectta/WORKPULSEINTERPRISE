import { SupplierItem, CustomCategoryItem, CustomStatusItem, EnvironmentRoomItem } from '../types';

export const INITIAL_SUPPLIERS: SupplierItem[] = [
  {
    id: 'sup-1',
    name: 'Dell Computers Brasil Ltda',
    cnpj: '72.381.189/0001-10',
    contactName: 'Carlos Silveira',
    email: 'vendas.corporativas@dell.com',
    phone: '(11) 4004-0100',
    category: 'Hardware & Servidores',
    rating: 5
  },
  {
    id: 'sup-2',
    name: 'Cisco Systems do Brasil',
    cnpj: '01.077.925/0001-44',
    contactName: 'Fernanda Lima',
    email: 'partners@cisco.com.br',
    phone: '(11) 5508-6000',
    category: 'Redes & Switches',
    rating: 5
  },
  {
    id: 'sup-3',
    name: 'Fortinet Latam Security',
    cnpj: '07.618.349/0001-71',
    contactName: 'Eduardo Martins',
    email: 'contato@fortinet.com',
    phone: '(11) 3529-2000',
    category: 'Segurança & Firewalls',
    rating: 5
  },
  {
    id: 'sup-4',
    name: 'HPE Aruba Brasil',
    cnpj: '61.412.110/0001-55',
    contactName: 'Juliana Costa',
    email: 'suporte@hpe.com',
    phone: '(11) 3741-8000',
    category: 'Wi-Fi & Roteamento',
    rating: 4
  },
  {
    id: 'sup-5',
    name: 'Lenovo Brasil Store',
    cnpj: '03.776.284/0001-73',
    contactName: 'Lucas Albuquerque',
    email: 'empresas@lenovo.com',
    phone: '(11) 4373-0000',
    category: 'Notebooks & Desktops',
    rating: 4
  },
  {
    id: 'sup-6',
    name: 'Schneider Electric Brasil (APC)',
    cnpj: '58.828.609/0001-82',
    contactName: 'Marcio Toledo',
    email: 'apc.suporte@se.com',
    phone: '(11) 2165-5000',
    category: 'Nobreaks & Energia',
    rating: 5
  },
  {
    id: 'sup-7',
    name: 'HP Inc Brasil',
    cnpj: '22.385.228/0001-38',
    contactName: 'Patrícia Prado',
    email: 'corporativo@hp.com.br',
    phone: '(11) 3747-7700',
    category: 'Impressoras & Suprimentos',
    rating: 4
  },
  {
    id: 'sup-8',
    name: 'Microsoft Brasil Software',
    cnpj: '60.316.817/0001-03',
    contactName: 'Licenciamento Enterprise',
    email: 'mslicencas@microsoft.com',
    phone: '(11) 5504-2155',
    category: 'Licenças de Software & Cloud',
    rating: 5
  }
];

export const INITIAL_ROOMS_ITAM: EnvironmentRoomItem[] = [
  {
    id: 'room_dc',
    name: 'Data Center / Servidores',
    quadrantCode: 'Q1',
    floor: '1º Andar',
    building: 'Bloco A (Matriz)',
    category: 'datacenter',
    notes: 'Sala com controle de temperatura, UPS redundante e piso elevado.'
  },
  {
    id: 'room_office',
    name: 'Escritório Principal (Open Space)',
    quadrantCode: 'Q2',
    floor: '1º Andar',
    building: 'Bloco A (Matriz)',
    category: 'office',
    notes: 'Mesas operacionais de desenvolvimento, produto e suporte.'
  },
  {
    id: 'room_meeting',
    name: 'Sala de Reunião & Diretoria',
    quadrantCode: 'Q3',
    floor: '2º Andar',
    building: 'Bloco A (Matriz)',
    category: 'meeting',
    notes: 'Sistema de videoconferência 4K e Smart TV corporativa.'
  },
  {
    id: 'room_noc',
    name: 'NOC / Centro de Operações de Rede',
    quadrantCode: 'Q4',
    floor: '1º Andar',
    building: 'Bloco A (Matriz)',
    category: 'support',
    notes: 'Monitores de telemetria, consoles de switch e estações de plantão.'
  },
  {
    id: 'room_reception',
    name: 'Recepção & Hall de Entrada',
    quadrantCode: 'Q5',
    floor: 'Térreo',
    building: 'Bloco A (Matriz)',
    category: 'reception',
    notes: 'Totem de autoatendimento e catracas biométricas.'
  },
  {
    id: 'room_stock',
    name: 'Almoxarifado & Estoque de TI',
    quadrantCode: 'Q6',
    floor: 'Subsolo',
    building: 'Bloco A (Matriz)',
    category: 'other',
    notes: 'Peças sobressalentes, cabos, bobinas e equipamentos reservas.'
  }
];

export const INITIAL_CATEGORIES: CustomCategoryItem[] = [
  { id: 'cat-1', code: 'hardware_server', name: 'Servidor', iconName: 'Server', color: 'purple', lifespanMonthsDefault: 60 },
  { id: 'cat-2', code: 'hardware_network', name: 'Rede & Switch', iconName: 'Network', color: 'blue', lifespanMonthsDefault: 60 },
  { id: 'cat-3', code: 'hardware_workstation', name: 'Estação / PC / Notebook', iconName: 'Cpu', color: 'indigo', lifespanMonthsDefault: 36 },
  { id: 'cat-4', code: 'hardware_monitor', name: 'Monitor & Display', iconName: 'Monitor', color: 'cyan', lifespanMonthsDefault: 36 },
  { id: 'cat-5', code: 'hardware_peripheral', name: 'Periférico', iconName: 'Box', color: 'slate', lifespanMonthsDefault: 24 },
  { id: 'cat-6', code: 'hardware_printer', name: 'Impressora & Multifuncional', iconName: 'Printer', color: 'emerald', lifespanMonthsDefault: 36 },
  { id: 'cat-7', code: 'software_license', name: 'Licença Software / SaaS', iconName: 'FileText', color: 'amber', lifespanMonthsDefault: 12 },
  { id: 'cat-8', code: 'mobile_tablet', name: 'Mobile / Tablet / Smartphone', iconName: 'Wifi', color: 'teal', lifespanMonthsDefault: 24 },
  { id: 'cat-9', code: 'rack_ups', name: 'Nobreak, PDU & Rack', iconName: 'HardDrive', color: 'rose', lifespanMonthsDefault: 60 },
  { id: 'cat-10', code: 'other', name: 'Outros Equipamentos', iconName: 'Box', color: 'gray', lifespanMonthsDefault: 36 }
];

export const INITIAL_STATUSES: CustomStatusItem[] = [
  { id: 'st-1', code: 'em_uso', label: 'Em Uso', colorBg: 'bg-emerald-100 dark:bg-emerald-950/80', colorText: 'text-emerald-700 dark:text-emerald-300', description: 'Ativo instalado e em operação produtiva' },
  { id: 'st-2', code: 'em_estoque', label: 'Em Estoque / Disponível', colorBg: 'bg-blue-100 dark:bg-blue-950/80', colorText: 'text-blue-700 dark:text-blue-300', description: 'Disponível no almoxarifado para alocação' },
  { id: 'st-3', code: 'em_manutencao', label: 'Em Manutenção / Assistência', colorBg: 'bg-amber-100 dark:bg-amber-950/80', colorText: 'text-amber-700 dark:text-amber-300', description: 'Em conserto interno ou na assistência autorizada' },
  { id: 'st-4', code: 'reservado', label: 'Reservado para Novo Colaborador', colorBg: 'bg-purple-100 dark:bg-purple-950/80', colorText: 'text-purple-700 dark:text-purple-300', description: 'Separado para admissão ou projeto específico' },
  { id: 'st-5', code: 'descartado', label: 'Descartado / Baixado no Patrimônio', colorBg: 'bg-slate-100 dark:bg-slate-800', colorText: 'text-slate-500 dark:text-slate-400', description: 'Equipamento obsoleto, doado ou sucateado' }
];
