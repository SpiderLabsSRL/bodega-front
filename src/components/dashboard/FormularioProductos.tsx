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
import { Badge } from "@/components/ui/badge";
import { Plus, X, Search, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { AddItemDialog } from "./AddItemDialog";
import BarcodeScanner from "./BarcodeScanner";
import {
  createUbicacion,
  createCategoria,
  getUbicaciones,
  getCategorias,
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
}

interface AddDialogState {
  open: boolean;
  type: "categoria" | "ubicacion" | null;
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
}

const SearchSelect = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder,
  label,
  required,
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
    <div className="space-y-1">
      <Label className="text-xs">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Input
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          className="h-8 text-xs"
        />
        {isOpen && filteredOptions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-28 overflow-y-auto">
            {filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                className="w-full text-left px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                onMouseDown={() => addSelection(option)}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1">
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
    <div className="space-y-1">
      <Label className="text-xs">Productos Similares</Label>
      <div className="relative">
        <Input
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder="Buscar productos similares..."
          className="h-8 text-xs pl-7"
        />
        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
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
        <div className="flex flex-wrap gap-1">
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
}: FormularioProductosProps) {
  const [formData, setFormData] = useState<ProductFormData>(() => {
    if (!product) {
      return {
        nombre: "",
        categorias: [],
        descripcion: "",
        ubicacion: "",
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

    return {
      id: product.idproducto?.toString() || product.id?.toString(),
      nombre: product.nombre || "",
      categorias: categoriasArray,
      descripcion: product.descripcion || "",
      ubicacion: product.ubicacion || "",
      precioVenta: product.precio_venta?.toString() || product.precio?.toString() || "",
      precioCompra: product.precio_compra?.toString() || "",
      stock: product.stock?.toString() || "",
      stockMinimo: product.stock_minimo?.toString() || "",
      imagen: product.imagen || "",
      imagenFile: product.imagen ? base64ToFile(product.imagen, "producto.jpg") : null,
      codigoBarras: product.codigo_barras || product.codigo || "",
      productosSimilares: product.productos_similares?.map((p: any) => p.idproducto) || [],
      productosSimilaresData: product.productos_similares || [],
      idbodega: product.idbodega || idbodega || 1,
    };
  });

  const [addDialogState, setAddDialogState] = useState<AddDialogState>({
    open: false,
    type: null,
  });
  const [todosProductos, setTodosProductos] = useState<ProductoSelect[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Estado local para ubicaciones y categorías
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

  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Actualizar listas locales cuando cambian las props
  useEffect(() => {
    setLocalLists({
      ubicaciones: ubicacionesProp || [],
      categorias: categoriasProp || [],
    });
  }, [ubicacionesProp, categoriasProp]);

  // Actualizar el formulario cuando cambia el producto
  useEffect(() => {
    if (!product) {
      setFormData({
        nombre: "",
        categorias: [],
        descripcion: "",
        ubicacion: "",
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
      });
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

    setFormData({
      id: product.idproducto?.toString() || product.id?.toString(),
      nombre: product.nombre || "",
      categorias: categoriasArray,
      descripcion: product.descripcion || "",
      ubicacion: product.ubicacion || "",
      precioVenta: product.precio_venta?.toString() || product.precio?.toString() || "",
      precioCompra: product.precio_compra?.toString() || "",
      stock: product.stock?.toString() || "",
      stockMinimo: product.stock_minimo?.toString() || "",
      imagen: product.imagen || "",
      imagenFile: product.imagen ? base64ToFile(product.imagen, "producto.jpg") : null,
      codigoBarras: product.codigo_barras || product.codigo || "",
      productosSimilares: product.productos_similares?.map((p: any) => p.idproducto) || [],
      productosSimilaresData: product.productos_similares || [],
      idbodega: product.idbodega || idbodega || 1,
    });
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

  // Cargar elementos de gestión iniciales
  useEffect(() => {
    const loadManagementItems = async () => {
      try {
        const [ubicacionesData, categoriasData] = await Promise.all([
          getUbicaciones(),
          getCategorias(),
        ]);

        const ubicacionesNombres = ubicacionesData.map((item) => item.nombre);
        const categoriasNombres = categoriasData.map((item) => item.nombre);

        setManagementItems({
          ubicaciones: ubicacionesData,
          categorias: categoriasData,
        });

        setLocalLists({
          ubicaciones: ubicacionesNombres,
          categorias: categoriasNombres,
        });
      } catch (error) {
        console.error("Error cargando elementos de gestión:", error);
      }
    };

    loadManagementItems();
  }, []);

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

  // Función para actualizar las listas después de agregar un nuevo elemento
  const updateLocalLists = async (type: string) => {
    try {
      let ubicacionesData: ManagementItem[] = [];
      let categoriasData: ManagementItem[] = [];

      if (type === "ubicacion" || type === "all") {
        ubicacionesData = await getUbicaciones();
        const ubicacionesNombres = ubicacionesData.map((item) => item.nombre);
        setManagementItems((prev) => ({ ...prev, ubicaciones: ubicacionesData }));
        setLocalLists((prev) => ({
          ...prev,
          ubicaciones: ubicacionesNombres,
        }));
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

      // Llamar a onRefreshData si existe para actualizar también en el padre
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (error) {
      console.error(`Error actualizando listas:`, error);
    }
  };

  const handleAddNewElement = async (name: string) => {
    if (isAddingElement) return;

    const type = addDialogState.type;
    if (!type) return;

    setIsAddingElement(true);

    try {
      switch (type) {
        case "categoria":
          await createCategoria({ nombre: name });
          break;
        case "ubicacion":
          await createUbicacion({ nombre: name });
          break;
      }

      // Actualizar las listas inmediatamente después de crear
      await updateLocalLists(type);

      // Si se creó una ubicación, seleccionarla automáticamente
      if (type === "ubicacion") {
        handleInputChange("ubicacion", name);
      }

      toast({
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} agregado`,
        description: `El ${type} "${name}" ha sido agregado exitosamente.`,
      });

      setAddDialogState({ open: false, type: null });
    } catch (error) {
      console.error(`Error agregando ${type}:`, error);
      toast({
        title: "Error",
        description: `No se pudo agregar el ${type}`,
        variant: "destructive",
      });
    } finally {
      setIsAddingElement(false);
    }
  };

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

    if (!formData.ubicacion) {
      toast({
        title: "Error",
        description: "La ubicación es obligatoria",
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
      const idubicacion = getItemIdByName(
        managementItems.ubicaciones,
        formData.ubicacion,
      );

      if (idubicacion === 0) {
        toast({
          title: "Error",
          description: "La ubicación seleccionada no es válida",
          variant: "destructive",
        });
        setIsSubmittingProduct(false);
        return;
      }

      const descripcionFormateada = formatDescriptionForProduction(
        formData.descripcion,
      );

      const formDataToSend = new FormData();

      formDataToSend.append("nombre", formData.nombre);
      formDataToSend.append("descripcion", descripcionFormateada);
      formDataToSend.append("idubicacion", idubicacion.toString());
      
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

      const bodegaId = formData.idbodega || idbodega || 1;
      formDataToSend.append("idbodega", bodegaId.toString());

      if (formData.codigoBarras && formData.codigoBarras.trim() !== "") {
        formDataToSend.append("codigo_barras", formData.codigoBarras.trim());
      }

      if (formData.productosSimilares && formData.productosSimilares.length > 0) {
        formDataToSend.append(
          "productos_similares",
          JSON.stringify(formData.productosSimilares),
        );
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
        idubicacion: idubicacion,
        categorias: categoriasIds,
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

  const openAddDialog = (type: "categoria" | "ubicacion") => {
    setAddDialogState({ open: true, type });
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

      <form onSubmit={handleSubmit} className="w-full space-y-2">
        <div className="space-y-1">
          <Label htmlFor="nombre" className="text-xs font-medium">
            Nombre <span className="text-red-500">*</span>
          </Label>
          <Input
            id="nombre"
            value={formData.nombre || ""}
            onChange={(e) => handleInputChange("nombre", e.target.value)}
            placeholder="Ej: Laptop HP Pavilion"
            className="h-8 text-xs"
            required
          />
        </div>

        <div className="flex justify-center py-1">
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

        <div className="space-y-1">
          <Label htmlFor="descripcion" className="text-xs font-medium">
            Descripción <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="descripcion"
            value={formData.descripcion || ""}
            onChange={(e) => handleInputChange("descripcion", e.target.value)}
            rows={2}
            placeholder="Describe tu producto..."
            className="text-xs resize-none h-12"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="ubicacion" className="text-xs font-medium">
                Ubicación <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 w-6 p-0"
                onClick={() => openAddDialog("ubicacion")}
                disabled={isAddingElement}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <select
              value={formData.ubicacion || ""}
              onChange={(e) => handleInputChange("ubicacion", e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
              required
            >
              <option value="">Seleccionar</option>
              {localLists.ubicaciones.map((ubicacion) => (
                <option key={ubicacion} value={ubicacion}>
                  {ubicacion}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                Categorías <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openAddDialog("categoria")}
                className="h-6 w-6 p-0"
                disabled={isAddingElement}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <SearchSelect
              options={localLists.categorias}
              selectedValues={formData.categorias || []}
              onSelectionChange={(values) =>
                handleInputChange("categorias", values)
              }
              placeholder="Buscar categorías..."
              label=""
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
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
              className="h-8 text-xs number-input-no-scroll"
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>

          <div className="space-y-1">
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
              className="h-8 text-xs number-input-no-scroll"
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
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
              className="h-8 text-xs number-input-no-scroll"
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>

          <div className="space-y-1">
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
              className="h-8 text-xs number-input-no-scroll"
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="codigoBarras" className="text-xs font-medium">
            Código de Barras
          </Label>
          <div className="relative">
            <Input
              id="codigoBarras"
              value={formData.codigoBarras || ""}
              onChange={(e) => handleInputChange("codigoBarras", e.target.value)}
              placeholder="Escanea o escribe el código"
              className="h-8 text-xs"
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

        <div className="space-y-1">
          <ProductoSimilarSelect
            productosDisponibles={todosProductos}
            selectedValues={formData.productosSimilares || []}
            onSelectionChange={(values) =>
              handleInputChange("productosSimilares", values)
            }
            currentProductId={formData.id ? parseInt(formData.id) : undefined}
          />
          {loadingProductos && (
            <div className="text-xs text-muted-foreground">
              Cargando productos...
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-8 text-xs"
            disabled={isSubmittingProduct || isAddingElement}
          >
            Cancelar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                className="bg-primary hover:bg-primary/90 h-8 text-xs"
                disabled={isSubmittingProduct || isAddingElement}
              >
                {isSubmittingProduct ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5"></div>
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

      <AddItemDialog
        open={addDialogState.open}
        onOpenChange={(open) => setAddDialogState({ open, type: null })}
        title={`Agregar ${
          addDialogState.type === "categoria"
            ? "Categoría"
            : addDialogState.type === "ubicacion"
              ? "Ubicación"
              : ""
        }`}
        itemType={
          addDialogState.type === "categoria"
            ? "categorías"
            : addDialogState.type === "ubicacion"
              ? "ubicaciones"
              : ""
        }
        onAdd={handleAddNewElement}
      />
    </>
  );
}