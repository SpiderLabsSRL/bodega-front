// UsersApi.ts - Mejorado

import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendUsuario {
  idusuario: number;
  nombres: string;
  apellidos: string;
  telefono: string;
  usuario: string;
  rol: "Admin" | "Asistente";
  estado: number;
  idbodega?: number;
  bodega_nombre?: string;
}

export interface Usuario {
  id: number;
  nombres: string;
  apellidos: string;
  telefono: string;
  usuario: string;
  rol: "admin" | "asistente";
  activo: boolean;
  idbodega?: number;
  bodega_nombre?: string;
}

export interface UsuarioRequest {
  nombres: string;
  apellidos: string;
  telefono: string;
  usuario: string;
  contraseña: string;
  rol: "admin" | "asistente";
  idbodega: number;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para manejar errores de forma consistente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el error tiene respuesta del backend
    if (error.response) {
      const data = error.response.data;
      let mensaje = "Error en el servidor";
      
      // Extraer mensaje del backend
      if (typeof data === 'string') {
        mensaje = data;
      } else if (data.message) {
        mensaje = data.message;
      } else if (data.error) {
        mensaje = data.error;
      } else if (data.detail) {
        mensaje = data.detail;
      }
      
      // Crear un nuevo error con el mensaje específico
      const newError = new Error(mensaje);
      // Preservar el código de estado para debugging
      (newError as any).status = error.response.status;
      throw newError;
    }
    
    // Si no hay respuesta, es un error de red
    throw new Error("Error de conexión con el servidor");
  }
);

export const getUsuarios = async (): Promise<Usuario[]> => {
  const response = await api.get<BackendUsuario[]>("/users/users");
  return response.data.map((usuario) => ({
    id: usuario.idusuario,
    nombres: usuario.nombres,
    apellidos: usuario.apellidos,
    telefono: usuario.telefono,
    usuario: usuario.usuario,
    rol: usuario.rol.toLowerCase() as "admin" | "asistente",
    activo: usuario.estado === 0,
    idbodega: usuario.idbodega,
    bodega_nombre: usuario.bodega_nombre,
  }));
};

export const createUsuario = async (usuario: UsuarioRequest): Promise<Usuario> => {
  const response = await api.post<BackendUsuario>("/users/users", {
    nombres: usuario.nombres,
    apellidos: usuario.apellidos,
    telefono: usuario.telefono,
    usuario: usuario.usuario,
    contraseña: usuario.contraseña,
    rol: usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1),
    idbodega: usuario.idbodega,
  });
  return mapBackendUsuario(response.data);
};

export const updateUsuario = async (id: number, usuario: UsuarioRequest): Promise<Usuario> => {
  const response = await api.put<BackendUsuario>(`/users/users/${id}`, {
    nombres: usuario.nombres,
    apellidos: usuario.apellidos,
    telefono: usuario.telefono,
    usuario: usuario.usuario,
    contraseña: usuario.contraseña || undefined,
    rol: usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1),
    idbodega: usuario.idbodega,
  });
  return mapBackendUsuario(response.data);
};

export const deleteUsuario = async (id: number): Promise<void> => {
  await api.delete(`/users/users/${id}`);
};

export const toggleUsuarioStatus = async (id: number): Promise<Usuario> => {
  const response = await api.patch<BackendUsuario>(`/users/users/${id}/toggle-status`);
  return mapBackendUsuario(response.data);
};

function mapBackendUsuario(usuario: BackendUsuario): Usuario {
  return {
    id: usuario.idusuario,
    nombres: usuario.nombres,
    apellidos: usuario.apellidos,
    telefono: usuario.telefono,
    usuario: usuario.usuario,
    rol: usuario.rol.toLowerCase() as "admin" | "asistente",
    activo: usuario.estado === 0,
    idbodega: usuario.idbodega,
    bodega_nombre: usuario.bodega_nombre,
  };
}