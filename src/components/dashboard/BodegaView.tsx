// src/components/dashboard/BodegaView.tsx
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Edit,
  Package,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowRight,
  Warehouse,
  Filter,
  Building2,
  MapPin,
  Store,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormularioProductos } from "./FormularioProductos";
import {
  getUbicaciones,
  getCategorias,
  getBodegasActivas,
  getTodasBodegas,
  getProductosByBodega,
  getAllProductosBodega,
  createProductoBodega,
  updateProductoBodega,
  deleteProductoBodega,
  transferirProducto,
  buscarProductosBodega,
  createBodega,
  updateBodega,
  updateBodegaEstado,
  getUbicaciones as getUbicacionesPorBodega,
  ProductoBodega,
  Sucursal,
  asignarUbicacionProductoBodega,
  getUbicacionesByProductoBodega,
} from "@/api/BodegaApi";
import {
  createUbicacion,
  updateUbicacion,
  deleteUbicacion,
} from "@/api/ManagementSectionApi";

// ============================================
// COMPONENTE PARA EL CARRUSEL DE IMÁGENES
// ============================================

interface ImageCarouselProps {
  images: string[];
  productName: string;
  className?: string;
}

function ImageCarousel({ images, productName, className = "" }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length]);

  if (!images || images.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded ${className}`}
      >
        <Warehouse className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  };

  return (
    <div className={`relative overflow-hidden rounded ${className}`}>
      <div className="relative aspect-square w-full">
        <img
          src={images[currentIndex]}
          alt={`${productName} - Imagen ${currentIndex + 1}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png";
          }}
        />

        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-all"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-all"
              aria-label="Siguiente imagen"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? "bg-white" : "bg-white/50"
              }`}
              aria-label={`Ir a imagen ${index + 1}`}
            />
          ))}
        </div>
      )}

      {images.length > 1 && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

// ============================================
// FUNCIÓN PARA OBTENER URL DE IMAGEN
// ============================================

export const getImageUrl = (imagen: string | undefined | null | any): string => {
  const fallbackImage = "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png";
  
  if (!imagen) {
    return fallbackImage;
  }
  
  if (typeof imagen === 'string') {
    if (imagen.startsWith('data:image')) {
      return imagen;
    }
    if (imagen.startsWith('http')) {
      return imagen;
    }
    return `data:image/jpeg;base64,${imagen}`;
  }
  
  if (Array.isArray(imagen)) {
    try {
      const byteArray = new Uint8Array(imagen);
      let binary = '';
      for (let i = 0; i < byteArray.length; i++) {
        binary += String.fromCharCode(byteArray[i]);
      }
      return `data:image/jpeg;base64,${btoa(binary)}`;
    } catch (error) {
      return fallbackImage;
    }
  }
  
  if (typeof imagen === 'object' && imagen !== null) {
    try {
      if (imagen.data && Array.isArray(imagen.data)) {
        const byteArray = new Uint8Array(imagen.data);
        let binary = '';
        for (let i = 0; i < byteArray.length; i++) {
          binary += String.fromCharCode(byteArray[i]);
        }
        return `data:image/jpeg;base64,${btoa(binary)}`;
      }
      if (imagen.type === 'Buffer' && imagen.data) {
        const byteArray = new Uint8Array(imagen.data);
        let binary = '';
        for (let i = 0; i < byteArray.length; i++) {
          binary += String.fromCharCode(byteArray[i]);
        }
        return `data:image/jpeg;base64,${btoa(binary)}`;
      }
    } catch (error) {
      return fallbackImage;
    }
  }
  
  return fallbackImage;
};

// ============================================
// INTERFACES
// ============================================

interface UbicacionConBodega {
  idubicacion: number;
  nombre: string;
  idbodega: number | null;
}

interface BodegaViewProps {
  searchProductId?: string;
  searchProductName?: string;
  searchBodegaId?: number;
}

// ============================================
// COMPONENTE PARA GESTIÓN DE SUCURSALES
// ============================================

interface SucursalesManagementProps {
  sucursales: Sucursal[];
  onSucursalesChange: () => void;
  isAssistant: boolean;
}

function SucursalesManagement({ sucursales, onSucursalesChange, isAssistant }: SucursalesManagementProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSucursal, setEditingSucursal] = useState<Sucursal | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sucursalToDelete, setSucursalToDelete] = useState<Sucursal | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    direccion: "",
    telefono: "",
  });
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!formData.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la sucursal es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await createBodega({
        nombre: formData.nombre.trim(),
        tipo: "Sucursal",
        direccion: formData.direccion || "",
        telefono: formData.telefono || "",
      });

      toast({
        title: "Sucursal creada",
        description: `La sucursal "${formData.nombre}" ha sido creada exitosamente.`,
      });

      setFormData({ nombre: "", direccion: "", telefono: "" });
      setIsCreating(false);
      await onSucursalesChange();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la sucursal",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingSucursal) return;
    if (!formData.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la sucursal es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await updateBodega(editingSucursal.id, {
        nombre: formData.nombre.trim(),
        tipo: editingSucursal.tipo || "Sucursal",
        direccion: formData.direccion || "",
        telefono: formData.telefono || "",
        estado: editingSucursal.estado,
      });

      toast({
        title: "Sucursal actualizada",
        description: `La sucursal "${formData.nombre}" ha sido actualizada exitosamente.`,
      });

      setFormData({ nombre: "", direccion: "", telefono: "" });
      setIsEditing(false);
      setEditingSucursal(null);
      await onSucursalesChange();
    } catch (error: any) {
      console.error("Error actualizando sucursal:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la sucursal",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEstado = async (sucursal: Sucursal) => {
    const nuevoEstado = sucursal.estado === 0 ? 1 : 0;
    try {
      await updateBodegaEstado(sucursal.id, nuevoEstado);
      toast({
        title: "Estado actualizado",
        description: `La sucursal "${sucursal.nombre}" ha sido ${nuevoEstado === 0 ? "activada" : "desactivada"}.`,
      });
      await onSucursalesChange();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cambiar el estado",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!sucursalToDelete) return;

    setIsDeleting(true);
    try {
      await updateBodegaEstado(sucursalToDelete.id, 2);
      
      toast({
        title: "Sucursal eliminada",
        description: `La sucursal "${sucursalToDelete.nombre}" ha sido eliminada.`,
        variant: "destructive",
      });
      
      setSucursalToDelete(null);
      await onSucursalesChange();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la sucursal",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (sucursal: Sucursal) => {
    setEditingSucursal(sucursal);
    setFormData({
      nombre: sucursal.nombre || "",
      direccion: sucursal.direccion || "",
      telefono: sucursal.telefono || "",
    });
    setIsEditing(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Store className="mr-2 h-4 w-4" />
            Ver Sucursales
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Gestión de Sucursales
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!isAssistant && (
              <Button
                onClick={() => {
                  setFormData({ nombre: "", direccion: "", telefono: "" });
                  setIsCreating(true);
                }}
                className="w-full"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva Sucursal
              </Button>
            )}

            <div className="space-y-2">
              {sucursales.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay sucursales registradas
                </p>
              ) : (
                sucursales.map((sucursal) => (
                  <div
                    key={sucursal.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium truncate">{sucursal.nombre}</span>
                        <Badge variant={sucursal.estado === 0 ? "default" : "secondary"} className="text-xs flex-shrink-0">
                          {sucursal.estado === 0 ? "Activa" : "Inactiva"}
                        </Badge>
                        {sucursal.tipo === "Principal" && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            Principal
                          </Badge>
                        )}
                      </div>
                      {(sucursal.direccion || sucursal.telefono) && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {sucursal.direccion && <span>{sucursal.direccion}</span>}
                          {sucursal.direccion && sucursal.telefono && <span> • </span>}
                          {sucursal.telefono && <span>{sucursal.telefono}</span>}
                        </div>
                      )}
                    </div>
                    {!isAssistant && sucursal.tipo !== "Principal" && (
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openEditModal(sucursal)}
                          title="Editar"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={sucursal.estado === 0}
                            onCheckedChange={() => handleToggleEstado(sucursal)}
                            className="data-[state=checked]:bg-green-500"
                          />
                          <span className="text-xs text-muted-foreground">
                            {sucursal.estado === 0 ? "Activo" : "Inactivo"}
                          </span>
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0 border-red-200 hover:border-red-500 hover:bg-red-50"
                              title="Eliminar"
                              onClick={() => setSucursalToDelete(sucursal)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar sucursal?</AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Estás seguro de que deseas eliminar la sucursal "{sucursalToDelete?.nombre}"?
                                <br />
                                <span className="text-red-500 font-semibold">Esta acción no se puede deshacer.</span>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setSucursalToDelete(null)}>
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-red-500 hover:bg-red-600"
                                disabled={isDeleting}
                              >
                                {isDeleting ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Eliminando...
                                  </>
                                ) : (
                                  "Eliminar"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nueva Sucursal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nombre de la Sucursal <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Ej: Sucursal Norte"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && formData.nombre.trim()) {
                    handleCreate();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dirección</label>
              <Input
                placeholder="Dirección de la sucursal"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                placeholder="Teléfono de contacto"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90"
              disabled={!formData.nombre.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Sucursal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Sucursal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nombre de la Sucursal <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Nombre de la sucursal"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && formData.nombre.trim()) {
                    handleEdit();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dirección</label>
              <Input
                placeholder="Dirección de la sucursal"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                placeholder="Teléfono de contacto"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              className="bg-primary hover:bg-primary/90"
              disabled={!formData.nombre.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                "Actualizar Sucursal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================
// COMPONENTE PARA GESTIÓN DE UBICACIONES EN TRANSFERENCIA
// ============================================

interface UbicacionManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sucursalId: number | null;
  sucursalNombre: string;
  onUbicacionCreada: (ubicacion: { idubicacion: number; nombre: string }) => void;
  onUbicacionEditada?: () => void;
  onUbicacionEliminada?: () => void;
}

function UbicacionManagementDialog({
  open,
  onOpenChange,
  sucursalId,
  sucursalNombre,
  onUbicacionCreada,
  onUbicacionEditada,
  onUbicacionEliminada,
}: UbicacionManagementDialogProps) {
  const [ubicaciones, setUbicaciones] = useState<Array<{ idubicacion: number; nombre: string; estado: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingUbicacion, setEditingUbicacion] = useState<{ id: number; nombre: string } | null>(null);
  const [formData, setFormData] = useState({ nombre: "" });
  const [ubicacionToDelete, setUbicacionToDelete] = useState<{ id: number; nombre: string } | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();

  const loadUbicaciones = useCallback(async () => {
    if (!sucursalId) return;
    
    setIsLoading(true);
    try {
      const ubicacionesData = await getUbicacionesPorBodega(sucursalId);
      setUbicaciones(ubicacionesData.map(u => ({
        idubicacion: u.idubicacion,
        nombre: u.nombre,
        estado: u.estado || 0
      })));
    } catch (error) {
      console.error("Error cargando ubicaciones:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las ubicaciones",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [sucursalId, toast]);

  useEffect(() => {
    if (open && sucursalId) {
      loadUbicaciones();
    }
  }, [open, sucursalId, loadUbicaciones]);

  // Resetear estados cuando se cierra el diálogo principal
  useEffect(() => {
    if (!open) {
      setIsCreating(false);
      setIsEditing(false);
      setIsDeleting(false);
      setShowCreateDialog(false);
      setShowEditDialog(false);
      setFormData({ nombre: "" });
      setEditingUbicacion(null);
      setUbicacionToDelete(null);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!formData.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la ubicación es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!sucursalId) {
      toast({
        title: "Error",
        description: "Primero selecciona una sucursal",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const nuevaUbicacion = await createUbicacion({
        nombre: formData.nombre.trim(),
        idbodega: sucursalId,
      });

      toast({
        title: "Ubicación creada",
        description: `La ubicación "${formData.nombre}" ha sido creada en ${sucursalNombre}.`,
      });

      const nombreCreado = formData.nombre.trim();
      setFormData({ nombre: "" });
      setShowCreateDialog(false);
      setIsCreating(false);
      await loadUbicaciones();
      
      onUbicacionCreada({
        idubicacion: nuevaUbicacion.id,
        nombre: nombreCreado,
      });
      
      if (onUbicacionEditada) onUbicacionEditada();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la ubicación",
        variant: "destructive",
      });
      setIsCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!editingUbicacion) return;
    if (!formData.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la ubicación es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setIsEditing(true);
    try {
      await updateUbicacion(editingUbicacion.id, {
        nombre: formData.nombre.trim(),
        idbodega: sucursalId || undefined,
      });

      toast({
        title: "Ubicación actualizada",
        description: `La ubicación "${formData.nombre}" ha sido actualizada.`,
      });

      setFormData({ nombre: "" });
      setEditingUbicacion(null);
      setShowEditDialog(false);
      setIsEditing(false);
      await loadUbicaciones();
      if (onUbicacionEditada) onUbicacionEditada();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la ubicación",
        variant: "destructive",
      });
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!ubicacionToDelete) return;

    setIsDeleting(true);
    try {
      await deleteUbicacion(ubicacionToDelete.id);

      toast({
        title: "Ubicación eliminada",
        description: `La ubicación "${ubicacionToDelete.nombre}" ha sido eliminada.`,
        variant: "destructive",
      });

      setUbicacionToDelete(null);
      setIsDeleting(false);
      await loadUbicaciones();
      if (onUbicacionEliminada) onUbicacionEliminada();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la ubicación",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  const openEditModal = (ubicacion: { idubicacion: number; nombre: string }) => {
    setEditingUbicacion({ id: ubicacion.idubicacion, nombre: ubicacion.nombre });
    setFormData({ nombre: ubicacion.nombre });
    setShowEditDialog(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Gestión de Ubicaciones - {sucursalNombre}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Botón para crear nueva ubicación */}
            <Button
              onClick={() => {
                setFormData({ nombre: "" });
                setShowCreateDialog(true);
              }}
              className="w-full"
              size="sm"
              disabled={!sucursalId}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva Ubicación
            </Button>

            {!sucursalId && (
              <p className="text-xs text-amber-500 text-center">
                Selecciona una sucursal primero para gestionar sus ubicaciones
              </p>
            )}

            {/* Lista de ubicaciones */}
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : ubicaciones.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  No hay ubicaciones registradas en esta sucursal
                </p>
              ) : (
                ubicaciones.map((ubicacion) => (
                  <div
                    key={ubicacion.idubicacion}
                    className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span className="text-sm">{ubicacion.nombre}</span>
                      <Badge variant={ubicacion.estado === 0 ? "default" : "secondary"} className="text-xs">
                        {ubicacion.estado === 0 ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => openEditModal(ubicacion)}
                        title="Editar"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0 border-red-200 hover:border-red-500 hover:bg-red-50"
                            title="Eliminar"
                            onClick={() => setUbicacionToDelete({ id: ubicacion.idubicacion, nombre: ubicacion.nombre })}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar ubicación?</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de que deseas eliminar la ubicación "{ubicacionToDelete?.nombre}"?
                              <br />
                              <span className="text-red-500 font-semibold">Esta acción no se puede deshacer.</span>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setUbicacionToDelete(null)}>
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDelete}
                              className="bg-red-500 hover:bg-red-600"
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Eliminando...
                                </>
                              ) : (
                                "Eliminar"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para crear ubicación */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        if (!open) {
          setIsCreating(false);
          setFormData({ nombre: "" });
        }
        setShowCreateDialog(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nueva Ubicación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nombre de la Ubicación <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Ej: Pasillo A, Estante 3"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && formData.nombre.trim()) {
                    handleCreate();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sucursal</label>
              <div className="p-2 bg-muted rounded-md text-sm font-medium">
                {sucursalNombre || "Selecciona una sucursal primero"}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateDialog(false);
                setIsCreating(false);
                setFormData({ nombre: "" });
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90"
              disabled={!formData.nombre.trim() || isCreating || !sucursalId}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Ubicación"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar ubicación */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setIsEditing(false);
          setFormData({ nombre: "" });
          setEditingUbicacion(null);
        }
        setShowEditDialog(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Ubicación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nombre de la Ubicación <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Nombre de la ubicación"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && formData.nombre.trim()) {
                    handleEdit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditDialog(false);
                setIsEditing(false);
                setFormData({ nombre: "" });
                setEditingUbicacion(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              className="bg-primary hover:bg-primary/90"
              disabled={!formData.nombre.trim() || isEditing}
            >
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                "Actualizar Ubicación"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================
// FUNCIÓN PARA RENDERIZAR UBICACIONES CON BADGES (FILTRADAS POR BODEGA)
// ============================================

function RenderUbicaciones({ 
  ubicaciones, 
  bodegaId 
}: { 
  ubicaciones: any[]; 
  bodegaId: number | null;
}) {
  if (!ubicaciones || ubicaciones.length === 0) {
    return <span className="text-xs text-muted-foreground">Sin ubicación</span>;
  }

  // Filtrar ubicaciones por bodega
  const ubicacionesFiltradas = ubicaciones.filter(u => {
    // Si la ubicación tiene idbodega, filtrar por la bodega seleccionada
    if (u.idbodega !== undefined && u.idbodega !== null) {
      return u.idbodega === bodegaId;
    }
    // Si no tiene idbodega, mostrar todas (para compatibilidad)
    return true;
  });

  // Extraer los nombres de las ubicaciones filtradas
  const nombres = ubicacionesFiltradas.map(u => u.nombre || u).filter(Boolean);
  
  if (nombres.length === 0) {
    return <span className="text-xs text-muted-foreground">Sin ubicación</span>;
  }

  // Mostrar hasta 2 ubicaciones
  const mostrar = nombres.slice(0, 2);
  const restantes = nombres.length - 2;

  return (
    <div className="flex flex-wrap gap-1">
      {mostrar.map((nombre, index) => (
        <Badge key={index} variant="secondary" className="text-xs">
          {nombre.length > 12 ? nombre.substring(0, 10) + "..." : nombre}
        </Badge>
      ))}
      {restantes > 0 && (
        <Badge variant="secondary" className="text-xs">
          +{restantes}
        </Badge>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL BODEGA VIEW
// ============================================

export function BodegaView({ searchProductId, searchProductName, searchBodegaId }: BodegaViewProps = {}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isNewSucursalDialogOpen, setIsNewSucursalDialogOpen] = useState(false);
  const [isUbicacionManagementOpen, setIsUbicacionManagementOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductoBodega | null>(null);
  const [selectedSucursal, setSelectedSucursal] = useState<string>("");
  const [selectedSucursalId, setSelectedSucursalId] = useState<number | null>(null);
  const [selectedSucursalUbicacion, setSelectedSucursalUbicacion] = useState<string>("");
  const [cantidadTransferir, setCantidadTransferir] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productos, setProductos] = useState<ProductoBodega[]>([]);
  const [filterBajoStock, setFilterBajoStock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [ubicaciones, setUbicaciones] = useState<string[]>([]);
  const [ubicacionesConBodega, setUbicacionesConBodega] = useState<UbicacionConBodega[]>([]);
  const [categorias, setCategorias] = useState<{ idcategoria: number; nombre: string }[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [selectedBodega, setSelectedBodega] = useState<number | null>(null);
  const [bodegas, setBodegas] = useState<any[]>([]);
  const [newSucursalData, setNewSucursalData] = useState({
    nombre: "",
    direccion: "",
    telefono: "",
  });
  const [isCreatingSucursal, setIsCreatingSucursal] = useState(false);
  const [ubicacionesPorSucursal, setUbicacionesPorSucursal] = useState<Array<{ idubicacion: number; nombre: string }>>([]);
  const { toast } = useToast();

  const userRole = localStorage.getItem("userRole") || "admin";
  const isAssistant = userRole === "Asistente";

  const isInitialLoad = useRef(true);

  // ============================================
  // FUNCIONES DE REFRESCO
  // ============================================

  const refreshUbicacionesYCategorias = useCallback(async () => {
    try {
      const bodegaId = selectedBodega || 1;
      const [ubicacionesData, categoriasData] = await Promise.all([
        getUbicacionesPorBodega(bodegaId),
        getCategorias(),
      ]);
      const ubicacionesFiltradas = ubicacionesData.filter(u => u.idbodega === bodegaId || u.idbodega === null);
      setUbicaciones(ubicacionesFiltradas.map((item) => item.nombre));
      setUbicacionesConBodega(ubicacionesFiltradas.map((item) => ({
        idubicacion: item.idubicacion,
        nombre: item.nombre,
        idbodega: item.idbodega
      })));
      setCategorias(categoriasData);
    } catch (error) {
      console.error("Error refrescando ubicaciones y categorías:", error);
    }
  }, [selectedBodega]);

  const loadProductosByBodega = useCallback(async (idbodega: number) => {
    setLoadingAll(true);
    try {
      const productosData = await getProductosByBodega(idbodega);
      setProductos(productosData);
      setShowAllProducts(false);
    } catch (error) {
      console.error("Error cargando productos por bodega:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
    } finally {
      setLoadingAll(false);
    }
  }, [toast]);

  const loadAllProductos = useCallback(async () => {
    setLoadingAll(true);
    try {
      const allProducts = await getAllProductosBodega();
      setProductos(allProducts);
      setShowAllProducts(true);
    } catch (error) {
      console.error("Error cargando todos los productos:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar todos los productos",
        variant: "destructive",
      });
    } finally {
      setLoadingAll(false);
    }
  }, [toast]);

  const reloadBodegas = useCallback(async () => {
    try {
      const bodegasData = await getTodasBodegas();
      setBodegas(bodegasData);
      setSucursales(
        bodegasData.map((b) => ({
          id: b.idbodega,
          nombre: b.nombre,
          ubicacion: b.direccion || "",
          tipo: b.tipo || "Sucursal",
          direccion: b.direccion,
          telefono: b.telefono,
          estado: b.estado,
        }))
      );
    } catch (error) {
      console.error("Error recargando bodegas:", error);
    }
  }, []);

  const performSearch = useCallback(async (query: string) => {
    setSearching(true);
    try {
      const results = await buscarProductosBodega(query, selectedBodega || undefined);
      setProductos(results);
    } catch (error) {
      console.error("Error buscando productos:", error);
      toast({
        title: "Error",
        description: "No se pudieron buscar los productos",
        variant: "destructive",
      });
      setProductos([]);
    } finally {
      setSearching(false);
    }
  }, [selectedBodega, toast]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleBodegaChange = (idbodega: number) => {
    setSelectedBodega(idbodega);
    setSearchTerm("");
    setFilterBajoStock(false);
    
    const bodegaSeleccionada = bodegas.find(b => b.idbodega === idbodega);
    
    if (bodegaSeleccionada && bodegaSeleccionada.estado === 0) {
      loadProductosByBodega(idbodega);
      refreshUbicacionesYCategorias();
    } else {
      if (bodegaSeleccionada && bodegaSeleccionada.estado !== 0) {
        toast({
          title: "Bodega inactiva",
          description: `La bodega "${bodegaSeleccionada.nombre}" está inactiva. Mostrando todos los productos.`,
          variant: "default",
        });
      }
      loadAllProductos();
    }
  };

  const handleTransferir = (product: ProductoBodega) => {
    setSelectedProduct(product);
    setSelectedSucursal("");
    setSelectedSucursalId(null);
    setSelectedSucursalUbicacion("");
    setCantidadTransferir("");
    setUbicacionesPorSucursal([]);
    setIsTransferDialogOpen(true);
  };

  const handleUbicacionCreada = (ubicacion: { idubicacion: number; nombre: string }) => {
    setSelectedSucursalUbicacion(ubicacion.nombre);
    setUbicacionesPorSucursal(prev => [...prev, ubicacion]);
    toast({
      title: "Ubicación seleccionada",
      description: `La ubicación "${ubicacion.nombre}" ha sido seleccionada para la transferencia.`,
    });
  };

  const confirmarTransferencia = async () => {
    if (!selectedProduct || !selectedSucursal || !cantidadTransferir) {
      toast({
        title: "Error",
        description: "Completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    const cantidad = parseInt(cantidadTransferir);
    if (isNaN(cantidad) || cantidad <= 0) {
      toast({
        title: "Error",
        description: "Ingresa una cantidad válida",
        variant: "destructive",
      });
      return;
    }

    if (cantidad > selectedProduct.stock) {
      toast({
        title: "Error",
        description: "Stock insuficiente en bodega",
        variant: "destructive",
      });
      return;
    }

    try {
      const sucursalDestino = sucursales.find(s => s.nombre === selectedSucursal);
      if (!sucursalDestino) {
        toast({
          title: "Error",
          description: "Sucursal destino no encontrada",
          variant: "destructive",
        });
        return;
      }

      await transferirProducto({
        idproducto: selectedProduct.id,
        idbodegaOrigen: selectedBodega || 1,
        idbodegaDestino: sucursalDestino.id,
        cantidad,
      });

      toast({
        title: "Transferencia exitosa",
        description: `${cantidad} unidades de ${selectedProduct.nombre} enviadas a ${selectedSucursal}`,
      });

      if (selectedSucursalUbicacion) {
        const ubicacion = ubicacionesPorSucursal.find(u => u.nombre === selectedSucursalUbicacion);
        if (ubicacion) {
          try {
            await asignarUbicacionProductoBodega({
              idproducto: selectedProduct.id,
              idbodega: sucursalDestino.id,
              idubicacion: ubicacion.idubicacion
            });
          } catch (error) {
            console.error("Error asignando ubicación:", error);
          }
        }
      }

      if (showAllProducts) {
        await loadAllProductos();
      } else if (selectedBodega) {
        await loadProductosByBodega(selectedBodega);
      }

      setIsTransferDialogOpen(false);
      setSelectedProduct(null);
      setSelectedSucursal("");
      setSelectedSucursalId(null);
      setSelectedSucursalUbicacion("");
      setCantidadTransferir("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo realizar la transferencia",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: ProductoBodega) => {
    if (isAssistant) return;
    
    const productData = {
      idproducto: product.id,
      nombre: product.nombre || "",
      codigo_barras: product.codigo || "",
      categorias: product.categoria ? product.categoria.split(',').map(c => c.trim()).filter(c => c) : [],
      stock: product.stock ?? 0,
      ubicacion: product.ubicacion || "",
      precio_venta: product.precio ?? 0,
      precio_compra: product.precio_compra ?? 0,
      stock_minimo: product.stockMinimo ?? 0,
      idbodega: selectedBodega || 1,
      descripcion: product.descripcion || "",
      imagen: product.imagen || "",
      ubicacion_nombre: product.ubicacion || "",
      ubicaciones: product.ubicaciones?.map(u => u.idubicacion) || [],
    };

    setEditingProduct(productData);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (isAssistant) return;

    try {
      await deleteProductoBodega(id);
      toast({
        title: "Producto eliminado",
        description: `${nombre} ha sido eliminado.`,
        variant: "destructive",
      });

      if (showAllProducts) {
        await loadAllProductos();
      } else if (selectedBodega) {
        await loadProductosByBodega(selectedBodega);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = async (productData: any, isEditing: boolean) => {
    try {
      const formData = new FormData();
      
      formData.append("nombre", productData.nombre);
      formData.append("descripcion", productData.descripcion || "");
      formData.append("precio_venta", productData.precio_venta?.toString() || "0");
      formData.append("precio_compra", productData.precio_compra?.toString() || "0");
      formData.append("stock", productData.stock?.toString() || "0");
      formData.append("stock_minimo", productData.stock_minimo?.toString() || "0");
      
      if (productData.codigo_barras && productData.codigo_barras.trim() !== "") {
        formData.append("codigo_barras", productData.codigo_barras.trim());
      }
      
      const bodegaId = selectedBodega || 1;
      formData.append("idbodega", bodegaId.toString());
      
      if (productData.ubicaciones && productData.ubicaciones.length > 0) {
        const ubicacionesIds = productData.ubicaciones.map((u: any) => {
          if (typeof u === 'object' && u !== null) {
            return u.idubicacion || u.id || u;
          }
          return typeof u === 'string' ? parseInt(u) : u;
        }).filter((id: number) => !isNaN(id));
        formData.append("ubicaciones", JSON.stringify(ubicacionesIds));
      }
      
      let categoriasIds: number[] = [];
      if (productData.categorias && productData.categorias.length > 0) {
        categoriasIds = productData.categorias.map((c: any) => {
          if (typeof c === 'object' && c !== null) {
            return c.id || c.idcategoria || c;
          }
          return typeof c === 'string' ? parseInt(c) : c;
        }).filter((id: number) => !isNaN(id));
      }
      
      formData.append("categorias", JSON.stringify(categoriasIds));
      
      if (productData.productos_similares && productData.productos_similares.length > 0) {
        const similaresIds = productData.productos_similares.map((s: any) => {
          if (typeof s === 'object' && s !== null) {
            return s.idproducto || s.id || s;
          }
          return typeof s === 'string' ? parseInt(s) : s;
        }).filter((id: number) => !isNaN(id));
        formData.append("productos_similares", JSON.stringify(similaresIds));
      }
      
      if (productData.imagen && typeof productData.imagen !== "string") {
        formData.append("imagen", productData.imagen);
      }

      if (isEditing && editingProduct) {
        await updateProductoBodega(editingProduct.idproducto, formData);
        toast({
          title: "Producto actualizado",
          description: `${productData.nombre} ha sido actualizado.`,
        });
      } else {
        await createProductoBodega(formData);
        toast({
          title: "Producto agregado",
          description: `${productData.nombre} ha sido agregado.`,
        });
      }

      await refreshUbicacionesYCategorias();

      if (showAllProducts) {
        await loadAllProductos();
      } else if (selectedBodega) {
        await loadProductosByBodega(selectedBodega);
      }

      setEditingProduct(null);
      setIsFormOpen(false);
    } catch (error: any) {
      console.error("Error en handleFormSubmit:", error);
      toast({
        title: "Error",
        description: error.message || `No se pudo ${isEditing ? "editar" : "agregar"} el producto`,
        variant: "destructive",
      });
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  // ============================================
  // EFECTOS
  // ============================================

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const bodegaId = selectedBodega || 1;
        const [ubicacionesData, categoriasData, bodegasData] = await Promise.all([
          getUbicacionesPorBodega(bodegaId),
          getCategorias(),
          getTodasBodegas(),
        ]);

        const ubicacionesFiltradas = ubicacionesData.filter(u => u.idbodega === bodegaId || u.idbodega === null);
        setUbicaciones(ubicacionesFiltradas.map((item) => item.nombre));
        setUbicacionesConBodega(ubicacionesFiltradas.map((item) => ({
          idubicacion: item.idubicacion,
          nombre: item.nombre,
          idbodega: item.idbodega
        })));
        setCategorias(categoriasData);
        setBodegas(bodegasData);
        setSucursales(
          bodegasData.map((b) => ({
            id: b.idbodega,
            nombre: b.nombre,
            ubicacion: b.direccion || "",
            tipo: b.tipo || "Sucursal",
            direccion: b.direccion,
            telefono: b.telefono,
            estado: b.estado,
          }))
        );

        const bodegasActivas = bodegasData.filter(b => b.estado === 0);

        if (searchProductId && searchProductName) {
          let bodegaIdEncontrada: number | null = null;
          
          if (searchBodegaId) {
            bodegaIdEncontrada = searchBodegaId;
          } else {
            const allProducts = await getAllProductosBodega();
            const productoEncontrado = allProducts.find(p => p.id === parseInt(searchProductId));
            
            if (productoEncontrado && productoEncontrado.idbodega) {
              bodegaIdEncontrada = productoEncontrado.idbodega;
            }
          }
          
          if (bodegaIdEncontrada) {
            const bodegaExiste = bodegasActivas.some(b => b.idbodega === bodegaIdEncontrada);
            if (bodegaExiste) {
              setSelectedBodega(bodegaIdEncontrada);
              const productosData = await getProductosByBodega(bodegaIdEncontrada);
              setProductos(productosData);
              setShowAllProducts(false);
            } else {
              if (bodegasActivas.length > 0) {
                const firstBodega = bodegasActivas[0];
                setSelectedBodega(firstBodega.idbodega);
                const productosData = await getProductosByBodega(firstBodega.idbodega);
                setProductos(productosData);
                setShowAllProducts(false);
              } else {
                const allProducts = await getAllProductosBodega();
                setProductos(allProducts);
                setShowAllProducts(true);
              }
            }
          } else {
            if (bodegasActivas.length > 0) {
              const firstBodega = bodegasActivas[0];
              setSelectedBodega(firstBodega.idbodega);
              const productosData = await getProductosByBodega(firstBodega.idbodega);
              setProductos(productosData);
              setShowAllProducts(false);
            } else {
              const allProducts = await getAllProductosBodega();
              setProductos(allProducts);
              setShowAllProducts(true);
            }
          }
          
          setSearchTerm(searchProductName);
          
          setTimeout(() => {
            performSearch(searchProductName);
          }, 300);
          
          sessionStorage.removeItem('searchProductId');
          sessionStorage.removeItem('searchProductName');
          sessionStorage.removeItem('searchBodegaId');
        } else {
          if (bodegasActivas.length > 0) {
            const firstBodega = bodegasActivas[0];
            setSelectedBodega(firstBodega.idbodega);
            const productosData = await getProductosByBodega(firstBodega.idbodega);
            setProductos(productosData);
            setShowAllProducts(false);
          } else {
            const allProducts = await getAllProductosBodega();
            setProductos(allProducts);
            setShowAllProducts(true);
          }
        }
        
        isInitialLoad.current = false;
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos iniciales",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [toast, searchProductId, searchProductName, searchBodegaId]);

  useEffect(() => {
    refreshUbicacionesYCategorias();
  }, [refreshUbicacionesYCategorias, selectedBodega]);

  useEffect(() => {
    const loadUbicacionesSucursal = async () => {
      if (!selectedSucursalId) {
        setUbicacionesPorSucursal([]);
        return;
      }

      try {
        const ubicaciones = await getUbicacionesPorBodega(selectedSucursalId);
        setUbicacionesPorSucursal(ubicaciones.map(u => ({
          idubicacion: u.idubicacion,
          nombre: u.nombre
        })));
        setSelectedSucursalUbicacion("");
      } catch (error) {
        console.error("Error cargando ubicaciones de sucursal:", error);
        setUbicacionesPorSucursal([]);
      }
    };

    loadUbicacionesSucursal();
  }, [selectedSucursalId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        performSearch(searchTerm);
      } else if (searchTerm.trim().length === 0 && selectedBodega && !isInitialLoad.current) {
        const bodegaActiva = bodegas.find(b => b.idbodega === selectedBodega && b.estado === 0);
        if (bodegaActiva) {
          loadProductosByBodega(selectedBodega);
        } else {
          loadAllProductos();
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, performSearch, selectedBodega, loadProductosByBodega, loadAllProductos, bodegas]);

  // ============================================
  // FILTROS Y MEMOS
  // ============================================

  const filteredProducts = useMemo(() => {
    let result = productos;
    if (filterBajoStock) {
      result = result.filter((p) => p.stock <= p.stockMinimo);
    }
    return result;
  }, [productos, filterBajoStock]);

  const totalStock = useMemo(() => {
    return productos.reduce((sum, p) => sum + p.stock, 0);
  }, [productos]);

  const productosBajoStock = useMemo(() => {
    return productos.filter((p) => p.stock <= p.stockMinimo);
  }, [productos]);

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Cargando bodega...</span>
      </div>
    );
  }

  const bodegasActivasParaSelect = bodegas.filter(b => b.estado === 0);

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* ============================================
      HEADER
      ============================================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
          <Warehouse className="h-7 w-7" />
          Bodega Central
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="px-3 py-2 border rounded-md bg-background text-sm w-full sm:w-auto"
            value={selectedBodega || ""}
            onChange={(e) => handleBodegaChange(Number(e.target.value))}
          >
            {bodegasActivasParaSelect.map((b) => (
              <option key={b.idbodega} value={b.idbodega}>
                {b.nombre} {b.tipo === 'Principal' ? '⭐' : ''}
              </option>
            ))}
            {bodegasActivasParaSelect.length === 0 && (
              <option value="">No hay bodegas activas</option>
            )}
          </select>

          <Button
            variant={filterBajoStock ? "default" : "outline"}
            onClick={() => setFilterBajoStock(!filterBajoStock)}
            className="w-full sm:w-auto"
          >
            <Filter className="mr-2 h-4 w-4" />
            {filterBajoStock ? "Mostrar todos" : "Stock bajo"}
            {filterBajoStock && (
              <Badge variant="secondary" className="ml-2">
                {productosBajoStock.length}
              </Badge>
            )}
          </Button>

          <SucursalesManagement
            sucursales={sucursales}
            onSucursalesChange={reloadBodegas}
            isAssistant={isAssistant}
          />

          {!isAssistant && (
            <Dialog
              open={isFormOpen}
              onOpenChange={(open) => {
                setIsFormOpen(open);
                if (!open) {
                  handleFormCancel();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto flex-shrink-0">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Agregar Producto</span>
                  <span className="sm:hidden">Agregar</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
                <DialogHeader className="px-6 pt-6">
                  <DialogTitle>
                    {editingProduct ? "Editar Producto" : "Agregar Nuevo Producto"}
                  </DialogTitle>
                </DialogHeader>
                <div className="px-6 pb-6">
                  <FormularioProductos
                    product={editingProduct}
                    ubicaciones={ubicaciones}
                    categorias={categorias.map(c => c.nombre)}
                    onSubmit={handleFormSubmit}
                    onCancel={handleFormCancel}
                    onRefreshData={refreshUbicacionesYCategorias}
                    idbodega={selectedBodega || 1}
                    ubicacionesConBodega={ubicacionesConBodega}
                    onUbicacionesChange={refreshUbicacionesYCategorias}
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* ============================================
      STATS CARDS
      ============================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Productos</p>
                <p className="text-2xl font-bold">{productos.length}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Total</p>
                <p className="text-2xl font-bold">{totalStock}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Warehouse className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Bajo</p>
                <p className="text-2xl font-bold text-orange-500">{productosBajoStock.length}</p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-full">
                <Eye className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sucursales</p>
                <p className="text-2xl font-bold">{sucursales.length}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <Building2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================
      TABLA DE PRODUCTOS
      ============================================ */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle>
            Inventario en Bodega
            {filterBajoStock && (
              <Badge variant="destructive" className="ml-2">
                Filtro: Stock bajo
              </Badge>
            )}
            {loadingAll && <Loader2 className="ml-2 h-4 w-4 animate-spin inline" />}
          </CardTitle>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Vista móvil - Cards */}
          <div className="block lg:hidden space-y-3 w-full">
            {filteredProducts.map((product) => {
              const imageUrl = product.imagen ? getImageUrl(product.imagen) : "";
              const categorias = product.categoria ? product.categoria.split(',').map(c => c.trim()).filter(c => c) : [];
              // Obtener ubicaciones del producto y filtrar por bodega seleccionada
              const ubicacionesProducto = product.ubicaciones || [];
              const ubicacionesFiltradas = ubicacionesProducto.filter((u: any) => {
                if (u.idbodega !== undefined && u.idbodega !== null) {
                  return u.idbodega === selectedBodega;
                }
                return true;
              });
              const ubicacionesNombres = ubicacionesFiltradas.map((u: any) => u.nombre || u).filter(Boolean);
              const ubicacionesMostrar = ubicacionesNombres.slice(0, 2);
              const ubicacionesRestantes = ubicacionesNombres.length - 2;
              
              return (
                <Card key={product.id} className="p-3 w-full">
                  <div className="space-y-3 w-full">
                    <div className="flex items-start gap-3 w-full">
                      <div className="flex-shrink-0 w-16 h-16">
                        <ImageCarousel
                          images={imageUrl ? [imageUrl] : []}
                          productName={product.nombre}
                          className="w-16 h-16"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 break-words">
                          {product.nombre}
                        </h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {categorias.slice(0, 2).map((cat, index) => (
                            <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5">
                              {cat.length > 15 ? cat.substring(0, 12) + "..." : cat}
                            </Badge>
                          ))}
                          {categorias.length > 2 && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                              +{categorias.length - 2}
                            </Badge>
                          )}
                        </div>
                        {product.bodega_nombre && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {product.bodega_nombre}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                      <div>
                        <span className="font-medium">Código:</span>
                        <span className="text-muted-foreground ml-1">{product.codigo}</span>
                      </div>
                      <div>
                        <span className="font-medium">Stock:</span>
                        <span className={`ml-1 font-semibold ${product.stock <= product.stockMinimo ? 'text-red-500' : 'text-primary'}`}>
                          {product.stock} u.
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Stock Min:</span>
                        <span className="text-muted-foreground ml-1">{product.stockMinimo} u.</span>
                      </div>
                      <div>
                        <span className="font-medium">Ubicación:</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {ubicacionesMostrar.map((nombre, index) => (
                            <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0">
                              {nombre.length > 10 ? nombre.substring(0, 8) + "..." : nombre}
                            </Badge>
                          ))}
                          {ubicacionesRestantes > 0 && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              +{ubicacionesRestantes}
                            </Badge>
                          )}
                          {ubicacionesNombres.length === 0 && (
                            <span className="text-muted-foreground text-xs">Sin ubicación</span>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Precio:</span>
                        <span className="text-primary ml-1 font-semibold">
                          Bs {product.precio.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {product.stock <= product.stockMinimo && (
                      <Badge variant="destructive" className="text-xs">
                        Stock bajo
                      </Badge>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTransferir(product)}
                        className="flex-1 h-8 text-xs"
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Transferir
                      </Button>
                      {!isAssistant && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                            className="flex-1 h-8 text-xs"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-8 text-xs"
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Esto eliminará
                                  permanentemente el producto "{product.nombre}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(product.id, product.nombre)}
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Vista desktop - Tabla */}
          <div className="hidden lg:block">
            <div className="w-full border rounded-lg">
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70px]">Img</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="min-w-[150px]">Categorías</TableHead>
                      <TableHead className="min-w-[100px]">Ubicación</TableHead>
                      <TableHead>Bodega</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-center">Stock Mínimo</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const imageUrl = product.imagen ? getImageUrl(product.imagen) : "";
                      const categorias = product.categoria ? product.categoria.split(',').map(c => c.trim()).filter(c => c) : [];
                      // Obtener ubicaciones del producto
                      const ubicacionesProducto = product.ubicaciones || [];
                      
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="w-10 h-10">
                              <ImageCarousel
                                images={imageUrl ? [imageUrl] : []}
                                productName={product.nombre}
                                className="w-10 h-10"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{product.nombre}</div>
                            <div className="text-xs text-muted-foreground">{product.codigo}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {categorias.slice(0, 2).map((cat, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {cat.length > 12 ? cat.substring(0, 10) + "..." : cat}
                                </Badge>
                              ))}
                              {categorias.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{categorias.length - 2}
                                </Badge>
                              )}
                              {categorias.length === 0 && (
                                <span className="text-xs text-muted-foreground">Sin categoría</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <RenderUbicaciones 
                              ubicaciones={ubicacionesProducto} 
                              bodegaId={selectedBodega}
                            />
                          </TableCell>
                          <TableCell className="text-sm">
                            {product.bodega_nombre || "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-semibold ${product.stock <= product.stockMinimo ? 'text-red-500' : 'text-primary'}`}>
                              {product.stock}
                            </span>
                            {product.stock <= product.stockMinimo && (
                              <Badge variant="destructive" className="text-xs ml-2">
                                Bajo stock
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {product.stockMinimo}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            Bs {product.precio.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTransferir(product)}
                                className="h-8 text-xs"
                                title="Transferir"
                              >
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                              {!isAssistant && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(product)}
                                    className="h-8 w-8 p-0"
                                    title="Editar"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción no se puede deshacer. Esto eliminará
                                          permanentemente el producto "{product.nombre}".
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDelete(product.id, product.nombre)}
                                        >
                                          Eliminar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 && !loadingAll && (
            <div className="text-center text-muted-foreground py-8">
              {searchTerm.trim().length >= 2
                ? "No se encontraron productos que coincidan con la búsqueda."
                : filterBajoStock
                ? "No hay productos con stock bajo"
                : "No hay productos en esta bodega"}
            </div>
          )}

          {loadingAll && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">Cargando productos...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================
      DIALOG DE TRANSFERENCIA
      ============================================ */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir a Sucursal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Producto</p>
              <p className="text-lg font-semibold text-primary">{selectedProduct?.nombre}</p>
              <p className="text-sm text-muted-foreground">Stock disponible: {selectedProduct?.stock} unidades</p>
              {selectedProduct?.ubicaciones && selectedProduct.ubicaciones.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Ubicaciones actuales: {selectedProduct.ubicaciones.map(u => u.nombre).join(', ')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Sucursal destino</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsTransferDialogOpen(false);
                    setIsNewSucursalDialogOpen(true);
                  }}
                  className="h-7 text-xs"
                >
                  <Building2 className="h-3 w-3 mr-1" />
                  Nueva Sucursal
                </Button>
              </div>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedSucursal}
                onChange={(e) => {
                  const nombre = e.target.value;
                  setSelectedSucursal(nombre);
                  const sucursal = sucursales.find(s => s.nombre === nombre);
                  setSelectedSucursalId(sucursal?.id || null);
                }}
              >
                <option value="">Seleccionar sucursal...</option>
                {sucursales
                  .filter(s => s.estado === 0)
                  .map((s) => (
                    <option key={s.id} value={s.nombre}>
                      {s.nombre} - {s.ubicacion}
                    </option>
                  ))}
              </select>
            </div>

            {selectedSucursal && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Ubicación en la sucursal</label>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsUbicacionManagementOpen(true);
                      }}
                      className="h-7 text-xs"
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      Gestionar
                    </Button>
                  </div>
                </div>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedSucursalUbicacion}
                  onChange={(e) => setSelectedSucursalUbicacion(e.target.value)}
                >
                  <option value="">Seleccionar ubicación...</option>
                  {ubicacionesPorSucursal.map((u) => (
                    <option key={u.idubicacion} value={u.nombre}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
                {ubicacionesPorSucursal.length === 0 && (
                  <p className="text-xs text-amber-500">
                    Esta sucursal no tiene ubicaciones registradas
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Haz clic en "Gestionar" para crear, editar o eliminar ubicaciones
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Cantidad a transferir</label>
              <Input
                type="number"
                placeholder="0"
                value={cantidadTransferir}
                onChange={(e) => setCantidadTransferir(e.target.value)}
                min="0"
                max={selectedProduct?.stock}
              />
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Stock restante en bodega:{" "}
                <span className="font-semibold text-primary">
                  {selectedProduct ? selectedProduct.stock - (parseInt(cantidadTransferir) || 0) : 0}
                </span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarTransferencia}
              className="bg-primary hover:bg-primary/90"
              disabled={!selectedSucursal || !cantidadTransferir || parseInt(cantidadTransferir) <= 0}
            >
              Confirmar Transferencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================
      DIALOG PARA GESTIÓN DE UBICACIONES (desde transferencia)
      ============================================ */}
      <UbicacionManagementDialog
        open={isUbicacionManagementOpen}
        onOpenChange={setIsUbicacionManagementOpen}
        sucursalId={selectedSucursalId}
        sucursalNombre={selectedSucursal || "Sucursal"}
        onUbicacionCreada={handleUbicacionCreada}
        onUbicacionEditada={() => {
          if (selectedSucursalId) {
            getUbicacionesPorBodega(selectedSucursalId).then(ubicaciones => {
              setUbicacionesPorSucursal(ubicaciones.map(u => ({
                idubicacion: u.idubicacion,
                nombre: u.nombre
              })));
            });
          }
        }}
        onUbicacionEliminada={() => {
          if (selectedSucursalId) {
            getUbicacionesPorBodega(selectedSucursalId).then(ubicaciones => {
              setUbicacionesPorSucursal(ubicaciones.map(u => ({
                idubicacion: u.idubicacion,
                nombre: u.nombre
              })));
            });
          }
        }}
      />

      {/* ============================================
      DIALOG PARA CREAR NUEVA SUCURSAL (desde transferencia)
      ============================================ */}
      <Dialog open={isNewSucursalDialogOpen} onOpenChange={setIsNewSucursalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Crear Nueva Sucursal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de la Sucursal *</label>
              <Input
                placeholder="Ej: Sucursal Norte"
                value={newSucursalData.nombre}
                onChange={(e) => setNewSucursalData({ ...newSucursalData, nombre: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dirección</label>
              <Input
                placeholder="Dirección de la sucursal"
                value={newSucursalData.direccion}
                onChange={(e) => setNewSucursalData({ ...newSucursalData, direccion: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                placeholder="Teléfono de contacto"
                value={newSucursalData.telefono}
                onChange={(e) => setNewSucursalData({ ...newSucursalData, telefono: e.target.value })}
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <p>La sucursal se creará con tipo "Sucursal" y estará activa por defecto.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewSucursalDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!newSucursalData.nombre.trim()) {
                  toast({
                    title: "Error",
                    description: "El nombre de la sucursal es obligatorio",
                    variant: "destructive",
                  });
                  return;
                }

                setIsCreatingSucursal(true);
                try {
                  await createBodega({
                    nombre: newSucursalData.nombre.trim(),
                    tipo: "Sucursal",
                    direccion: newSucursalData.direccion || "",
                    telefono: newSucursalData.telefono || "",
                  });

                  toast({
                    title: "Sucursal creada",
                    description: `La sucursal "${newSucursalData.nombre}" ha sido creada exitosamente.`,
                  });

                  await reloadBodegas();
                  setIsNewSucursalDialogOpen(false);
                  setNewSucursalData({ nombre: "", direccion: "", telefono: "" });
                  setIsTransferDialogOpen(true);
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "No se pudo crear la sucursal",
                    variant: "destructive",
                  });
                } finally {
                  setIsCreatingSucursal(false);
                }
              }}
              className="bg-primary hover:bg-primary/90"
              disabled={!newSucursalData.nombre.trim() || isCreatingSucursal}
            >
              {isCreatingSucursal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Sucursal'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}