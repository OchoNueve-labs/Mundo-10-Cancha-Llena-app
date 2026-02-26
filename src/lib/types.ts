export interface Slot {
  id: string;
  centro: "Lo Prado" | "Quilicura";
  tipo_cancha: "Futbolito" | "Padel";
  cancha: string;
  fecha: string;
  hora: string;
  duracion: number;
  estado: "disponible" | "reservado" | "bloqueado";
  reserva_id: string | null;
  origen: "bot" | "easycancha" | "telefono" | "presencial" | "dashboard" | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_rut: string | null;
  cliente_email: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reserva {
  id: number;
  cliente_id: string | null;
  centro: string;
  tipo_cancha: string;
  cancha: string;
  fecha: string;
  hora: string;
  nombre_cliente: string | null;
  telefono_cliente: string | null;
  rut_cliente: string | null;
  email_cliente: string | null;
  estado: "pendiente" | "confirmada" | "cancelada" | "completada" | "no_show";
  canal_origen: "bot" | "easycancha" | "telefono" | "presencial" | "dashboard" | null;
  codigo_easycancha: string | null;
  origen: string;
  duracion: number | null;
  notas: string | null;
  created_at: string;
}

export interface Cliente {
  id: string;
  sender_id: string;
  nombre: string | null;
  telefono: string | null;
  rut: string | null;
  email: string | null;
  canal: "whatsapp" | "messenger" | "instagram" | null;
  created_at: string;
  updated_at: string;
}

export interface Mensaje {
  id: number;
  sender_id: string;
  canal: string | null;
  direccion: "inbound" | "outbound";
  contenido: string | null;
  message_id: string | null;
  created_at: string;
}

export interface MensajeRaw {
  id: string;
  sender_id: string;
  canal: string | null;
  mensaje: string | null;
  message_id: string | null;
  sender_name: string | null;
  created_at: string;
}

export interface Alerta {
  id: number;
  tipo: "reserva" | "easycancha_sync" | "easycancha_manual" | "easycancha_error" | "escalamiento" | "error";
  reserva_id: number | null;
  mensaje: string | null;
  canal: string | null;
  sender_id: string | null;
  leida: boolean;
  resuelta: boolean;
  created_at: string;
}

export interface Session {
  id: number;
  sender_id: string;
  estado: "activo" | "inactivo" | "escalado";
  last_activity: string;
}

export interface OcupacionCentro {
  centro: string;
  reservados: number;
  disponibles: number;
  total: number;
  porcentaje: number;
}

export interface ReservasPorDia {
  fecha: string;
  centro: string;
  total: number;
}

export interface HorarioMuerto {
  hora: string;
  libres: number;
  total: number;
}
