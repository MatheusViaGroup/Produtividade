
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Usuario, Planta, Caminhao, Motorista, Carga, LoadStatus } from './types';
import { GraphService, LISTS } from './utils/graphService';

export const useAppState = () => {
  const [state, setState] = useState<AppState>(() => {
      const savedUser = localStorage.getItem('produtividade_user');
      return {
        plantas: [],
        caminhoes: [],
        usuarios: [],
        motoristas: [],
        cargas: [],
        currentUser: savedUser ? JSON.parse(savedUser) : null,
      };
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [graph, setGraph] = useState<GraphService | null>(null);
  const [loading, setLoading] = useState(false);
  const isConnecting = useRef(false);

  const connectToSharePoint = useCallback(async () => {
    if (isConnecting.current) return;
    isConnecting.current = true;
    
    try {
      setLoading(true);
      const token = await GraphService.getAccessToken();
      const service = new GraphService(token);
      
      setIsAuthenticated(true);
      await service.resolveSites();
      setGraph(service);
      
      const [p, c, u, m, cr] = await Promise.all([
        service.getListItems(LISTS.PLANTAS),
        service.getListItems(LISTS.CAMINHOES),
        service.getListItems(LISTS.USUARIOS),
        service.getListItems(LISTS.MOTORISTAS),
        service.getListItems(LISTS.CARGAS)
      ]);

      console.log("Dados carregados do SharePoint. Normalizando...");

      setState(prev => {
          // Normalização de Usuários
          const normalizedUsers = u.map((user: any) => ({
            ...user,
            PlantaId: user.PlantaId || user.PlantaID || user.plantaId
          }));

          const updatedCurrentUser = prev.currentUser 
            ? normalizedUsers.find((user: any) => user.LoginUsuario === prev.currentUser?.LoginUsuario) || prev.currentUser
            : null;

          return {
            ...prev,
            plantas: p.map((item: any) => ({
                ...item,
                PlantaId: item.PlantaId || item.PlantaID || item.id // Algumas listas usam o ID como PlantaId
            })),
            caminhoes: c.map((item: any) => ({ 
                ...item, 
                CaminhaoId: item.id,
                PlantaId: item.PlantaId || item.PlantaID
            })),
            usuarios: normalizedUsers,
            motoristas: m.map((item: any) => ({ 
                ...item, 
                MotoristaId: item.id,
                PlantaId: item.PlantaId || item.PlantaID
            })),
            currentUser: updatedCurrentUser,
            cargas: cr.map((item: any) => {
                let status: LoadStatus = 'PENDENTE';
                const s = String(item.StatusCarga || '').toUpperCase();
                if (s === 'FINALIZADA' || s === 'CONCLUIDO') status = 'CONCLUIDO';
                
                return {
                    ...item,
                    CargaId: item.id,
                    PlantaId: item.PlantaId || item.PlantaID, // Normalização crítica para o filtro
                    StatusCarga: status,
                    DataCriacao: item.DataCriacao ? new Date(item.DataCriacao) : new Date(),
                    DataInicio: item.DataInicio ? new Date(item.DataInicio) : new Date(),
                    VoltaPrevista: item.VoltaPrevista ? new Date(item.VoltaPrevista) : new Date(),
                    ChegadaReal: item.ChegadaReal ? new Date(item.ChegadaReal) : undefined,
                };
            })
          };
      });
    } catch (error: any) {
      console.error("Falha na conexão SharePoint:", error);
      alert(`Erro de Conexão: ${error.message}`);
    } finally {
      setLoading(false);
      isConnecting.current = false;
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (await GraphService.hasActiveAccount()) {
          setIsAuthenticated(true);
          connectToSharePoint();
      }
    };
    checkAuth();
  }, [connectToSharePoint]);

  const loginLocal = (login: string, pass: string): boolean => {
      if (login === 'Matheus' && pass === 'admin321123') {
          const masterUser: Usuario = {
              id: 'master',
              NomeCompleto: 'Matheus (Master)',
              LoginUsuario: 'Matheus',
              SenhaUsuario: 'admin321123',
              NivelAcesso: 'Admin'
          };
          setCurrentUser(masterUser);
          return true;
      }

      const found = state.usuarios.find(u => 
        u.LoginUsuario?.toLowerCase() === login.toLowerCase() && 
        u.SenhaUsuario === pass
      );

      if (found) {
          setCurrentUser(found);
          return true;
      }
      return false;
  };

  const addPlanta = async (payload: any) => {
    if (!graph) return;
    try {
        const fields = { ...payload, Title: payload.NomedaUnidade };
        const response = await graph.createItem(LISTS.PLANTAS, fields);
        const newItem = { ...fields, id: response.id };
        setState(prev => ({ ...prev, plantas: [...prev.plantas, newItem] }));
        return newItem;
    } catch (error: any) {
        console.error("Erro ao criar planta:", error);
        throw error;
    }
  };

  const addUsuario = async (payload: any) => {
    if (!graph) return;
    try {
        const fields: any = {
            Title: payload.NomeCompleto,
            NomeCompleto: payload.NomeCompleto,
            LoginUsuario: payload.LoginUsuario,
            SenhaUsuario: payload.SenhaUsuario,
            NivelAcesso: payload.NivelAcesso,
            PlantaID: payload.PlantaId // Nome interno no SharePoint
        };
        const response = await graph.createItem(LISTS.USUARIOS, fields);
        const newItem = { ...payload, id: response.id };
        setState(prev => ({ ...prev, usuarios: [...prev.usuarios, newItem] }));
        return newItem;
    } catch (error: any) {
        console.error("Erro ao criar usuário:", error);
        throw error;
    }
  };

  const addCarga = async (payload: any) => {
    if (!graph) return;
    try {
        const caminhao = state.caminhoes.find(c => c.CaminhaoId === payload.CaminhaoId);
        const fields = {
            ...payload,
            PlantaID: payload.PlantaId, // Normalizando para o SharePoint
            Title: caminhao?.Placa || 'Nova Carga',
            StatusCarga: 'PENDENTE',
            DataCriacao: new Date().toISOString(),
            DataInicio: payload.DataInicio.toISOString(),
            VoltaPrevista: payload.VoltaPrevista.toISOString()
        };
        const response = await graph.createItem(LISTS.CARGAS, fields);
        const newItem = { 
            ...fields, 
            CargaId: response.id, 
            DataCriacao: new Date(), 
            StatusCarga: 'PENDENTE' as const,
            DataInicio: new Date(payload.DataInicio),
            VoltaPrevista: new Date(payload.VoltaPrevista),
            PlantaId: payload.PlantaId
        };
        setState(prev => ({ ...prev, cargas: [newItem, ...prev.cargas] }));
        return newItem;
    } catch (error: any) {
        console.error("Erro ao criar carga:", error);
        throw error;
    }
  };

  const updateCarga = async (updated: Carga) => {
    if (!graph) return;
    try {
        const sharePointFields: any = {
            CaminhaoId: updated.CaminhaoId,
            MotoristaId: updated.MotoristaId,
            TipoCarga: updated.TipoCarga,
            KmPrevisto: updated.KmPrevisto,
            DataInicio: updated.DataInicio.toISOString(),
            VoltaPrevista: updated.VoltaPrevista.toISOString(),
            StatusCarga: updated.StatusCarga,
            KmReal: updated.KmReal,
            ChegadaReal: updated.ChegadaReal?.toISOString(),
            Diff1_Gap: updated.Diff1_Gap,
            Diff1_Justificativa: updated.Diff1_Justificativa,
            Diff2_Atraso: updated.Diff2_Atraso,
            Diff2_Justificativa: updated.Diff2_Justificativa,
            PlantaID: updated.PlantaId // Manter consistência no SP
        };

        await graph.updateItem(LISTS.CARGAS, updated.CargaId, sharePointFields);
        setState(prev => ({
            ...prev,
            cargas: prev.cargas.map(c => c.CargaId === updated.CargaId ? { ...updated } : c)
        }));
    } catch (error: any) {
        console.error("Erro ao atualizar carga:", error);
        alert(`Erro ao salvar: ${error.message}`);
    }
  };

  const addCaminhao = async (payload: any) => {
    if (!graph) return;
    const fields = { ...payload, Title: payload.Placa, PlantaID: payload.PlantaId };
    const response = await graph.createItem(LISTS.CAMINHOES, fields);
    const newItem = { ...fields, id: response.id, CaminhaoId: response.id, PlantaId: payload.PlantaId };
    setState(prev => ({ ...prev, caminhoes: [...prev.caminhoes, newItem] }));
    return newItem;
  };

  const addMotorista = async (payload: any) => {
    if (!graph) return;
    const fields = { ...payload, Title: payload.NomedoMotorista, PlantaID: payload.PlantaId };
    const response = await graph.createItem(LISTS.MOTORISTAS, fields);
    const newItem = { ...fields, id: response.id, MotoristaId: response.id, PlantaId: payload.PlantaId };
    setState(prev => ({ ...prev, motoristas: [...prev.motoristas, newItem] }));
    return newItem;
  };

  const deletePlanta = async (id: string) => { if (graph) { await graph.deleteItem(LISTS.PLANTAS, id); setState(prev => ({ ...prev, plantas: prev.plantas.filter(p => p.id !== id) })); } };
  const deleteCaminhao = async (id: string) => { if (graph) { await graph.deleteItem(LISTS.CAMINHOES, id); setState(prev => ({ ...prev, caminhoes: prev.caminhoes.filter(c => c.id !== id) })); } };
  const deleteMotorista = async (id: string) => { if (graph) { await graph.deleteItem(LISTS.MOTORISTAS, id); setState(prev => ({ ...prev, motoristas: prev.motoristas.filter(m => m.id !== id) })); } };
  const deleteUsuario = async (id: string) => { if (graph) { await graph.deleteItem(LISTS.USUARIOS, id); setState(prev => ({ ...prev, usuarios: prev.usuarios.filter(u => u.id !== id) })); } };
  const deleteCarga = async (id: string) => { if (graph) { await graph.deleteItem(LISTS.CARGAS, id); setState(prev => ({ ...prev, cargas: prev.cargas.filter(c => c.CargaId !== id) })); } };

  const setCurrentUser = (u: Usuario | null) => {
      if (u) localStorage.setItem('produtividade_user', JSON.stringify(u));
      else localStorage.removeItem('produtividade_user');
      setState(prev => ({ ...prev, currentUser: u }));
  };

  const logout = () => {
      localStorage.removeItem('produtividade_user');
      setIsAuthenticated(false);
      setState({ plantas: [], caminhoes: [], usuarios: [], motoristas: [], cargas: [], currentUser: null });
      setGraph(null);
  };

  return { state, loading, isAuthenticated, loginLocal, connectToSharePoint, addPlanta, addUsuario, addCarga, addCaminhao, addMotorista, updateCarga, deletePlanta, deleteCaminhao, deleteUsuario, deleteMotorista, deleteCarga, setCurrentUser, logout };
};
