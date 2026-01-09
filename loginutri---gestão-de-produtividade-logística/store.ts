
import { useState, useEffect, useCallback } from 'react';
import { AppState, Usuario, Planta, Caminhao, Motorista, Carga } from './types';
import { GraphService, LISTS } from './utils/graphService';

export const useAppState = () => {
  const [state, setState] = useState<AppState>({
    plantas: [],
    caminhoes: [],
    usuarios: [],
    motoristas: [],
    cargas: [],
    currentUser: null,
  });
  const [graph, setGraph] = useState<GraphService | null>(null);
  const [loading, setLoading] = useState(false);

  const connectToSharePoint = async () => {
    try {
      setLoading(true);
      const token = await GraphService.getAccessToken();
      const service = new GraphService(token);
      setGraph(service);
      
      const [p, c, u, m, cr] = await Promise.all([
        service.getListItems(LISTS.PLANTAS),
        service.getListItems(LISTS.CAMINHOES),
        service.getListItems(LISTS.USUARIOS),
        service.getListItems(LISTS.MOTORISTAS),
        service.getListItems(LISTS.CARGAS),
      ]);

      setState(prev => ({
        ...prev,
        plantas: p,
        caminhoes: c,
        usuarios: u,
        motoristas: m,
        cargas: cr.map((item: any) => ({
            ...item,
            CargaId: item.id,
            DataCriacao: new Date(item.DataCriacao),
            DataInicio: new Date(item.DataInicio),
            VoltaPrevista: new Date(item.VoltaPrevista),
            ChegadaReal: item.ChegadaReal ? new Date(item.ChegadaReal) : undefined
        }))
      }));
    } catch (error) {
      console.error("Erro SharePoint:", error);
      alert("Falha na conexão SharePoint. Verifique as permissões do Azure.");
    } finally {
      setLoading(false);
    }
  };

  const addCarga = async (payload: any) => {
    if (!graph) return;
    const response = await graph.createItem(LISTS.CARGAS, {
        ...payload,
        StatusCarga: 'ATIVA',
        DataCriacao: new Date().toISOString(),
        DataInicio: payload.DataInicio.toISOString(),
        VoltaPrevista: payload.VoltaPrevista.toISOString()
    });
    const newItem = { ...payload, CargaId: response.id, DataCriacao: new Date(), StatusCarga: 'ATIVA' };
    setState(prev => ({ ...prev, cargas: [newItem, ...prev.cargas] }));
  };

  const updateCarga = async (updated: Carga) => {
    if (!graph) return;
    await graph.updateItem(LISTS.CARGAS, updated['CargaId'], {
        KmReal: updated['KmReal'],
        ChegadaReal: updated['ChegadaReal']?.toISOString(),
        StatusCarga: 'FINALIZADA',
        Diff1_Gap: updated['Diff1_Gap'],
        Diff1_Jusitificativa: updated['Diff1_Jusitificativa'],
        "Diff2.Atraso": updated['Diff2.Atraso'],
        "Diff2.Justificativa": updated['Diff2.Justificativa']
    });
    setState(prev => ({
        ...prev,
        cargas: prev.cargas.map(c => c['CargaId'] === updated['CargaId'] ? updated : c)
    }));
  };

  const setCurrentUser = (u: Usuario | null) => setState(prev => ({ ...prev, currentUser: u }));
  const logout = () => {
      setState(prev => ({ ...prev, currentUser: null }));
      setGraph(null);
  };

  return { state, loading, connectToSharePoint, addCarga, updateCarga, setCurrentUser, logout };
};
