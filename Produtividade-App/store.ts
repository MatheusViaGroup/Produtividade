
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

  // Normalização técnica para garantir que IDs sejam Strings limpas
  const normalizeId = (id: any): string => {
    if (id === null || id === undefined) return '';
    return String(id).trim();
  };

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

      console.log("Sincronizando com SharePoint: Aplicando mapeamento PlantaID...");

      setState(prev => {
          // Normalização de Plantas - Chave: PlantaID
          const normalizedPlantas = p.map((item: any) => ({
              ...item,
              id: normalizeId(item.id),
              PlantaId: normalizeId(item.PlantaID || item.PlantaId || item.id)
          }));

          // Normalização de Caminhões - Chave: PlantaID
          const normalizedCaminhoes = c.map((item: any) => ({ 
              ...item, 
              id: normalizeId(item.id),
              CaminhaoId: normalizeId(item.id),
              PlantaId: normalizeId(item.PlantaID || item.PlantaId)
          }));

          // Normalização de Motoristas - Chave: PlantaID
          const normalizedMotoristas = m.map((item: any) => ({ 
              ...item, 
              id: normalizeId(item.id),
              MotoristaId: normalizeId(item.id),
              PlantaId: normalizeId(item.PlantaID || item.PlantaId)
          }));

          // Normalização de Usuários - Chave: PlantaID
          const normalizedUsers = u.map((user: any) => ({
            ...user,
            id: normalizeId(user.id),
            PlantaId: normalizeId(user.PlantaID || user.PlantaId || user.plantaId)
          }));

          const updatedCurrentUser = prev.currentUser 
            ? normalizedUsers.find((user: any) => normalizeId(user.LoginUsuario) === normalizeId(prev.currentUser?.LoginUsuario)) || prev.currentUser
            : null;

          // Normalização de Cargas - Chaves: PlantaID, CaminhaoId, MotoristaId
          const normalizedCargas = cr.map((item: any) => {
              let status: LoadStatus = 'PENDENTE';
              const s = String(item.StatusCarga || '').toUpperCase();
              if (s === 'FINALIZADA' || s === 'CONCLUIDO') status = 'CONCLUIDO';
              
              return {
                  ...item,
                  CargaId: normalizeId(item.id),
                  PlantaId: normalizeId(item.PlantaID || item.PlantaId),
                  CaminhaoId: normalizeId(item.CaminhaoId || item.CaminhaoID),
                  MotoristaId: normalizeId(item.MotoristaId || item.MotoristaID),
                  StatusCarga: status,
                  DataCriacao: item.DataCriacao ? new Date(item.DataCriacao) : new Date(),
                  DataInicio: item.DataInicio ? new Date(item.DataInicio) : new Date(),
                  VoltaPrevista: item.VoltaPrevista ? new Date(item.VoltaPrevista) : new Date(),
                  ChegadaReal: item.ChegadaReal ? new Date(item.ChegadaReal) : undefined,
              };
          });

          return {
            ...prev,
            plantas: normalizedPlantas,
            caminhoes: normalizedCaminhoes,
            usuarios: normalizedUsers,
            motoristas: normalizedMotoristas,
            currentUser: updatedCurrentUser,
            cargas: normalizedCargas
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
      // Login Mestre para Desenvolvimento
      if (normalizeId(login).toLowerCase() === 'matheus' && pass === 'admin321123') {
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
        normalizeId(u.LoginUsuario).toLowerCase() === normalizeId(login).toLowerCase() && 
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
        const fields = { 
            Title: payload.NomedaUnidade,
            NomedaUnidade: payload.NomedaUnidade,
            PlantaID: normalizeId(payload.PlantaId) 
        };
        const response = await graph.createItem(LISTS.PLANTAS, fields);
        const newItem = { ...fields, id: normalizeId(response.id), PlantaId: normalizeId(payload.PlantaId) };
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
            PlantaID: normalizeId(payload.PlantaId)
        };
        const response = await graph.createItem(LISTS.USUARIOS, fields);
        const newItem = { ...payload, id: normalizeId(response.id), PlantaId: normalizeId(payload.PlantaId) };
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
        const caminhaoIdNorm = normalizeId(payload.CaminhaoId);
        const caminhao = state.caminhoes.find(c => normalizeId(c.CaminhaoId) === caminhaoIdNorm);
        
        // Padronização POST conforme especificação: Title(Placa), PlantaID, CaminhaoId, MotoristaId, TipoCarga, StatusCarga
        const fields = {
            Title: caminhao?.Placa || 'Nova Carga',
            PlantaID: normalizeId(payload.PlantaId),
            CaminhaoId: normalizeId(payload.CaminhaoId),
            MotoristaId: normalizeId(payload.MotoristaId),
            TipoCarga: payload.TipoCarga,
            KmPrevisto: payload.KmPrevisto,
            StatusCarga: 'PENDENTE',
            DataCriacao: new Date().toISOString(),
            DataInicio: payload.DataInicio.toISOString(),
            VoltaPrevista: payload.VoltaPrevista.toISOString()
        };
        
        const response = await graph.createItem(LISTS.CARGAS, fields);
        
        const newItem = { 
            ...fields, 
            CargaId: normalizeId(response.id), 
            DataCriacao: new Date(), 
            StatusCarga: 'PENDENTE' as const,
            DataInicio: new Date(payload.DataInicio),
            VoltaPrevista: new Date(payload.VoltaPrevista),
            PlantaId: normalizeId(payload.PlantaId),
            CaminhaoId: normalizeId(payload.CaminhaoId),
            MotoristaId: normalizeId(payload.MotoristaId)
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
        // PATCH incluindo obrigatoriamente PlantaID para manter vínculo
        const sharePointFields: any = {
            CaminhaoId: normalizeId(updated.CaminhaoId),
            MotoristaId: normalizeId(updated.MotoristaId),
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
            PlantaID: normalizeId(updated.PlantaId)
        };

        await graph.updateItem(LISTS.CARGAS, updated.CargaId, sharePointFields);
        
        setState(prev => ({
            ...prev,
            cargas: prev.cargas.map(c => normalizeId(c.CargaId) === normalizeId(updated.CargaId) ? { ...updated } : c)
        }));
    } catch (error: any) {
        console.error("Erro ao atualizar carga:", error);
        alert(`Erro ao salvar no SharePoint: ${error.message}`);
    }
  };

  const addCaminhao = async (payload: any) => {
    if (!graph) return;
    const fields = { 
        Title: payload.Placa,
        Placa: payload.Placa, 
        PlantaID: normalizeId(payload.PlantaId) 
    };
    const response = await graph.createItem(LISTS.CAMINHOES, fields);
    const newItem = { 
        ...fields, 
        id: normalizeId(response.id), 
        CaminhaoId: normalizeId(response.id), 
        PlantaId: normalizeId(payload.PlantaId) 
    };
    setState(prev => ({ ...prev, caminhoes: [...prev.caminhoes, newItem] }));
    return newItem;
  };

  const addMotorista = async (payload: any) => {
    if (!graph) return;
    const fields = { 
        Title: payload.NomedoMotorista,
        NomedoMotorista: payload.NomedoMotorista, 
        PlantaID: normalizeId(payload.PlantaId) 
    };
    const response = await graph.createItem(LISTS.MOTORISTAS, fields);
    const newItem = { 
        ...fields, 
        id: normalizeId(response.id), 
        MotoristaId: normalizeId(response.id), 
        PlantaId: normalizeId(payload.PlantaId) 
    };
    setState(prev => ({ ...prev, motoristas: [...prev.motoristas, newItem] }));
    return newItem;
  };

  const deletePlanta = async (id: string) => { if (graph) { await graph.deleteItem(LISTS.PLANTAS, id); setState(prev => ({ ...prev, plantas: prev.plantas.filter(p => normalizeId(p.id) !== normalizeId(id)) })); } };
  const deleteCaminhao = async (id: string) => { if (graph) { await graph.deleteItem(LISTS.CAMINHOES, id); setState(prev => ({ ...prev, caminhoes: prev.caminhoes.filter(c => normalizeId(c.id) !== normalizeId(id)) })); } };
  const deleteMotorista = async (id: string) => { if (graph) { await graph.deleteItem(LISTS.MOTORISTAS, id); setState(prev => ({ ...prev, motoristas: prev.motoristas.filter(m => normalizeId(m.id) !== normalizeId(id)) })); } };
  const deleteUsuario = async (id: string) => { if (graph) { await graph.deleteItem(LISTS.USUARIOS, id); setState(prev => ({ ...prev, usuarios: prev.usuarios.filter(u => normalizeId(u.id) !== normalizeId(id)) })); } };
  const deleteCarga = async (id: string) => { if (graph) { await graph.deleteItem(LISTS.CARGAS, id); setState(prev => ({ ...prev, cargas: prev.cargas.filter(c => normalizeId(c.CargaId) !== normalizeId(id)) })); } };

  const setCurrentUser = (u: Usuario | null) => {
      if (u) {
          const userWithNormId = { ...u, PlantaId: normalizeId(u.PlantaId) };
          localStorage.setItem('produtividade_user', JSON.stringify(userWithNormId));
          setState(prev => ({ ...prev, currentUser: userWithNormId }));
      } else {
          localStorage.removeItem('produtividade_user');
          setState(prev => ({ ...prev, currentUser: null }));
      }
  };

  const logout = () => {
      localStorage.removeItem('produtividade_user');
      setIsAuthenticated(false);
      setState({ plantas: [], caminhoes: [], usuarios: [], motoristas: [], cargas: [], currentUser: null });
      setGraph(null);
  };

  return { state, loading, isAuthenticated, loginLocal, connectToSharePoint, addPlanta, addUsuario, addCarga, addCaminhao, addMotorista, updateCarga, deletePlanta, deleteCaminhao, deleteUsuario, deleteMotorista, deleteCarga, setCurrentUser, logout };
};
