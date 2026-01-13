
export type Role = 'Admin' | 'Operador';
export type LoadType = 'CHEIA' | 'COMBINADA 2';
export type LoadStatus = 'PENDENTE' | 'CONCLUIDO';

export interface Planta {
  'NomedaUnidade': string;
  'PlantaID': string;
  'id': string;
}

export interface Caminhao {
  'Placa': string;
  'PlantaID': string;
  'CaminhaoId': string;
  'id': string;
}

export interface Motorista {
  'NomedoMotorista': string;
  'MotoristaId': string;
  'PlantaID': string;
  'id': string;
}

export interface Usuario {
  'NomeCompleto': string;
  'LoginUsuario': string;
  'SenhaUsuario': string;
  'NivelAcesso': Role;
  'PlantaID'?: string;
  'id': string;
}

export interface Carga {
  'CargaId': string;
  'PlantaID': string;
  'CaminhaoId': string;
  'MotoristaId': string;
  'TipoCarga': LoadType;
  'DataCriacao': Date;
  'DataInicio': Date;
  'KmPrevisto': number;
  'VoltaPrevista': Date;
  'StatusCarga': LoadStatus;
  
  // Finalização
  'KmReal'?: number;
  'ChegadaReal'?: Date;
  'Diff1_Gap'?: number;
  'Diff1_Justificativa'?: string;
  'Diff2_Atraso'?: number;
  'Diff2_Justificativa'?: string;
}

export interface AppState {
  plantas: Planta[];
  caminhoes: Caminhao[];
  usuarios: Usuario[];
  motoristas: Motorista[];
  cargas: Carga[];
  currentUser: Usuario | null;
}
