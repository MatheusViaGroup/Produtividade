
import React, { useState } from 'react';
import { Planta, Caminhao, Usuario, Motorista, Role } from '../types';
import { Trash2, Search, PlusCircle } from 'lucide-react';

interface AdminProps {
  state: any;
  actions: any;
}

const inputClass = "w-full border border-blue-100 rounded-xl px-4 py-2.5 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none text-sm";
const labelClass = "block text-[10px] font-black text-blue-800/50 uppercase tracking-widest mb-1.5";
const cardClass = "bg-white p-6 rounded-3xl border border-blue-50 shadow-sm sticky top-24";

// Formulários sempre visíveis
const FormLayout: React.FC<{ title: string; children: React.ReactNode; onSubmit: (e: React.FormEvent) => void }> = ({ title, children, onSubmit }) => (
  <div className={cardClass}>
    <h4 className="font-black text-blue-900 uppercase text-xs mb-6 flex items-center gap-2">
      <PlusCircle size={16} /> Novo Cadastro: {title}
    </h4>
    <form className="space-y-4" onSubmit={onSubmit}>
      {children}
      <button className="w-full bg-blue-600 text-white font-black uppercase text-[10px] py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
        Salvar Registro
      </button>
    </form>
  </div>
);

const PlantasTab = ({ state, searchTerm }: any) => {
  const [nome, setNome] = useState('');
  const [id, setId] = useState('');
  const items = (state.plantas || []).filter((p: Planta) => p['NomedaUnidade']?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <FormLayout title="Planta" onSubmit={(e) => { e.preventDefault(); /* actions.addPlanta({ NomedaUnidade: nome, PlantaId: id }); */ setNome(''); setId(''); }}>
        <div><label className={labelClass}>Nome da Unidade</label><input required type="text" value={nome} onChange={e => setNome(e.target.value)} className={inputClass} /></div>
        <div><label className={labelClass}>Planta ID (GUID)</label><input required type="text" value={id} onChange={e => setId(e.target.value)} className={inputClass} /></div>
      </FormLayout>
      <div className="lg:col-span-2"><ListTable headers={['Unidade', 'ID']} items={items} renderRow={(p: Planta) => (
        <tr key={p.id}><td className="px-6 py-4 font-bold text-gray-800 text-sm">{p['NomedaUnidade']}</td><td className="px-6 py-4 text-xs font-mono text-gray-400">{p['PlantaId']}</td><td className="px-6 py-4 text-right"><button className="text-blue-200 hover:text-red-500 p-2"><Trash2 size={16} /></button></td></tr>
      )} /></div>
    </div>
  );
};

const CaminhoesTab = ({ state, searchTerm }: any) => {
  const [placa, setPlaca] = useState('');
  const [plantaId, setPlantaId] = useState('');
  const items = (state.caminhoes || []).filter((c: Caminhao) => c['Placa']?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <FormLayout title="Caminhão" onSubmit={(e) => { e.preventDefault(); setPlaca(''); }}>
        <div><label className={labelClass}>Placa</label><input required type="text" value={placa} onChange={e => setPlaca(e.target.value)} className={inputClass} placeholder="ABC-1234" /></div>
        <div><label className={labelClass}>Planta</label><select value={plantaId} onChange={e => setPlantaId(e.target.value)} className={inputClass} required><option value="">Selecione...</option>{state.plantas.map((p: Planta) => <option key={p['PlantaId']} value={p['PlantaId']}>{p['NomedaUnidade']}</option>)}</select></div>
      </FormLayout>
      <div className="lg:col-span-2"><ListTable headers={['Placa', 'Planta']} items={items} renderRow={(c: Caminhao) => (
        <tr key={c.id}><td className="px-6 py-4 font-bold text-gray-800 text-sm">{c['Placa']}</td><td className="px-6 py-4 text-sm">{state.plantas.find((p:any)=>p.PlantaId===c.PlantaId)?.NomedaUnidade || c.PlantaId}</td><td className="px-6 py-4 text-right"><button className="text-blue-200 hover:text-red-500 p-2"><Trash2 size={16} /></button></td></tr>
      )} /></div>
    </div>
  );
};

const MotoristasTab = ({ state, searchTerm }: any) => {
  const [nome, setNome] = useState('');
  const [plantaId, setPlantaId] = useState('');
  const items = (state.motoristas || []).filter((m: Motorista) => m['NomedoMotorista']?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <FormLayout title="Motorista" onSubmit={(e) => { e.preventDefault(); setNome(''); }}>
        <div><label className={labelClass}>Nome do Motorista</label><input required type="text" value={nome} onChange={e => setNome(e.target.value)} className={inputClass} /></div>
        <div><label className={labelClass}>Planta</label><select value={plantaId} onChange={e => setPlantaId(e.target.value)} className={inputClass} required><option value="">Selecione...</option>{state.plantas.map((p: Planta) => <option key={p['PlantaId']} value={p['PlantaId']}>{p['NomedaUnidade']}</option>)}</select></div>
      </FormLayout>
      <div className="lg:col-span-2"><ListTable headers={['Motorista', 'Planta']} items={items} renderRow={(m: Motorista) => (
        <tr key={m.id}><td className="px-6 py-4 font-bold text-gray-800 text-sm">{m['NomedoMotorista']}</td><td className="px-6 py-4 text-sm">{state.plantas.find((p:any)=>p.PlantaId===m.PlantaId)?.NomedaUnidade || m.PlantaId}</td><td className="px-6 py-4 text-right"><button className="text-blue-200 hover:text-red-500 p-2"><Trash2 size={16} /></button></td></tr>
      )} /></div>
    </div>
  );
};

const UsuariosTab = ({ state, searchTerm }: any) => {
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [role, setRole] = useState<Role>('Operador');
  const [plantId, setPlantId] = useState('');
  const items = (state.usuarios || []).filter((u: Usuario) => u['NomeCompleto']?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <FormLayout title="Usuário" onSubmit={(e) => { e.preventDefault(); setName(''); }}>
        <div><label className={labelClass}>Nome Completo</label><input required type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} /></div>
        <div><label className={labelClass}>Login</label><input required type="text" value={login} onChange={e => setLogin(e.target.value)} className={inputClass} /></div>
        <div><label className={labelClass}>Nível Acesso</label><select value={role} onChange={e => setRole(e.target.value as Role)} className={inputClass}><option value="Operador">Operador</option><option value="Admin">Admin</option></select></div>
        {role === 'Operador' && (
          <div><label className={labelClass}>Planta</label><select value={plantId} onChange={e => setPlantId(e.target.value)} className={inputClass} required><option value="">Selecione...</option>{state.plantas.map((p: Planta) => <option key={p['PlantaId']} value={p['PlantaId']}>{p['NomedaUnidade']}</option>)}</select></div>
        )}
      </FormLayout>
      <div className="lg:col-span-2"><ListTable headers={['Usuário', 'Nível']} items={items} renderRow={(u: Usuario) => (
        <tr key={u.id}><td className="px-6 py-4"><div><div className="font-bold text-gray-800 text-sm">{u['NomeCompleto']}</div><div className="text-[9px] text-blue-600/50 font-black uppercase">{u['LoginUsuario']}</div></div></td><td className="px-6 py-4"><span className="px-2 py-1 bg-blue-50 rounded text-[9px] font-black uppercase text-blue-600">{u['NivelAcesso']}</span></td><td className="px-6 py-4 text-right"><button className="text-blue-200 hover:text-red-500 p-2"><Trash2 size={16} /></button></td></tr>
      )} /></div>
    </div>
  );
};

const ListTable: React.FC<{ headers: string[], items: any[], renderRow: (item: any) => React.ReactNode }> = ({ headers, items, renderRow }) => (
  <div className="bg-white border border-blue-50 rounded-3xl overflow-hidden shadow-sm">
    <table className="w-full text-left">
      <thead className="bg-blue-50/30 border-b border-blue-50">
        <tr>
          {headers.map(h => <th key={h} className="px-6 py-4 text-[10px] font-black text-blue-800/60 uppercase">{h}</th>)}
          <th className="px-6 py-4 text-[10px] font-black text-blue-800/60 uppercase text-right">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-blue-50">
        {items.length === 0 ? (
          <tr><td colSpan={headers.length + 1} className="px-6 py-12 text-center text-gray-400 text-xs italic">Nenhum registro encontrado.</td></tr>
        ) : items.map(renderRow)}
      </tbody>
    </table>
  </div>
);

export const Admin: React.FC<AdminProps> = ({ state, actions }) => {
  const [activeSubTab, setActiveSubTab] = useState<'plantas' | 'caminhoes' | 'usuarios' | 'motoristas'>('usuarios');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-blue-50 min-h-[600px]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
         <h2 className="text-3xl font-black text-blue-950 uppercase italic">Gestão SP</h2>
         <div className="flex bg-blue-50/50 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto no-scrollbar">
            {['plantas', 'caminhoes', 'usuarios', 'motoristas'].map((t: any) => (
               <button key={t} onClick={() => setActiveSubTab(t)} className={`flex-1 sm:flex-none px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeSubTab === t ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-800/40'}`}>{t}</button>
            ))}
         </div>
      </div>
      <div className="relative mb-8">
         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" size={20} />
         <input type="text" placeholder={`Filtrar ${activeSubTab}...`} className="w-full pl-12 pr-6 py-4 border border-blue-50 rounded-2xl bg-blue-50/20 focus:bg-white outline-none font-bold text-gray-700 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>
      
      {activeSubTab === 'usuarios' && <UsuariosTab state={state} searchTerm={searchTerm} />}
      {activeSubTab === 'plantas' && <PlantasTab state={state} searchTerm={searchTerm} />}
      {activeSubTab === 'caminhoes' && <CaminhoesTab state={state} searchTerm={searchTerm} />}
      {activeSubTab === 'motoristas' && <MotoristasTab state={state} searchTerm={searchTerm} />}
    </div>
  );
};
