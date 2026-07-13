import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario, toggleUsuarioStatus, Usuario, UsuarioRequest } from "@/api/UsersApi";
import { getBodegasActivas } from "@/api/BodegaApi";

// Definir interfaz local para bodega
interface Bodega {
  id: number;
  nombre: string;
  tipo?: string;
  direccion?: string;
  telefono?: string;
  estado?: number;
}

export function GestionUsuariosView() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoBodegas, setCargandoBodegas] = useState(true);
  const [editandoUsuario, setEditandoUsuario] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    telefono: "",
    usuario: "",
    contraseña: "",
    rol: "" as "admin" | "asistente" | "",
    idbodega: "" as string | ""
  });
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [enviandoFormulario, setEnviandoFormulario] = useState(false);
  const [erroresFormulario, setErroresFormulario] = useState<{
    telefono?: string;
    usuario?: string;
    general?: string;
  }>({});
  const { toast } = useToast();

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      setCargandoBodegas(true);
      
      const [usuariosData, bodegasData] = await Promise.all([
        getUsuarios(),
        getBodegasActivas()
      ]);
      
      setUsuarios(usuariosData);
      setBodegas(bodegasData.map(b => ({
        id: b.idbodega,
        nombre: b.nombre,
        tipo: b.tipo,
        direccion: b.direccion,
        telefono: b.telefono,
        estado: b.estado
      })));
    } catch (error) {
      console.error("Error cargando datos iniciales:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setCargandoBodegas(false);
    }
  };

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const usuariosData = await getUsuarios();
      setUsuarios(usuariosData);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nombres: "",
      apellidos: "",
      telefono: "",
      usuario: "",
      contraseña: "",
      rol: "",
      idbodega: ""
    });
    setEditandoUsuario(null);
    setEnviandoFormulario(false);
    setErroresFormulario({});
  };

  const abrirDialogCrear = () => {
    resetForm();
    setDialogAbierto(true);
  };

  const abrirDialogEditar = (usuario: Usuario) => {
    setEditandoUsuario(usuario);
    setFormData({
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      telefono: usuario.telefono ?? '',
      usuario: usuario.usuario,
      contraseña: "",
      rol: usuario.rol,
      idbodega: usuario.idbodega ? String(usuario.idbodega) : ""
    });
    setErroresFormulario({});
    setDialogAbierto(true);
  };

  const cerrarDialog = () => {
    if (!enviandoFormulario) {
      resetForm();
      setDialogAbierto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Limpiar errores anteriores
    setErroresFormulario({});

    // Validar teléfono
    if (formData.telefono.length !== 8) {
      setErroresFormulario(prev => ({
        ...prev,
        telefono: "El teléfono debe tener exactamente 8 dígitos"
      }));
      return;
    }

    // Validar bodega
    if (!formData.idbodega) {
      toast({
        title: "Error",
        description: "Debe seleccionar una bodega",
        variant: "destructive",
      });
      return;
    }

    // Validar usuario
    if (formData.usuario.length < 3) {
      setErroresFormulario(prev => ({
        ...prev,
        usuario: "El nombre de usuario debe tener al menos 3 caracteres"
      }));
      return;
    }

    // Bloquear el botón para evitar doble clic
    setEnviandoFormulario(true);
    
    try {
      if (editandoUsuario) {
        const usuarioRequest: UsuarioRequest = {
          nombres: formData.nombres,
          apellidos: formData.apellidos,
          telefono: formData.telefono,
          usuario: formData.usuario,
          contraseña: formData.contraseña,
          rol: formData.rol as "admin" | "asistente",
          idbodega: parseInt(formData.idbodega)
        };
        await updateUsuario(editandoUsuario.id, usuarioRequest);
        toast({
          title: "Usuario actualizado",
          description: "Los datos del usuario han sido actualizados correctamente",
        });
      } else {
        const usuarioRequest: UsuarioRequest = {
          nombres: formData.nombres,
          apellidos: formData.apellidos,
          telefono: formData.telefono,
          usuario: formData.usuario,
          contraseña: formData.contraseña,
          rol: formData.rol as "admin" | "asistente",
          idbodega: parseInt(formData.idbodega)
        };
        await createUsuario(usuarioRequest);
        toast({
          title: "Usuario creado",
          description: "El nuevo usuario ha sido creado correctamente",
        });
      }
      
      resetForm();
      setDialogAbierto(false);
      await cargarUsuarios();
    } catch (error) {
      console.error("Error guardando usuario:", error);
      
      // Manejar errores específicos del backend
      let mensajeError = "Error al guardar el usuario";
      
      if (error instanceof Error) {
        const errorMessage = error.message;
        
        // Identificar errores específicos
        if (errorMessage.includes("nombre de usuario ya existe") || 
            errorMessage.includes("usuario ya existe") ||
            errorMessage.includes("Username already exists")) {
          mensajeError = "El nombre de usuario ya está en uso. Por favor, elige otro.";
          setErroresFormulario(prev => ({
            ...prev,
            usuario: "Este nombre de usuario ya está registrado"
          }));
        } else if (errorMessage.includes("teléfono") || errorMessage.includes("telefono")) {
          mensajeError = "El número de teléfono ya está registrado para otro usuario.";
          setErroresFormulario(prev => ({
            ...prev,
            telefono: "Este número de teléfono ya está registrado"
          }));
        } else if (errorMessage.includes("bodega")) {
          mensajeError = "La bodega seleccionada no existe o no está activa.";
        } else if (errorMessage.includes("contraseña") || errorMessage.includes("password")) {
          mensajeError = "La contraseña debe tener al menos 6 caracteres.";
        } else {
          mensajeError = error.message;
        }
        
        // Mostrar toast con el error específico
        toast({
          title: "Error",
          description: mensajeError,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Ocurrió un error inesperado al guardar el usuario",
          variant: "destructive",
        });
      }
    } finally {
      setEnviandoFormulario(false);
    }
  };

  const handleEliminar = async (id: number) => {
    try {
      await deleteUsuario(id);
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado correctamente",
      });
      await cargarUsuarios();
    } catch (error) {
      console.error("Error eliminando usuario:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar el usuario",
        variant: "destructive",
      });
    }
  };

  const toggleEstado = async (id: number) => {
    try {
      await toggleUsuarioStatus(id);
      toast({
        title: "Estado actualizado",
        description: "El estado del usuario ha sido actualizado",
      });
      await cargarUsuarios();
    } catch (error) {
      console.error("Error cambiando estado:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al cambiar el estado",
        variant: "destructive",
      });
    }
  };

  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 8);
    setFormData({ ...formData, telefono: value });
    // Limpiar error de teléfono cuando el usuario corrige
    if (erroresFormulario.telefono && value.length === 8) {
      setErroresFormulario(prev => ({ ...prev, telefono: undefined }));
    }
  };

  const handleUsuarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, usuario: value });
    // Limpiar error de usuario cuando el usuario corrige
    if (erroresFormulario.usuario && value.length >= 3) {
      setErroresFormulario(prev => ({ ...prev, usuario: undefined }));
    }
  };

  // Obtener el nombre de la bodega por ID
  const getBodegaNombre = (idbodega?: number) => {
    if (!idbodega) return "Sin asignar";
    const bodega = bodegas.find(b => b.id === idbodega);
    return bodega ? bodega.nombre : "Bodega no encontrada";
  };

  // Componente para asterisco rojo
  const RequiredAsterisk = () => <span className="text-red-500 ml-0.5">*</span>;

  if (loading && cargandoBodegas) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Gestión de Usuarios</h1>
        <Button onClick={abrirDialogCrear} className="w-full sm:w-auto">
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Dialog flotante para crear/editar usuario */}
      <Dialog open={dialogAbierto} onOpenChange={cerrarDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoUsuario ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
            <DialogDescription>
              {editandoUsuario 
                ? "Actualiza los datos del usuario seleccionado" 
                : "Completa los datos para crear un nuevo usuario"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombres">
                  Nombre(s) <RequiredAsterisk />
                </Label>
                <Input
                  id="nombres"
                  value={formData.nombres}
                  onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                  required
                  disabled={enviandoFormulario}
                />
              </div>
              <div>
                <Label htmlFor="apellidos">
                  Apellido(s) <RequiredAsterisk />
                </Label>
                <Input
                  id="apellidos"
                  value={formData.apellidos}
                  onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                  required
                  disabled={enviandoFormulario}
                />
              </div>
              <div>
                <Label htmlFor="telefono">
                  Teléfono (8 dígitos) <RequiredAsterisk />
                </Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={handleTelefonoChange}
                  maxLength={8}
                  pattern="[0-9]{8}"
                  className={erroresFormulario.telefono ? "border-red-500" : ""}
                  required
                  disabled={enviandoFormulario}
                />
                {erroresFormulario.telefono && (
                  <p className="text-sm text-red-500 mt-1">{erroresFormulario.telefono}</p>
                )}
                {formData.telefono.length !== 8 && formData.telefono.length > 0 && !erroresFormulario.telefono && (
                  <p className="text-sm text-yellow-600 mt-1">El teléfono debe tener 8 dígitos</p>
                )}
              </div>
              <div>
                <Label htmlFor="usuario">
                  Usuario <RequiredAsterisk />
                </Label>
                <Input
                  id="usuario"
                  value={formData.usuario}
                  onChange={handleUsuarioChange}
                  className={erroresFormulario.usuario ? "border-red-500" : ""}
                  required
                  disabled={enviandoFormulario}
                />
                {erroresFormulario.usuario && (
                  <p className="text-sm text-red-500 mt-1">{erroresFormulario.usuario}</p>
                )}
              </div>
              <div>
                <Label htmlFor="contraseña">
                  Contraseña {editandoUsuario ? "(opcional)" : <RequiredAsterisk />}
                </Label>
                <Input
                  id="contraseña"
                  type="password"
                  value={formData.contraseña}
                  onChange={(e) => setFormData({ ...formData, contraseña: e.target.value })}
                  required={!editandoUsuario}
                  placeholder={editandoUsuario ? "Dejar en blanco para mantener actual" : ""}
                  disabled={enviandoFormulario}
                />
              </div>
              <div>
                <Label htmlFor="rol">
                  Rol <RequiredAsterisk />
                </Label>
                <Select 
                  value={formData.rol} 
                  onValueChange={(value) => setFormData({ ...formData, rol: value as "admin" | "asistente" })}
                  required
                  disabled={enviandoFormulario}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="asistente">Asistente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="idbodega">
                  Bodega <RequiredAsterisk />
                </Label>
                <Select 
                  value={formData.idbodega} 
                  onValueChange={(value) => setFormData({ ...formData, idbodega: value })}
                  required
                  disabled={enviandoFormulario}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar bodega" />
                  </SelectTrigger>
                  <SelectContent>
                    {bodegas.length === 0 ? (
                      <SelectItem value="" disabled>No hay bodegas disponibles</SelectItem>
                    ) : (
                      bodegas.map((bodega) => (
                        <SelectItem key={bodega.id} value={String(bodega.id)}>
                          {bodega.nombre}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {bodegas.length === 0 && (
                  <p className="text-sm text-yellow-600 mt-1">
                    No hay bodegas activas. Crea una bodega primero.
                  </p>
                )}
              </div>
            </div>
            
            {/* Mensaje de error general */}
            {erroresFormulario.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {erroresFormulario.general}
              </div>
            )}
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={cerrarDialog}
                disabled={enviandoFormulario}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={enviandoFormulario || bodegas.length === 0}
              >
                {enviandoFormulario ? "Procesando..." : (editandoUsuario ? "Actualizar" : "Crear")} Usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios ({usuarios.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="block md:overflow-x-auto">
            <Table>
              <TableHeader className="hidden md:table-header-group">
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Bodega</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay usuarios registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  usuarios.map((usuario) => (
                    <TableRow key={usuario.id} className="md:table-row block border-b p-4 md:p-0">
                      <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0 font-medium">
                        <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">USUARIO</div>
                        <div className="text-center md:text-left font-bold text-primary">
                          {usuario.nombres} {usuario.apellidos}
                        </div>
                        <div className="md:hidden text-xs text-muted-foreground text-center">
                          @{usuario.usuario}
                        </div>
                      </TableCell>
                      <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-2 md:mb-0">
                        <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">TELÉFONO</div>
                        <div className="text-center md:text-left">{usuario.telefono || "No registrado"}</div>
                      </TableCell>
                      <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-2 md:mb-0">
                        <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">ROL</div>
                        <div className="flex justify-center md:justify-start">
                          <Badge variant={usuario.rol === "admin" ? "default" : "secondary"}>
                            {usuario.rol === "admin" ? "Admin" : "Asistente"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-2 md:mb-0">
                        <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">BODEGA</div>
                        <div className="text-center md:text-left">
                          <Badge variant="outline">
                            {getBodegaNombre(usuario.idbodega)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                        <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">ESTADO</div>
                        <div className="flex items-center justify-center md:justify-start space-x-2">
                          <Switch
                            checked={usuario.activo}
                            onCheckedChange={() => toggleEstado(usuario.id)}
                          />
                          <span className="text-sm">
                            {usuario.activo ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="md:table-cell block md:border-0 border-0 p-0">
                        <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">ACCIONES</div>
                        <div className="flex space-x-2 justify-center md:justify-start">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirDialogEditar(usuario)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará permanentemente el usuario "{usuario.nombres} {usuario.apellidos}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleEliminar(usuario.id)}>
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}