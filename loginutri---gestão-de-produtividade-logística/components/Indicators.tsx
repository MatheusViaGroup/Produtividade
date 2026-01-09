
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Planta, Motorista, Carga } from '../types';

interface IndicatorsProps {
  state: any;
}

export const Indicators: React.FC<IndicatorsProps> = ({ state }) => {
  const cargas = state.cargas || [];
  const plantas = state.plantas || [];
  const motoristas = state.motoristas || [];

  const completedCargas = useMemo(() => cargas.filter((c: Carga) => c['StatusCarga'] === 'FINALIZADA'), [cargas]);

  const statsByPlanta = useMemo(() => {
    return plantas.map((p: Planta) => {
      const pCargas = completedCargas.filter((c: Carga) => c['PlantaId'] === p['PlantaId']);
      if (pCargas.length === 0) return { name: p['NomedaUnidade'], diff1: 0, diff2: 0 };
      
      const avgDiff1 = pCargas.reduce((acc: number, cur: Carga) => acc + (cur['Diff1_Gap'] || 0), 0) / pCargas.length;
      const avgDiff2 = pCargas.reduce((acc: number, cur: Carga) => acc + (cur['Diff2.Atraso'] || 0), 0) / pCargas.length;

      return {
        name: p['NomedaUnidade'],
        diff1: Math.round(avgDiff1),
        diff2: Math.round(avgDiff2),
      };
    });
  }, [plantas, completedCargas]);

  const globalAverages = useMemo(() => {
    if (completedCargas.length === 0) return { diff1: 0, diff2: 0 };
    const avg1 = completedCargas.reduce((acc: number, cur: Carga) => acc + (cur['Diff1_Gap'] || 0), 0) / completedCargas.length;
    const avg2 = completedCargas.reduce((acc: number, cur: Carga) => acc + (cur['Diff2.Atraso'] || 0), 0) / completedCargas.length;
    return { diff1: Math.round(avg1), diff2: Math.round(avg2) };
  }, [completedCargas]);

  return (
    <div className="space-y-6 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-blue-50 shadow-sm">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Média Gap (Diff 1)</p>
          <p className="text-3xl font-black text-gray-800 mt-2">{globalAverages.diff1} <span className="text-xs font-bold text-gray-400 uppercase">min</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-blue-50 shadow-sm">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Média Atraso (Diff 2)</p>
          <p className="text-3xl font-black text-gray-800 mt-2">{globalAverages.diff2} <span className="text-xs font-bold text-gray-400 uppercase">min</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-blue-50 shadow-sm">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Cargas Realizadas</p>
          <p className="text-3xl font-black text-blue-600 mt-2">{completedCargas.length}</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-blue-50 shadow-sm">
        <h3 className="text-sm font-black text-gray-800 mb-8 uppercase tracking-widest">Atraso por Unidade</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statsByPlanta}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 700}} />
              <YAxis tick={{fontSize: 10, fontWeight: 700}} />
              <Tooltip cursor={{fill: '#eff6ff'}} />
              <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase'}} />
              <Bar name="Gap" dataKey="diff1" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar name="Atraso" dataKey="diff2" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
