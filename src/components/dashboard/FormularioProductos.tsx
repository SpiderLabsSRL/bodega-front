// src/components/dashboard/FormularioProductos.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Search, Camera, Edit, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import BarcodeScanner from "./BarcodeScanner";
import {
  createUbicacion,
  updateUbicacion,
  deleteUbicacion,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  getUbicaciones,
  getCategorias,
  UbicacionItem,
} from "@/api/ManagementSectionApi";
import {
  createProductoBodega,
  updateProductoBodega,
  getTodosProductosParaSelect,
} from "@/api/BodegaApi";

interface ProductFormData {
  id?: string;
  nombre: string;
  categorias: string[];
  descripcion: string;
  ubicacion: string;
  ubicaciones?: number[];
  precioVenta: string | number;
  precioCompra?: string | number;
  stock: number | string;
  stockMinimo?: number | string;
  imagen?: string;
  imagenFile?: File | string | string[];
  codigoBarras?: string;
  productosSimilares?: number[];
  productosSimilaresData?: Array<{ idproducto: number; nombre: string }>;
  idbodega?: number;
  idubicacion?: number;
}

interface FormularioProductosProps {
  product?: any;
  ubicaciones: string[];
  categorias: string[];
  onSubmit: (productData: any, isEditing: boolean) => void;
  onCancel: () => void;
  onRefreshData?: () => void;
  idbodega?: number;
  ubicacionesConBodega?: Array<{ idubicacion: number; nombre: string; idbodega: number | null }>;
  onUbicacionesChange?: () => Promise<void>;
}

interface AddDialogState {
  open: boolean;
  type: "categoria" | "ubicacion" | null;
  mode: "create" | "edit" | null;
  editId?: number | null;
  editName?: string;
}

interface ManagementItem {
  id: number;
  nombre: string;
  estado: number;
}

interface SearchSelectProps {
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder: string;
  label: string;
  required?: boolean;
  onEdit?: (item: string) => void;
  onDelete?: (item: string) => void;
  showActions?: boolean;
  itemType?: string;
}

const SearchSelect = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder,
  label,
  required,
  onEdit,
  onDelete,
  showActions = false,
  itemType = "item",
}: SearchSelectProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = options.filter(
    (option) =>
      option.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedValues.includes(option),
  );

  const addSelection = (option: string) => {
    onSelectionChange([...selectedValues, option]);
    setSearchTerm("");
    setIsOpen(false);
  };

  const removeSelection = (option: string) => {
    onSelectionChange(selectedValues.filter((v) => v !== option));
  };

  return (
    <div className="space-y-1 w-full">
      <Label className="text-xs">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative w-full">
        <Input
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          className="h-8 text-xs w-full pr-16"
        />
        {isOpen && filteredOptions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-28 overflow-y-auto">
            {filteredOptions.map((option) => (
              <div
                key={option}
                className="flex items-center justify-between px-2 py-1 hover:bg-accent"
              >
                <button
                  type="button"
                  className="flex-1 text-left text-xs"
                  onMouseDown={() => addSelection(option)}
                >
                  {option}
                </button>
                {showActions && (
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(option);
                      }}
                      className="p-0.5 hover:text-blue-500 transition-colors"
                      title={`Editar ${itemType}`}
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(option);
                      }}
                      className="p-0.5 hover:text-red-500 transition-colors"
                      title={`Eliminar ${itemType}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selectedValues.map((value) => (
            <Badge
              key={value}
              variant="secondary"
              className="text-xs px-1.5 py-0 h-5"
            >
              {value}
              <button
                type="button"
                onClick={() => removeSelection(value)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

interface ProductoSelect {
  idproducto: number;
  nombre: string;
}

const ProductoSimilarSelect = ({
  productosDisponibles,
  selectedValues,
  onSelectionChange,
  currentProductId,
}: {
  productosDisponibles: ProductoSelect[];
  selectedValues: number[];
  onSelectionChange: (values: number[]) => void;
  currentProductId?: number;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const filteredOptions = productosDisponibles.filter(
    (producto) =>
      producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedValues.includes(producto.idproducto) &&
      producto.idproducto !== currentProductId,
  );

  const addSelection = (producto: ProductoSelect) => {
    onSelectionChange([...selectedValues, producto.idproducto]);
    setSearchTerm("");
    setIsOpen(false);
  };

  const removeSelection = (productoId: number) => {
    onSelectionChange(selectedValues.filter((v) => v !== productoId));
  };

  const getProductoNombre = (id: number) => {
    const producto = productosDisponibles.find((p) => p.idproducto === id);
    return producto ? producto.nombre : `Producto ${id}`;
  };

  return (
    <div className="space-y-1 w-full">
      <Label className="text-xs">Productos Similares</Label>
      <div className="relative w-full">
        <Input
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder="Buscar productos similares..."
          className="h-8 text-xs pl-7 w-full"
        />
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        {isOpen && filteredOptions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-28 overflow-y-auto">
            {filteredOptions.map((producto) => (
              <button
                key={producto.idproducto}
                type="button"
                className="w-full text-left px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                onMouseDown={() => addSelection(producto)}
              >
                {producto.nombre}
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selectedValues.map((id) => (
            <Badge
              key={id}
              variant="secondary"
              className="text-xs px-1.5 py-0 h-5"
            >
              {getProductoNombre(id)}
              <button
                type="button"
                onClick={() => removeSelection(id)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

const base64ToFile = (base64String, fileName = "imagen.jpg") => {
  if (!base64String) return null;
  
  try {
    const [metadata, data] = base64String.split(",");
    const mime = metadata.match(/:(.*?);/)[1];

    const byteCharacters = atob(data);
    const byteArrays = [];

    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays.push(byteCharacters.charCodeAt(i));
    }

    const byteArray = new Uint8Array(byteArrays);
    const blob = new Blob([byteArray], { type: mime });

    return new File([blob], fileName, { type: mime });
  } catch (error) {
    console.error("Error converting base64 to file:", error);
    return null;
  }
};

export function FormularioProductos({
  product,
  ubicaciones: ubicacionesProp,
  categorias: categoriasProp,
  onSubmit,
  onCancel,
  onRefreshData,
  idbodega,
  ubicacionesConBodega,
  onUbicacionesChange,
}: FormularioProductosProps) {
  const [formData, setFormData] = useState<ProductFormData>(() => {
    if (!product) {
      return {
        nombre: "",
        categorias: [],
        descripcion: "",
        ubicacion: "",
        ubicaciones: [],
        precioVenta: "",
        precioCompra: "",
        stock: "",
        stockMinimo: "",
        imagen: "",
        imagenFile: null,
        codigoBarras: "",
        productosSimilares: [],
        productosSimilaresData: [],
        idbodega: idbodega || 1,
      };
    }

    let categoriasArray = [];
    if (product.categorias) {
      if (Array.isArray(product.categorias)) {
        categoriasArray = product.categorias;
      } else {
        categoriasArray = [product.categorias];
      }
    }

    let similaresArray: number[] = [];
    let similaresDataArray: Array<{ idproducto: number; nombre: string }> = [];
    
    if (product.productos_similares) {
      if (Array.isArray(product.productos_similares)) {
        if (product.productos_similares.length > 0 && typeof product.productos_similares[0] === 'object') {
          similaresArray = product.productos_similares.map((p: any) => p.idproducto_similar || p.idproducto || p.id);
          similaresDataArray = product.productos_similares;
        } else {
          similaresArray = product.productos_similares;
        }
      }
    }

    let ubicacionesIds: number[] = [];
    if (product.ubicaciones && Array.isArray(product.ubicaciones)) {
      ubicacionesIds = product.ubicaciones.map((u: any) => u.idubicacion || u.id || u).filter((id: number) => !isNaN(id));
    } else if (product.idubicacion) {
      ubicacionesIds = [product.idubicacion];
    }

    return {
      id: product.idproducto?.toString() || product.id?.toString(),
      nombre: product.nombre || "",
      categorias: categoriasArray,
      descripcion: product.descripcion || "",
      ubicacion: product.ubicacion_nombre || product.ubicacion || "",
      ubicaciones: ubicacionesIds,
      precioVenta: product.precio_venta?.toString() || product.precio?.toString() || "",
      precioCompra: product.precio_compra?.toString() || "",
      stock: product.stock?.toString() || "",
      stockMinimo: product.stock_minimo?.toString() || "",
      imagen: product.imagen || "",
      imagenFile: product.imagen ? base64ToFile(product.imagen, "producto.jpg") : null,
      codigoBarras: product.codigo_barras || product.codigo || "",
      productosSimilares: similaresArray,
      productosSimilaresData: similaresDataArray,
      idbodega: product.idbodega || idbodega || 1,
    };
  });

  const [addDialogState, setAddDialogState] = useState<AddDialogState>({
    open: false,
    type: null,
    mode: "create",
    editId: null,
    editName: "",
  });
  const [editDialogData, setEditDialogData] = useState({ name: "", id: 0 });
  const [todosProductos, setTodosProductos] = useState<ProductoSelect[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const [ubicacionesFiltradas, setUbicacionesFiltradas] = useState<string[]>([]);
  const [ubicacionesCompletas, setUbicacionesCompletas] = useState<Array<{ idubicacion: number; nombre: string; idbodega: number | null }>>([]);

  const [localLists, setLocalLists] = useState<{
    ubicaciones: string[];
    categorias: string[];
  }>({
    ubicaciones: ubicacionesProp || [],
    categorias: categoriasProp || [],
  });

  const [managementItems, setManagementItems] = useState<{
    ubicaciones: ManagementItem[];
    categorias: ManagementItem[];
  }>({
    ubicaciones: [],
    categorias: [],
  });

  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isAddingElement, setIsAddingElement] = useState(false);
  const [isDeletingElement, setIsDeletingElement] = useState(false);

  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Cargar ubicaciones filtradas por bodega
  useEffect(() => {
    const loadUbicacionesFiltradas = async () => {
      try {
        const bodegaId = idbodega || 1;
        const ubicaciones = await getUbicaciones(bodegaId);
        const ubicacionesFiltradasPorBodega = ubicaciones.filter(u => u.idbodega === bodegaId || u.idbodega === null);
        const nombres = ubicacionesFiltradasPorBodega.map(u => u.nombre);
        setUbicacionesFiltradas(nombres);
        setUbicacionesCompletas(ubicacionesFiltradasPorBodega.map(u => ({
          idubicacion: u.id,
          nombre: u.nombre,
          idbodega: u.idbodega
        })));
        
        setLocalLists(prev => ({
          ...prev,
          ubicaciones: nombres,
        }));
        
        if (formData.ubicacion && !nombres.includes(formData.ubicacion) && !product) {
          setFormData(prev => ({ ...prev, ubicacion: "" }));
        }
      } catch (error) {
        console.error("Error cargando ubicaciones filtradas:", error);
      }
    };

    loadUbicacionesFiltradas();
  }, [idbodega, product]);

  useEffect(() => {
    setLocalLists(prev => ({
      ...prev,
      ubicaciones: ubicacionesProp || [],
    }));
  }, [ubicacionesProp]);

  useEffect(() => {
    setLocalLists(prev => ({
      ...prev,
      categorias: categoriasProp || [],
    }));
  }, [categoriasProp]);

  useEffect(() => {
    if (!product) {
      setFormData(prev => ({
        ...prev,
        idbodega: idbodega || 1,
      }));
      return;
    }

    let categoriasArray = [];
    if (product.categorias) {
      if (Array.isArray(product.categorias)) {
        categoriasArray = product.categorias;
      } else {
        categoriasArray = [product.categorias];
      }
    }

    let similaresArray: number[] = [];
    let similaresDataArray: Array<{ idproducto: number; nombre: string }> = [];
    
    if (product.productos_similares) {
      if (Array.isArray(product.productos_similares)) {
        if (product.productos_similares.length > 0 && typeof product.productos_similares[0] === 'object') {
          similaresArray = product.productos_similares.map((p: any) => p.idproducto_similar || p.idproducto || p.id);
          similaresDataArray = product.productos_similares;
        } else {
          similaresArray = product.productos_similares;
        }
      }
    }

    let ubicacionesIds: number[] = [];
    if (product.ubicaciones && Array.isArray(product.ubicaciones)) {
      ubicacionesIds = product.ubicaciones.map((u: any) => u.idubicacion || u.id || u).filter((id: number) => !isNaN(id));
    } else if (product.idubicacion) {
      ubicacionesIds = [product.idubicacion];
    }

    setFormData(prev => ({
      ...prev,
      id: product.idproducto?.toString() || product.id?.toString(),
      nombre: product.nombre || "",
      categorias: categoriasArray,
      descripcion: product.descripcion || "",
      ubicacion: product.ubicacion_nombre || product.ubicacion || "",
      ubicaciones: ubicacionesIds,
      precioVenta: product.precio_venta?.toString() || product.precio?.toString() || "",
      precioCompra: product.precio_compra?.toString() || "",
      stock: product.stock?.toString() || "",
      stockMinimo: product.stock_minimo?.toString() || "",
      imagen: product.imagen || "",
      imagenFile: product.imagen ? base64ToFile(product.imagen, "producto.jpg") : null,
      codigoBarras: product.codigo_barras || product.codigo || "",
      productosSimilares: similaresArray,
      productosSimilaresData: similaresDataArray,
      idbodega: product.idbodega || idbodega || 1,
    }));
  }, [product, idbodega]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (showScanner) {
        event.preventDefault();
        setShowScanner(false);
        window.history.pushState(null, '', window.location.pathname);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showScanner]);

  const openScanner = () => {
    setShowScanner(true);
    window.history.pushState({ scanner: true }, '');
  };

  const handleBarcodeScanned = (barcode: string) => {
    setShowScanner(false);
    setFormData((prev) => ({ ...prev, codigoBarras: barcode }));
    toast({
      title: "Código escaneado",
      description: `Código: ${barcode}`,
      duration: 2000,
    });
  };

  useEffect(() => {
    const loadTodosProductos = async () => {
      setLoadingProductos(true);
      try {
        const productos = await getTodosProductosParaSelect();
        setTodosProductos(productos);
      } catch (error) {
        console.error("Error cargando productos para similares:", error);
      } finally {
        setLoadingProductos(false);
      }
    };
    loadTodosProductos();
  }, []);

  useEffect(() => {
    const loadManagementItems = async () => {
      try {
        const bodegaId = idbodega || 1;
        const [ubicacionesData, categoriasData] = await Promise.all([
          getUbicaciones(bodegaId),
          getCategorias(),
        ]);

        const ubicacionesFiltradasPorBodega = ubicacionesData.filter(u => u.idbodega === bodegaId || u.idbodega === null);
        const ubicacionesNombres = ubicacionesFiltradasPorBodega.map((item) => item.nombre);

        setManagementItems({
          ubicaciones: ubicacionesFiltradasPorBodega.map(u => ({ id: u.id, nombre: u.nombre, estado: u.estado })),
          categorias: categoriasData,
        });

        setLocalLists(prev => ({
          ...prev,
          ubicaciones: ubicacionesNombres,
        }));
      } catch (error) {
        console.error("Error cargando elementos de gestión:", error);
      }
    };

    loadManagementItems();
  }, [idbodega]);

  const handleInputChange = (
    field: keyof ProductFormData,
    value: string | string[] | File | number | number[],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatDescriptionForProduction = (description: string): string => {
    if (!description) return "";
    return description
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n+/g, "\n")
      .replace(/[ ]+/g, " ")
      .trim();
  };

  const getItemIdByName = (items: ManagementItem[], name: string): number => {
    const item = items.find((item) => item.nombre === name);
    return item?.id || 0;
  };

  const getItemById = (items: ManagementItem[], id: number): ManagementItem | undefined => {
    return items.find((item) => item.id === id);
  };

  const updateLocalLists = async (type: string) => {
    try {
      const bodegaId = idbodega || 1;
      let ubicacionesData: UbicacionItem[] = [];
      let categoriasData: ManagementItem[] = [];

      if (type === "ubicacion" || type === "all") {
        ubicacionesData = await getUbicaciones(bodegaId);
        const ubicacionesFiltradasPorBodega = ubicacionesData.filter(u => u.idbodega === bodegaId || u.idbodega === null);
        const ubicacionesNombres = ubicacionesFiltradasPorBodega.map((item) => item.nombre);
        setManagementItems((prev) => ({ 
          ...prev, 
          ubicaciones: ubicacionesFiltradasPorBodega.map(u => ({ id: u.id, nombre: u.nombre, estado: u.estado }))
        }));
        setLocalLists((prev) => ({
          ...prev,
          ubicaciones: ubicacionesNombres,
        }));
        setUbicacionesFiltradas(ubicacionesNombres);
        setUbicacionesCompletas(ubicacionesFiltradasPorBodega.map(u => ({
          idubicacion: u.id,
          nombre: u.nombre,
          idbodega: u.idbodega
        })));
        
        if (onUbicacionesChange) {
          await onUbicacionesChange();
        }
      }

      if (type === "categoria" || type === "all") {
        categoriasData = await getCategorias();
        const categoriasNombres = categoriasData.map((item) => item.nombre);
        setManagementItems((prev) => ({ ...prev, categorias: categoriasData }));
        setLocalLists((prev) => ({
          ...prev,
          categorias: categoriasNombres,
        }));
      }

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (error) {
      console.error(`Error actualizando listas:`, error);
    }
  };

  // ============================================
  // FUNCIONES PARA GESTIÓN DE UBICACIONES
  // ============================================

  const handleEditUbicacion = (nombre: string) => {
    const item = managementItems.ubicaciones.find(u => u.nombre === nombre);
    if (!item) {
      toast({
        title: "Error",
        description: "Ubicación no encontrada",
        variant: "destructive",
      });
      return;
    }

    setEditDialogData({ name: item.nombre, id: item.id });
    setAddDialogState({
      open: true,
      type: "ubicacion",
      mode: "edit",
      editId: item.id,
      editName: item.nombre,
    });
  };

  const handleDeleteUbicacion = async (nombre: string) => {
    const item = managementItems.ubicaciones.find(u => u.nombre === nombre);
    if (!item) {
      toast({
        title: "Error",
        description: "Ubicación no encontrada",
        variant: "destructive",
      });
      return;
    }

    if (formData.ubicaciones && formData.ubicaciones.includes(item.id)) {
      toast({
        title: "Error",
        description: "No puedes eliminar una ubicación que está seleccionada para este producto",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingElement(true);
    try {
      await deleteUbicacion(item.id);
      await updateLocalLists("ubicacion");
      
      toast({
        title: "Ubicación eliminada",
        description: `La ubicación "${nombre}" ha sido eliminada.`,
        variant: "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la ubicación",
        variant: "destructive",
      });
    } finally {
      setIsDeletingElement(false);
    }
  };

  // ============================================
  // FUNCIONES PARA GESTIÓN DE CATEGORÍAS
  // ============================================

  const handleEditCategoria = (nombre: string) => {
    const item = managementItems.categorias.find(c => c.nombre === nombre);
    if (!item) {
      toast({
        title: "Error",
        description: "Categoría no encontrada",
        variant: "destructive",
      });
      return;
    }

    setEditDialogData({ name: item.nombre, id: item.id });
    setAddDialogState({
      open: true,
      type: "categoria",
      mode: "edit",
      editId: item.id,
      editName: item.nombre,
    });
  };

  const handleDeleteCategoria = async (nombre: string) => {
    const item = managementItems.categorias.find(c => c.nombre === nombre);
    if (!item) {
      toast({
        title: "Error",
        description: "Categoría no encontrada",
        variant: "destructive",
      });
      return;
    }

    if (formData.categorias.includes(nombre)) {
      toast({
        title: "Error",
        description: "No puedes eliminar una categoría que está seleccionada para este producto",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingElement(true);
    try {
      await deleteCategoria(item.id);
      await updateLocalLists("categoria");
      
      toast({
        title: "Categoría eliminada",
        description: `La categoría "${nombre}" ha sido eliminada.`,
        variant: "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la categoría",
        variant: "destructive",
      });
    } finally {
      setIsDeletingElement(false);
    }
  };

  // ============================================
  // FUNCIONES PARA AGREGAR/EDITAR ELEMENTOS
  // ============================================

  const handleAddNewElement = async (name: string) => {
    if (isAddingElement) return;

    const type = addDialogState.type;
    if (!type) return;

    setIsAddingElement(true);

    try {
      const isEdit = addDialogState.mode === "edit";
      const bodegaId = idbodega || 1;
      
      if (isEdit) {
        switch (type) {
          case "categoria":
            await updateCategoria(addDialogState.editId!, { nombre: name });
            break;
          case "ubicacion":
            await updateUbicacion(addDialogState.editId!, { nombre: name, idbodega: bodegaId });
            break;
        }
        
        toast({
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} actualizado`,
          description: `El ${type} ha sido actualizado exitosamente.`,
        });
      } else {
        switch (type) {
          case "categoria":
            await createCategoria({ nombre: name });
            break;
          case "ubicacion":
            await createUbicacion({ nombre: name, idbodega: bodegaId });
            break;
        }
        
        toast({
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} agregado`,
          description: `El ${type} "${name}" ha sido agregado exitosamente.`,
        });
      }

      await updateLocalLists(type);

      if (type === "ubicacion" && !isEdit) {
        const nuevaUbicacion = ubicacionesCompletas.find(u => u.nombre === name);
        if (nuevaUbicacion) {
          const ubicacionesActuales = formData.ubicaciones || [];
          if (!ubicacionesActuales.includes(nuevaUbicacion.idubicacion)) {
            handleInputChange("ubicaciones", [...ubicacionesActuales, nuevaUbicacion.idubicacion]);
          }
        }
        handleInputChange("ubicacion", name);
      }

      setAddDialogState({ open: false, type: null, mode: "create", editId: null, editName: "" });
    } catch (error) {
      console.error(`Error ${addDialogState.mode === "edit" ? "actualizando" : "agregando"} ${type}:`, error);
      toast({
        title: "Error",
        description: `No se pudo ${addDialogState.mode === "edit" ? "actualizar" : "agregar"} el ${type}`,
        variant: "destructive",
      });
    } finally {
      setIsAddingElement(false);
    }
  };

  const openAddDialog = (type: "categoria" | "ubicacion") => {
    setAddDialogState({
      open: true,
      type,
      mode: "create",
      editId: null,
      editName: "",
    });
  };

  // ============================================
  // FUNCIONES PARA EL FORMULARIO
  // ============================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingProduct) return;

    if (!formData.nombre?.trim()) {
      toast({
        title: "Error",
        description: "El nombre del producto es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!formData.ubicaciones || formData.ubicaciones.length === 0) {
      toast({
        title: "Error",
        description: "Debe seleccionar al menos una ubicación",
        variant: "destructive",
      });
      return;
    }

    if (!formData.categorias || formData.categorias.length === 0) {
      toast({
        title: "Error",
        description: "Debe seleccionar al menos una categoría",
        variant: "destructive",
      });
      return;
    }

    const precioVentaNum = Number(formData.precioVenta);
    if (isNaN(precioVentaNum) || precioVentaNum <= 0) {
      toast({
        title: "Error",
        description: "El precio de venta debe ser un número válido mayor a 0",
        variant: "destructive",
      });
      return;
    }

    if (!formData.descripcion?.trim()) {
      toast({
        title: "Error",
        description: "La descripción es obligatoria",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingProduct(true);

    try {
      const descripcionFormateada = formatDescriptionForProduction(
        formData.descripcion,
      );

      const formDataToSend = new FormData();

      formDataToSend.append("nombre", formData.nombre);
      formDataToSend.append("descripcion", descripcionFormateada);
      
      const ubicacionesIds = formData.ubicaciones
        .map(id => typeof id === 'string' ? parseInt(id) : id)
        .filter(id => !isNaN(id) && id > 0);
      
      if (ubicacionesIds.length > 0) {
        formDataToSend.append("ubicaciones", JSON.stringify(ubicacionesIds));
      }
      
      const categoriasIds = formData.categorias.map((cat) =>
        getItemIdByName(managementItems.categorias, cat)
      ).filter(id => id > 0);
      
      formDataToSend.append("categorias", JSON.stringify(categoriasIds));
      
      formDataToSend.append("precio_venta", precioVentaNum.toString());
      
      const precioCompraNum = Number(formData.precioCompra) || 0;
      formDataToSend.append("precio_compra", precioCompraNum.toString());
      
      const stockNum = Number(formData.stock) || 0;
      formDataToSend.append("stock", stockNum.toString());
      
      const stockMinimoNum = Number(formData.stockMinimo) || 0;
      formDataToSend.append("stock_minimo", stockMinimoNum.toString());

      const bodegaId = idbodega || 1;
      formDataToSend.append("idbodega", bodegaId.toString());

      if (formData.codigoBarras && formData.codigoBarras.trim() !== "") {
        formDataToSend.append("codigo_barras", formData.codigoBarras.trim());
      }

      if (formData.productosSimilares && formData.productosSimilares.length > 0) {
        const similaresIds = formData.productosSimilares
          .map(id => typeof id === 'string' ? parseInt(id) : id)
          .filter(id => !isNaN(id) && id > 0);
        
        if (similaresIds.length > 0) {
          formDataToSend.append("productos_similares", JSON.stringify(similaresIds));
        }
      }

      if (formData.imagenFile instanceof File) {
        formDataToSend.append("imagen", formData.imagenFile);
      }

      const isEditing = !!formData.id;

      if (isEditing) {
        await updateProductoBodega(parseInt(formData.id), formDataToSend);
        toast({
          title: "Producto actualizado",
          description: `${formData.nombre} ha sido actualizado exitosamente.`,
        });
      } else {
        await createProductoBodega(formDataToSend);
        toast({
          title: "Producto creado",
          description: `${formData.nombre} ha sido creado exitosamente.`,
        });
      }

      const submitData = {
        ...formData,
        precio_venta: precioVentaNum,
        precio_compra: precioCompraNum,
        stock: stockNum,
        stock_minimo: stockMinimoNum,
        ubicaciones: ubicacionesIds,
        categorias: categoriasIds,
        productos_similares: formData.productosSimilares || [],
      };

      onSubmit(submitData, isEditing);
    } catch (error: any) {
      console.error("Error al guardar el producto:", error);
      toast({
        title: "Error",
        description:
          error.message ||
          "No se pudo guardar el producto. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: "Por favor, selecciona una imagen válida",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "La imagen no puede superar los 5MB",
          variant: "destructive",
        });
        return;
      }

      const previewUrl = URL.createObjectURL(file);

      setFormData((prev) => ({
        ...prev,
        imagen: previewUrl,
        imagenFile: file,
      }));
    }
  };

  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      imagen: "",
      imagenFile: null,
    }));
  };

  // ============================================
  // COMPONENTE PARA SELECCIONAR MÚLTIPLES UBICACIONES CON ACCIONES
  // ============================================

  const UbicacionMultiSelect = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const ubicacionesDisponibles = ubicacionesCompletas.filter(
      (u) => !(formData.ubicaciones || []).includes(u.idubicacion)
    );

    const filteredOptions = ubicacionesDisponibles.filter(
      (u) => u.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const addUbicacion = (ubicacion: typeof ubicacionesCompletas[0]) => {
      const current = formData.ubicaciones || [];
      handleInputChange("ubicaciones", [...current, ubicacion.idubicacion]);
      setSearchTerm("");
      setIsOpen(false);
    };

    const removeUbicacion = (id: number) => {
      const current = formData.ubicaciones || [];
      handleInputChange("ubicaciones", current.filter((u) => u !== id));
    };

    const getUbicacionNombre = (id: number) => {
      const ubicacion = ubicacionesCompletas.find((u) => u.idubicacion === id);
      return ubicacion ? ubicacion.nombre : `Ubicación ${id}`;
    };

    const handleEditUbicacionDesdeSelect = (nombre: string) => {
      setIsOpen(false);
      handleEditUbicacion(nombre);
    };

    const handleDeleteUbicacionDesdeSelect = async (nombre: string) => {
      setIsOpen(false);
      await handleDeleteUbicacion(nombre);
    };

    // Determinar si hay ubicaciones disponibles
    const tieneUbicaciones = ubicacionesCompletas.length > 0;

    return (
      <div className="space-y-1 w-full">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">
            Ubicaciones <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0"
              onClick={() => openAddDialog("ubicacion")}
              disabled={isAddingElement}
              title="Agregar ubicación"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="relative w-full">
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            placeholder="Buscar ubicaciones..."
            className="h-8 text-xs w-full pr-16"
          />
          {isOpen && filteredOptions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-28 overflow-y-auto">
              {filteredOptions.map((ubicacion) => (
                <div
                  key={ubicacion.idubicacion}
                  className="flex items-center justify-between px-2 py-1 hover:bg-accent"
                >
                  <button
                    type="button"
                    className="flex-1 text-left text-xs"
                    onMouseDown={() => addUbicacion(ubicacion)}
                  >
                    {ubicacion.nombre}
                  </button>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditUbicacionDesdeSelect(ubicacion.nombre);
                      }}
                      className="p-0.5 hover:text-blue-500 transition-colors"
                      title="Editar ubicación"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteUbicacionDesdeSelect(ubicacion.nombre);
                      }}
                      className="p-0.5 hover:text-red-500 transition-colors"
                      title="Eliminar ubicación"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {(formData.ubicaciones || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {(formData.ubicaciones || []).map((id) => {
              const ubicacion = ubicacionesCompletas.find(u => u.idubicacion === id);
              if (!ubicacion) return null;
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className="text-xs px-1.5 py-0 h-5 flex items-center gap-1"
                >
                  <span>{ubicacion.nombre}</span>
                  <button
                    type="button"
                    onClick={() => removeUbicacion(id)}
                    className="hover:text-destructive transition-colors ml-1"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}
        {/* Mensaje oculto con altura fija para evitar cambios de tamaño */}
        <div className="h-4">
          {!tieneUbicaciones && (
            <p className="text-[10px] text-amber-500">
              No hay ubicaciones registradas
            </p>
          )}
          {tieneUbicaciones && (
            <p className="text-[10px] text-muted-foreground">
              Selecciona una o más ubicaciones para este producto
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {showScanner && (
        <BarcodeScanner
          onScanSuccess={handleBarcodeScanned}
          onClose={() => {
            setShowScanner(false);
            window.history.back();
          }}
        />
      )}

      <form onSubmit={handleSubmit} className="w-full space-y-3">
        {/* Nombre */}
        <div className="space-y-1 w-full">
          <Label htmlFor="nombre" className="text-xs font-medium">
            Nombre <span className="text-red-500">*</span>
          </Label>
          <Input
            id="nombre"
            value={formData.nombre || ""}
            onChange={(e) => handleInputChange("nombre", e.target.value)}
            placeholder="Ej: Laptop HP Pavilion"
            className="h-8 text-xs w-full"
            required
          />
        </div>

        {/* Imagen */}
        <div className="flex justify-center py-2">
          <div className="relative">
            <div
              className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              onClick={() =>
                document.getElementById("image-upload-input")?.click()
              }
            >
              {formData.imagen ? (
                <img
                  src={formData.imagen}
                  className="w-full h-full object-cover"
                  alt="Producto"
                />
              ) : (
                <Camera className="w-7 h-7 text-gray-400" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-1 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
              <Camera className="w-3 h-3 text-white" />
              <input
                id="image-upload-input"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {formData.imagen && (
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 p-0.5 bg-destructive rounded-full hover:bg-destructive/90 transition-colors"
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Descripción */}
        <div className="space-y-1 w-full">
          <Label htmlFor="descripcion" className="text-xs font-medium">
            Descripción <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="descripcion"
            value={formData.descripcion || ""}
            onChange={(e) => handleInputChange("descripcion", e.target.value)}
            rows={2}
            placeholder="Describe tu producto..."
            className="text-xs resize-none h-12 w-full"
            required
          />
        </div>

        {/* Ubicaciones y Categorías en grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="w-full">
            <UbicacionMultiSelect />
          </div>

          <div className="w-full">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                Categorías <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openAddDialog("categoria")}
                  className="h-6 w-6 p-0"
                  disabled={isAddingElement}
                  title="Agregar categoría"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <SearchSelect
              options={localLists.categorias}
              selectedValues={formData.categorias || []}
              onSelectionChange={(values) =>
                handleInputChange("categorias", values)
              }
              placeholder="Buscar categorías..."
              label=""
              onEdit={handleEditCategoria}
              onDelete={handleDeleteCategoria}
              showActions={true}
              itemType="categoría"
            />
          </div>
        </div>

        {/* Precios en grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 w-full">
            <Label htmlFor="precioVenta" className="text-xs font-medium">
              Precio Venta (Bs) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="precioVenta"
              type="number"
              step="0.01"
              value={formData.precioVenta === "" ? "" : formData.precioVenta}
              onChange={(e) => {
                const value = e.target.value;
                handleInputChange("precioVenta", value === "" ? "" : Number(value));
              }}
              placeholder="0"
              className="h-8 text-xs number-input-no-scroll w-full"
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>

          <div className="space-y-1 w-full">
            <Label htmlFor="precioCompra" className="text-xs font-medium">
              Precio Compra (Bs)
            </Label>
            <Input
              id="precioCompra"
              type="number"
              step="0.01"
              value={formData.precioCompra === "" ? "" : formData.precioCompra}
              onChange={(e) => {
                const value = e.target.value;
                handleInputChange("precioCompra", value === "" ? "" : Number(value));
              }}
              placeholder="0"
              className="h-8 text-xs number-input-no-scroll w-full"
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>
        </div>

        {/* Stock y Stock Mínimo en grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 w-full">
            <Label className="text-xs font-medium">
              Stock <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.stock === "" ? "" : formData.stock}
              onChange={(e) => {
                const value = e.target.value;
                handleInputChange("stock", value === "" ? "" : Number(value));
              }}
              placeholder="0"
              min="0"
              className="h-8 text-xs number-input-no-scroll w-full"
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>

          <div className="space-y-1 w-full">
            <Label className="text-xs font-medium">Stock Mínimo</Label>
            <Input
              type="number"
              value={formData.stockMinimo === "" ? "" : formData.stockMinimo}
              onChange={(e) => {
                const value = e.target.value;
                handleInputChange("stockMinimo", value === "" ? "" : Number(value));
              }}
              placeholder="0"
              min="0"
              className="h-8 text-xs number-input-no-scroll w-full"
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>
        </div>

        {/* Código de Barras */}
        <div className="space-y-1 w-full">
          <Label htmlFor="codigoBarras" className="text-xs font-medium">
            Código de Barras
          </Label>
          <div className="relative w-full">
            <Input
              id="codigoBarras"
              value={formData.codigoBarras || ""}
              onChange={(e) => handleInputChange("codigoBarras", e.target.value)}
              placeholder="Escanea o escribe el código"
              className="h-8 text-xs w-full"
            />
            {isMobile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openScanner}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <Camera className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Productos Similares */}
        <div className="w-full">
          <ProductoSimilarSelect
            productosDisponibles={todosProductos}
            selectedValues={formData.productosSimilares || []}
            onSelectionChange={(values) =>
              handleInputChange("productosSimilares", values)
            }
            currentProductId={formData.id ? parseInt(formData.id) : undefined}
          />
          {/* Mensaje de carga con altura fija */}
          <div className="h-4">
            {loadingProductos && (
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Cargando productos...
              </div>
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-8 text-xs w-full sm:w-auto"
            disabled={isSubmittingProduct || isAddingElement}
          >
            Cancelar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                className="bg-primary hover:bg-primary/90 h-8 text-xs w-full sm:w-auto"
                disabled={isSubmittingProduct || isAddingElement}
              >
                {isSubmittingProduct ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    {product ? "Actualizando..." : "Agregando..."}
                  </>
                ) : product ? (
                  "Actualizar"
                ) : (
                  "Agregar"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Acción</AlertDialogTitle>
                <AlertDialogDescription>
                  {product
                    ? `¿Estás seguro de actualizar "${formData.nombre}"?`
                    : `¿Estás seguro de agregar "${formData.nombre}"?`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmittingProduct}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSubmit}
                  disabled={isSubmittingProduct}
                >
                  {isSubmittingProduct ? "Procesando..." : "Confirmar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </form>

      {/* Dialog para crear/editar elementos */}
      <Dialog
        open={addDialogState.open}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogState({ open: false, type: null, mode: "create", editId: null, editName: "" });
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {addDialogState.mode === "edit" ? "Editar" : "Agregar"}{" "}
              {addDialogState.type === "categoria"
                ? "Categoría"
                : addDialogState.type === "ubicacion"
                ? "Ubicación"
                : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nombre <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder={`Ej: ${addDialogState.type === "categoria" ? "Electrónicos" : "Pasillo A"}`}
                value={editDialogData.name}
                onChange={(e) => setEditDialogData({ ...editDialogData, name: e.target.value })}
                autoFocus
                className="w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editDialogData.name.trim()) {
                    handleAddNewElement(editDialogData.name);
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogState({ open: false, type: null, mode: "create", editId: null, editName: "" });
                setEditDialogData({ name: "", id: 0 });
              }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editDialogData.name.trim()) {
                  handleAddNewElement(editDialogData.name.trim());
                }
              }}
              className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
              disabled={!editDialogData.name.trim() || isAddingElement}
            >
              {isAddingElement ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {addDialogState.mode === "edit" ? "Actualizando..." : "Creando..."}
                </>
              ) : addDialogState.mode === "edit" ? (
                "Actualizar"
              ) : (
                "Crear"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}