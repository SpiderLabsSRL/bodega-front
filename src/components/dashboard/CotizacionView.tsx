import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Plus, Minus, Trash2, FileText, History, User, UserPlus, X, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { CotizacionItemPDF, DatosClientePDF } from "./CotizacionPDF";
import { downloadCotizacionAsPDF } from "./cotizacionPdfUtils";
import { createCotizacion, getCotizacionById, deleteCotizacion, searchCotizaciones, CotizacionRequest } from "@/api/CotizacionApi";
import { Product, searchProducts, searchClientes, type ClienteSearchResult } from "@/api/SalesApi";
import { createCliente } from "@/api/clientesApi";
import { useIsMobile } from "@/hooks/use-mobile";
import { getImageUrl } from "./VenderView";

const WhatsappIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893c0-3.189-1.248-6.189-3.515-8.464" />
  </svg>
);

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface CotizacionItem extends Product {
  cantidad: number;
  uniqueId: string;
  imagenUrl?: string;
}

interface DatosCliente {
  nombre: string;
  telefono: string;
  direccion: string;
  tipoPago: "contra-entrega" | "pago-adelantado" | "mitad-adelanto" | "";
  vigencia: 5 | 10 | 15 | 30 | 0;
  descuento: number;
}

interface CotizacionExistente {
  idcotizacion: number;
  cliente_nombre: string;
  cliente_telefono: string;
  fecha_creacion: string;
  total: number;
}

interface AlertState {
  show: boolean;
  title: string;
  message: string;
}

interface ClienteFormData {
  nombres: string;
  apellidos: string;
  carnet: string;
  celular: string;
  nota: string;
}

const formatBs = (value: number) => {
  const v = Math.abs(value) < 0.005 ? 0 : value;
  return v.toFixed(2);
};

// Función para filtrar productos duplicados
const filterUniqueProducts = (products: Product[]): Product[] => {
  const seen = new Set<number>();
  return products.filter(product => {
    if (seen.has(product.idproducto)) {
      return false;
    }
    seen.add(product.idproducto);
    return true;
  });
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error en CotizacionView:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <h2 className="text-lg font-semibold text-red-600">Algo salió mal</h2>
          <p className="text-gray-600 mt-2">Por favor, recarga la página</p>
          <Button onClick={() => window.location.reload()} className="mt-4">Recargar Página</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function CotizacionView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cotizacionItems, setCotizacionItems] = useState<CotizacionItem[]>([]);
  const [datosCliente, setDatosCliente] = useState<DatosCliente>({
    nombre: "",
    telefono: "",
    direccion: "",
    tipoPago: "",
    vigencia: 0,
    descuento: 0
  });
  const [cotizacionGenerada, setCotizacionGenerada] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cotizacionesExistentes, setCotizacionesExistentes] = useState<CotizacionExistente[]>([]);
  const [searchCotizacionQuery, setSearchCotizacionQuery] = useState("");
  const [showCotizacionesDialog, setShowCotizacionesDialog] = useState(false);
  const [loadingCotizaciones, setLoadingCotizaciones] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ show: false, title: "", message: "" });
  
  // Estados para clientes
  const [clienteSearchTerm, setClienteSearchTerm] = useState("");
  const [clienteSearchResults, setClienteSearchResults] = useState<ClienteSearchResult[]>([]);
  const [searchingClientes, setSearchingClientes] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteSearchResult | null>(null);
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [clienteFormData, setClienteFormData] = useState<ClienteFormData>({
    nombres: "",
    apellidos: "",
    carnet: "",
    celular: "",
    nota: "",
  });
  const [submittingCliente, setSubmittingCliente] = useState(false);
  const [showClienteNota, setShowClienteNota] = useState(false);
  const [clienteManual, setClienteManual] = useState(false);
  
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastSearchQueryRef = useRef<string>("");
  const isSearchingRef = useRef<boolean>(false);
  const itemCounterRef = useRef(0);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const debouncedCotizacionSearchQuery = useDebounce(searchCotizacionQuery, 500);
  const debouncedClienteSearch = useDebounce(clienteSearchTerm, 500);

  useEffect(() => {
    if (debouncedSearchQuery.trim().length >= 2 && debouncedSearchQuery !== lastSearchQueryRef.current) {
      lastSearchQueryRef.current = debouncedSearchQuery;
      performSearch(debouncedSearchQuery);
    } else if (debouncedSearchQuery.trim().length < 2) {
      setSearchResults([]);
      lastSearchQueryRef.current = "";
    }
  }, [debouncedSearchQuery]);

  useEffect(() => {
    if (showCotizacionesDialog && debouncedCotizacionSearchQuery.trim().length > 0) {
      buscarCotizacionesPorCliente(debouncedCotizacionSearchQuery);
    } else if (showCotizacionesDialog && debouncedCotizacionSearchQuery.trim().length === 0) {
      setCotizacionesExistentes([]);
    }
  }, [debouncedCotizacionSearchQuery, showCotizacionesDialog]);

  useEffect(() => {
    if (debouncedClienteSearch.trim().length >= 2) {
      searchClientesBackend(debouncedClienteSearch);
    } else {
      setClienteSearchResults([]);
    }
  }, [debouncedClienteSearch]);

  const searchClientesBackend = async (term: string) => {
    try {
      setSearchingClientes(true);
      const results = await searchClientes(term);
      setClienteSearchResults(results);
    } catch (error) {
      console.error("Error searching clients:", error);
      setClienteSearchResults([]);
    } finally {
      setSearchingClientes(false);
    }
  };

  const generateUniqueId = () => {
    itemCounterRef.current += 1;
    return `item-${Date.now()}-${itemCounterRef.current}`;
  };

  const getProductImageUrl = (imagen?: string): string => {
    if (!imagen) return "";
    return getImageUrl(imagen);
  };

  const performSearch = async (query: string) => {
    if (isSearchingRef.current) return;

    isSearchingRef.current = true;
    setLoading(true);

    try {
      const results = await searchProducts(query, false);
      // Filtrar duplicados
      const uniqueResults = filterUniqueProducts(results);
      setSearchResults(uniqueResults);

      setTimeout(() => {
        if (searchInputRef.current) {
          const currentPosition = searchInputRef.current.selectionStart;
          searchInputRef.current.focus();
          if (currentPosition) {
            searchInputRef.current.setSelectionRange(currentPosition, currentPosition);
          }
        }
      }, 10);

    } catch (error) {
      console.error("Error searching products:", error);
      toast({ title: "Error", description: "No se pudieron buscar los productos", variant: "destructive" });
      setSearchResults([]);
    } finally {
      setLoading(false);
      isSearchingRef.current = false;
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchInputRef.current) {
      const currentPosition = e.target.selectionStart;
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          if (currentPosition !== null) {
            searchInputRef.current.setSelectionRange(currentPosition, currentPosition);
          }
        }
      }, 0);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const agregarProducto = useCallback((product: Product) => {
    const nuevoItem: CotizacionItem = {
      ...product,
      cantidad: 1,
      uniqueId: generateUniqueId(),
      imagenUrl: getProductImageUrl(product.imagen)
    };

    setCotizacionItems(prevItems => {
      const existingIndex = prevItems.findIndex(item => item.idproducto === product.idproducto);
      if (existingIndex !== -1) {
        const newItems = [...prevItems];
        newItems[existingIndex].cantidad += 1;
        return newItems;
      } else {
        return [...prevItems, nuevoItem];
      }
    });

    setSearchQuery("");
    setSearchResults([]);

    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    }, 50);

    toast({ title: "Producto agregado", description: `${product.nombre} agregado a la cotización` });
  }, [toast]);

  // Función para actualizar cantidad desde el input manual
  const actualizarCantidad = useCallback((uniqueId: string, nuevaCantidad: number) => {
    if (nuevaCantidad < 0) return;
    
    setCotizacionItems(prevItems =>
      prevItems.map(item => 
        item.uniqueId === uniqueId ? { ...item, cantidad: nuevaCantidad } : item
      )
    );
  }, []);

  // Función para manejar cambio en input de cantidad
  const handleCantidadInputChange = useCallback((uniqueId: string, value: string) => {
    if (value === "") {
      setCotizacionItems(prevItems =>
        prevItems.map(item => 
          item.uniqueId === uniqueId ? { ...item, cantidad: 0 } : item
        )
      );
      return;
    }

    const numericValue = parseInt(value);
    if (isNaN(numericValue) || numericValue < 0) {
      return;
    }

    setCotizacionItems(prevItems =>
      prevItems.map(item => 
        item.uniqueId === uniqueId ? { ...item, cantidad: numericValue } : item
      )
    );
  }, []);

  // Función para manejar blur en input de cantidad
  const handleCantidadInputBlur = useCallback((uniqueId: string, value: string) => {
    if (value === "" || parseInt(value) === 0) {
      // Si el valor es 0 o vacío, eliminamos el item
      setCotizacionItems(prevItems => 
        prevItems.filter(item => item.uniqueId !== uniqueId)
      );
    }
  }, []);

  const eliminarItem = useCallback((uniqueId: string) => {
    setCotizacionItems(prevItems => prevItems.filter(item => item.uniqueId !== uniqueId));
  }, []);

  const tieneItemsInvalidos = cotizacionItems.some(item => item.cantidad < 1);
  const subtotal = cotizacionItems.reduce((total, item) => total + (item.precio_venta * item.cantidad), 0);
  const descuentoTotal = datosCliente.descuento;
  const totalFinal = Math.max(0, subtotal - descuentoTotal);
  const abono = 0;
  const saldo = totalFinal;

  // Función para seleccionar un cliente de la búsqueda
  const seleccionarCliente = (cliente: ClienteSearchResult) => {
    setSelectedCliente(cliente);
    setDatosCliente(prev => ({
      ...prev,
      nombre: `${cliente.nombres} ${cliente.apellidos}`,
      telefono: cliente.celular,
    }));
    setClienteSearchTerm("");
    setClienteSearchResults([]);
    setShowClienteNota(false);
    setClienteManual(false);
  };

  // Función para limpiar el cliente seleccionado
  const limpiarCliente = () => {
    setSelectedCliente(null);
    setDatosCliente(prev => ({
      ...prev,
      nombre: "",
      telefono: "",
    }));
    setClienteSearchTerm("");
    setClienteSearchResults([]);
    setShowClienteNota(false);
    setClienteManual(false);
  };

  // Función para alternar la nota del cliente
  const toggleClienteNota = () => {
    setShowClienteNota(!showClienteNota);
  };

  // Función para cuando el usuario escribe manualmente el nombre
  const handleNombreManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDatosCliente(prev => ({ ...prev, nombre: value }));
    setClienteManual(true);
    // Si había un cliente seleccionado y el nombre cambia, lo deseleccionamos
    if (selectedCliente) {
      setSelectedCliente(null);
      setShowClienteNota(false);
    }
  };

  const handleTelefonoManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDatosCliente(prev => ({ ...prev, telefono: value }));
    setClienteManual(true);
    if (selectedCliente) {
      setSelectedCliente(null);
      setShowClienteNota(false);
    }
  };

  // Validación del formulario de cliente
  const validateClienteForm = (): boolean => {
    if (!clienteFormData.nombres.trim()) {
      toast({ title: "Error", description: "Los nombres son obligatorios", variant: "destructive" });
      return false;
    }
    if (!clienteFormData.apellidos.trim()) {
      toast({ title: "Error", description: "Los apellidos son obligatorios", variant: "destructive" });
      return false;
    }
    if (!clienteFormData.carnet.trim()) {
      toast({ title: "Error", description: "El carnet es obligatorio", variant: "destructive" });
      return false;
    }
    if (clienteFormData.carnet.trim().length < 5 || clienteFormData.carnet.trim().length > 13) {
      toast({ title: "Error", description: "El carnet debe tener entre 5 y 13 caracteres", variant: "destructive" });
      return false;
    }
    if (!clienteFormData.celular.trim()) {
      toast({ title: "Error", description: "El celular es obligatorio", variant: "destructive" });
      return false;
    }
    const celularRegex = /^[0-9+]{6,12}$/;
    if (!celularRegex.test(clienteFormData.celular.trim())) {
      toast({ title: "Error", description: "El celular debe tener entre 6 y 12 caracteres (solo números y el signo +)", variant: "destructive" });
      return false;
    }
    return true;
  };

  // Crear cliente desde el formulario
  const handleCreateCliente = async () => {
    if (!validateClienteForm()) return;

    try {
      setSubmittingCliente(true);
      const newCliente = await createCliente({
        nombres: clienteFormData.nombres.trim(),
        apellidos: clienteFormData.apellidos.trim(),
        carnet: clienteFormData.carnet.trim(),
        celular: clienteFormData.celular.trim(),
        nota: clienteFormData.nota.trim() || undefined,
      });
      
      const newClienteResult: ClienteSearchResult = {
        id: newCliente.id,
        nombres: newCliente.nombres,
        apellidos: newCliente.apellidos,
        carnet: newCliente.carnet,
        celular: newCliente.celular,
        nota: newCliente.nota,
        estado: newCliente.estado,
      };
      
      seleccionarCliente(newClienteResult);
      setShowClienteForm(false);
      setClienteFormData({
        nombres: "",
        apellidos: "",
        carnet: "",
        celular: "",
        nota: "",
      });
      
      toast({
        title: "Cliente creado",
        description: `${newCliente.nombres} ${newCliente.apellidos} ha sido agregado.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear el cliente",
        variant: "destructive",
      });
    } finally {
      setSubmittingCliente(false);
    }
  };

  const handleDownloadPDF = async () => {
    const itemsPDF: CotizacionItemPDF[] = cotizacionItems.map(item => ({
      id: item.idproducto.toString(),
      name: item.nombre,
      price: item.precio_venta,
      cantidad: item.cantidad,
      stock: item.stock,
      imagen: item.imagenUrl || getProductImageUrl(item.imagen)
    }));

    const datosClientePDF: DatosClientePDF = {
      nombre: datosCliente.nombre,
      telefono: datosCliente.telefono,
      direccion: datosCliente.direccion,
      tipoPago: datosCliente.tipoPago as "contra-entrega" | "pago-adelantado" | "mitad-adelanto",
      vigencia: datosCliente.vigencia,
      descuento: datosCliente.descuento
    };

    await downloadCotizacionAsPDF({
      datosCliente: datosClientePDF,
      items: itemsPDF,
      subtotal,
      descuentoTotal,
      totalFinal,
      fecha: new Date().toLocaleDateString("es-BO"),
      logoUrl: "/lovable-uploads/84af3e7f-9171-4c73-900f-9499a9673234.png",
      fileName: `Cotizacion_${(datosCliente.nombre || "cliente").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
    });
  };

  const generarCotizacion = async () => {
    if (cotizacionItems.length === 0) {
      toast({ title: "Error", description: "Debe agregar al menos un producto", variant: "destructive" });
      return;
    }

    if (tieneItemsInvalidos) {
      toast({ title: "Error", description: "Todos los productos deben tener al menos 1 unidad", variant: "destructive" });
      return;
    }

    const requiredFields = [datosCliente.nombre, datosCliente.telefono, datosCliente.tipoPago];
    if (datosCliente.tipoPago !== "pago-adelantado") {
      requiredFields.push(datosCliente.vigencia.toString());
    }

    if (requiredFields.some(field => !field)) {
      toast({ title: "Error", description: datosCliente.tipoPago === "pago-adelantado" ? "Debe completar nombre, teléfono y tipo de pago" : "Debe completar nombre, teléfono, tipo de pago y vigencia", variant: "destructive" });
      return;
    }

    // Si el cliente es manual (no seleccionado de la BD), solo generamos la cotización sin guardar
    if (clienteManual && !selectedCliente) {
      toast({ title: "Cotización generada", description: "La cotización ha sido generada exitosamente (cliente no registrado)" });
      setCotizacionGenerada(true);
      return;
    }

    // Si el cliente está registrado, guardamos la cotización
    try {
      setLoading(true);
      let tipoPagoBackend: "Pago por Adelantado" | "Mitad de Pago" | "Contra Entrega";
      if (datosCliente.tipoPago === "pago-adelantado") {
        tipoPagoBackend = "Pago por Adelantado";
      } else if (datosCliente.tipoPago === "mitad-adelanto") {
        tipoPagoBackend = "Mitad de Pago";
      } else {
        tipoPagoBackend = "Contra Entrega";
      }

      const cotizacionRequest: CotizacionRequest = {
        vigencia: datosCliente.vigencia.toString(),
        cliente_nombre: datosCliente.nombre,
        cliente_telefono: datosCliente.telefono,
        cliente_direccion: datosCliente.direccion || '',
        tipo_pago: tipoPagoBackend,
        sub_total: subtotal,
        descuento: descuentoTotal,
        total: totalFinal,
        abono: 0,
        saldo: totalFinal,
        items: cotizacionItems.map(item => ({ 
          idproducto: item.idproducto, 
          cantidad: item.cantidad, 
          precio_unitario: item.precio_venta, 
          subtotal_linea: item.precio_venta * item.cantidad 
        })),
        ...(selectedCliente ? {
          carnet: selectedCliente.carnet || '',
          cliente_nota: selectedCliente.nota || '',
        } : {})
      };

      await createCotizacion(cotizacionRequest);

      let mensajeAlerta = "";
      if (datosCliente.tipoPago === "pago-adelantado") {
        mensajeAlerta = "Recuerde registrar el PAGO COMPLETO y los PRODUCTOS ENTREGADOS en la sección de Pagos Pendientes";
      } else if (datosCliente.tipoPago === "mitad-adelanto") {
        mensajeAlerta = "Recuerde registrar el PAGO PARCIAL y los PRODUCTOS ENTREGADOS en la sección de Pagos Pendientes";
      }

      toast({ title: "Cotización guardada", description: "La cotización ha sido guardada" });

      if (datosCliente.tipoPago === "pago-adelantado" || datosCliente.tipoPago === "mitad-adelanto") {
        setAlert({ show: true, title: "⚠️ IMPORTANTE", message: mensajeAlerta });
      }

    } catch (error) {
      console.error("Error saving quotation:", error);
      toast({ title: "Error", description: "No se pudo guardar la cotización", variant: "destructive" });
      return;
    } finally {
      setLoading(false);
    }

    setCotizacionGenerada(true);
  };

  const nuevaCotizacion = useCallback(() => {
    setCotizacionItems([]);
    setDatosCliente({ nombre: "", telefono: "", direccion: "", tipoPago: "", vigencia: 0, descuento: 0 });
    setCotizacionGenerada(false);
    setSelectedCliente(null);
    setClienteManual(false);
    setShowClienteNota(false);
    setTimeout(() => { if (searchInputRef.current) searchInputRef.current.focus(); }, 100);
  }, []);

  const buscarCotizacionesPorCliente = async (query?: string) => {
    const searchTerm = query || searchCotizacionQuery;
    if (!searchTerm.trim()) {
      setCotizacionesExistentes([]);
      return;
    }

    setLoadingCotizaciones(true);
    try {
      const cotizaciones = await searchCotizaciones(searchTerm);
      const cotizacionesFiltradas = cotizaciones.map(cot => ({ idcotizacion: cot.idcotizacion, cliente_nombre: cot.cliente_nombre, cliente_telefono: cot.cliente_telefono, fecha_creacion: cot.fecha_creacion, total: cot.total }));
      setCotizacionesExistentes(cotizacionesFiltradas);
    } catch (error) {
      console.error("Error searching quotations:", error);
      setCotizacionesExistentes([]);
      toast({ title: "Error", description: "No se pudieron buscar las cotizaciones", variant: "destructive" });
    } finally {
      setLoadingCotizaciones(false);
    }
  };

  const cargarCotizacionExistente = async (idcotizacion: number) => {
    setLoading(true);
    try {
      const { cotizacion, detalles } = await getCotizacionById(idcotizacion);
      const items: CotizacionItem[] = detalles.map(detalle => ({ 
        ...detalle,
        idproducto: detalle.idproducto,
        nombre: detalle.producto_nombre || '',
        precio_venta: detalle.precio_unitario,
        precio_compra: 0,
        stock: 0,
        stock_minimo: 0,
        estado: 0,
        idubicacion: 0,
        nombre_ubicacion: '',
        imagen: '',
        descripcion: "",
        cantidad: detalle.cantidad,
        uniqueId: generateUniqueId(),
        imagenUrl: '' 
      }));

      let tipoPagoFrontend: "contra-entrega" | "pago-adelantado" | "mitad-adelanto" | "" = "";
      if (cotizacion.tipo_pago === "Pago por Adelantado") tipoPagoFrontend = "pago-adelantado";
      else if (cotizacion.tipo_pago === "Mitad de Pago") tipoPagoFrontend = "mitad-adelanto";
      else if (cotizacion.tipo_pago === "Contra Entrega") tipoPagoFrontend = "contra-entrega";

      setCotizacionItems(items);
      setDatosCliente({ 
        nombre: cotizacion.cliente_nombre, 
        telefono: cotizacion.cliente_telefono, 
        direccion: cotizacion.cliente_direccion, 
        tipoPago: tipoPagoFrontend, 
        vigencia: parseInt(cotizacion.vigencia) as 5 | 10 | 15 | 30 | 0, 
        descuento: cotizacion.descuento 
      });
      setCotizacionGenerada(true);
      setShowCotizacionesDialog(false);
      setSearchCotizacionQuery("");
      toast({ title: "Cotización cargada", description: `Se cargó la cotización de ${cotizacion.cliente_nombre}` });
    } catch (error) {
      console.error("Error loading quotation:", error);
      toast({ title: "Error", description: "No se pudo cargar la cotización", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const eliminarCotizacion = async (idcotizacion: number, nombreCliente: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar la cotización de ${nombreCliente}?`)) return;
    try {
      await deleteCotizacion(idcotizacion);
      setCotizacionesExistentes(prev => prev.filter(cot => cot.idcotizacion !== idcotizacion));
      toast({ title: "Cotización eliminada", description: "La cotización ha sido eliminada correctamente" });
    } catch (error) {
      console.error("Error deleting quotation:", error);
      toast({ title: "Error", description: "No se pudo eliminar la cotización", variant: "destructive" });
    }
  };

  const AlertModal = () => {
    if (!alert.show) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 font-bold text-lg">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
          </div>
          <p className="text-gray-700 mb-6">{alert.message}</p>
          <div className="flex justify-end">
            <Button onClick={() => setAlert({ show: false, title: "", message: "" })} className="bg-blue-600 hover:bg-blue-700 text-white">Aceptar</Button>
          </div>
        </div>
      </div>
    );
  };

  if (cotizacionGenerada) {
    const fechaHoy = new Date().toLocaleDateString('es-BO');
    const fechaVigencia = new Date();
    fechaVigencia.setDate(fechaVigencia.getDate() + datosCliente.vigencia);

    return (
      <ErrorBoundary>
        <div className="space-y-6 p-4">
          <AlertModal />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><FileText className="h-6 w-6" />Cotización Generada</h1>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button onClick={handleDownloadPDF} className="bg-green-600 text-white flex items-center gap-2 w-full sm:w-auto justify-center"><FileText className="h-4 w-4" />Descargar PDF</Button>
              <Button onClick={nuevaCotizacion} variant="outline" className="w-full sm:w-auto">Nueva Cotización</Button>
            </div>
          </div>
          <div className="space-y-6">
            <div className="flex justify-end">
              <div className="space-y-4 text-right">
                <img src="/lovable-uploads/84af3e7f-9171-4c73-900f-9499a9673234.png" alt="NEOLED Logo" className="h-16 mx-auto" onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/128x64/f3f4f6/000000?text=NEOLED+Logo"; }} />
                <div className="text-right space-y-1">
                  <p className="text-sm text-gray-800 font-medium">Av. Heroinas esq. Hamiraya #316</p>
                  <div className="flex items-center justify-center gap-2"><WhatsappIcon className="w-5 h-5 text-green-600" /><span className="text-sm text-gray-800 font-medium">77918672 - 77950297</span></div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <Card><CardContent className="p-0"><div className="overflow-x-auto">
                <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>Teléfono</TableHead><TableHead>Dirección</TableHead><TableHead>Tipo de Pago</TableHead><TableHead>Vigencia</TableHead></TableRow></TableHeader>
                <TableBody><TableRow><TableCell>{fechaHoy}</TableCell><TableCell>{datosCliente.nombre}</TableCell><TableCell>{datosCliente.telefono}</TableCell><TableCell className="max-w-xs truncate">{datosCliente.direccion}</TableCell>
                <TableCell>{datosCliente.tipoPago === "contra-entrega" && "Contra Entrega"}{datosCliente.tipoPago === "pago-adelantado" && "Pago por Adelantado"}{datosCliente.tipoPago === "mitad-adelanto" && "Mitad de Adelanto"}</TableCell>
                <TableCell>{datosCliente.vigencia} días (hasta {fechaVigencia.toLocaleDateString('es-BO')})</TableCell></TableRow></TableBody></Table>

                <Table><TableHeader><TableRow><TableHead>Imagen</TableHead><TableHead colSpan={2}>Producto</TableHead><TableHead className="text-center">Cantidad</TableHead><TableHead className="text-right">Valor Unitario</TableHead><TableHead className="text-right">Valor Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {cotizacionItems.map((item) => (
                    <TableRow key={item.uniqueId}>
                      <TableCell>{(item.imagenUrl || getProductImageUrl(item.imagen)) ? <img src={item.imagenUrl || getProductImageUrl(item.imagen)} alt={item.nombre} className="w-12 h-12 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/50x50/f3f4f6/000000?text=Producto"; }} /> : <div className="w-12 h-12 rounded bg-muted flex items-center justify-center"><span className="text-xs text-muted-foreground">Sin img</span></div>}</TableCell>
                      <TableCell colSpan={2}><p className="font-bold text-base">{item.nombre}</p></TableCell>
                      <TableCell className="text-center">{item.cantidad}</TableCell>
                      <TableCell className="text-right">Bs {formatBs(item.precio_venta)}</TableCell>
                      <TableCell className="text-right font-medium">Bs {formatBs(item.precio_venta * item.cantidad)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2"><TableCell colSpan={3} className="bg-gray-50 font-medium">Subtotal</TableCell><TableCell className="text-center bg-gray-50"></TableCell><TableCell className="text-right bg-gray-50"></TableCell><TableCell className="text-right bg-gray-50 font-medium">Bs {formatBs(subtotal)}</TableCell></TableRow>
                  {descuentoTotal > 0 && (<TableRow><TableCell colSpan={3} className="font-medium text-red-600">Descuento</TableCell><TableCell className="text-center"></TableCell><TableCell className="text-right"></TableCell></TableRow>)}
                  <TableRow className="border-t-2"><TableCell colSpan={3} className="bg-gray-50 font-bold">Total</TableCell><TableCell className="text-center bg-gray-50"></TableCell><TableCell className="text-right bg-gray-50"></TableCell><TableCell className="text-right bg-gray-50 font-bold">Bs {formatBs(totalFinal)}</TableCell></TableRow>
                  <TableRow><TableCell colSpan={6} className="border-t-2 border-gray-300 h-2"></TableCell></TableRow>
                  <TableRow><TableCell colSpan={3} className="bg-gray-50 font-medium">Abono</TableCell><TableCell className="text-center bg-gray-50"></TableCell><TableCell className="text-right bg-gray-50"></TableCell><TableCell className="text-right bg-gray-50 font-medium">Bs {formatBs(abono)}</TableCell></TableRow>
                  <TableRow><TableCell colSpan={3} className="bg-gray-50 font-medium">Saldo</TableCell><TableCell className="text-center bg-gray-50"></TableCell><TableCell className="text-right bg-gray-50"></TableCell><TableCell className="text-right bg-gray-50 font-medium">Bs {formatBs(saldo)}</TableCell></TableRow>
                </TableBody></Table>
              </div></CardContent></Card>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6 p-4">
        <AlertModal />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /><h1 className="text-2xl font-bold text-primary">Generar Cotización</h1></div>
          <Dialog open={showCotizacionesDialog} onOpenChange={setShowCotizacionesDialog}>
            <DialogTrigger asChild><Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto"><History className="h-4 w-4" />Buscar Cotizaciones</Button></DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader><DialogTitle>Buscar Cotizaciones Existentes</DialogTitle><DialogDescription>Escriba para buscar cotizaciones por nombre de cliente o teléfono</DialogDescription></DialogHeader>
              <div className="flex gap-2 mb-4"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" /><Input placeholder="Buscar por nombre o teléfono..." value={searchCotizacionQuery} onChange={(e) => setSearchCotizacionQuery(e.target.value)} className="pl-10" /></div></div>
              <div className="flex-1 overflow-y-auto">
                {loadingCotizaciones ? (<div className="text-center py-8"><p className="text-muted-foreground">Buscando cotizaciones...</p></div>) : cotizacionesExistentes.length === 0 ? (<div className="text-center py-8"><p className="text-muted-foreground">{searchCotizacionQuery ? "No se encontraron cotizaciones" : "Escriba para buscar cotizaciones"}</p></div>) : (
                  <div className="space-y-2">{cotizacionesExistentes.map((cotizacion) => (<div key={cotizacion.idcotizacion} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-2"><div className="flex-1"><h4 className="font-semibold">{cotizacion.cliente_nombre}</h4><p className="text-sm text-muted-foreground">Teléfono: {cotizacion.cliente_telefono} | Fecha: {new Date(cotizacion.fecha_creacion).toLocaleDateString('es-BO')} | Total: Bs {formatBs(cotizacion.total)}</p></div><div className="flex gap-2 w-full sm:w-auto"><Button size="sm" onClick={() => cargarCotizacionExistente(cotizacion.idcotizacion)} className="flex-1 sm:flex-none">Cargar</Button><Button size="sm" variant="destructive" onClick={() => eliminarCotizacion(cotizacion.idcotizacion, cotizacion.cliente_nombre)} className="flex-1 sm:flex-none"><Trash2 className="h-4 w-4" /></Button></div></div>))}</div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Nueva distribución: Izquierda - Información del Cliente, Derecha - Buscar Productos y Productos Agregados */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna Izquierda: Información del Cliente */}
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle>Información del Cliente</CardTitle></CardHeader>
            <CardContent>
              {/* Búsqueda de cliente con "ojito" arriba */}
              <div className="mb-4">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-medium">Buscar cliente registrado</Label>
                  {selectedCliente && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={toggleClienteNota}
                            className="h-7 px-2 flex-shrink-0"
                          >
                            {showClienteNota ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                            <span className="text-xs ml-1">
                              {showClienteNota ? "Ocultar nota" : "Ver nota"}
                            </span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{showClienteNota ? "Ocultar nota" : "Ver nota"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Buscar por nombre, carnet o celular..."
                      value={clienteSearchTerm}
                      onChange={(e) => {
                        const value = e.target.value;
                        setClienteSearchTerm(value);
                        if (value.trim().length >= 2) {
                          searchClientesBackend(value.trim());
                        } else {
                          setClienteSearchResults([]);
                        }
                      }}
                      className="pr-10"
                    />
                    {searchingClientes && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowClienteForm(true)}
                    className="h-10 px-3 flex-shrink-0"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  {selectedCliente && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={limpiarCliente}
                      className="h-10 px-2 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Resultados de búsqueda de clientes */}
                {clienteSearchResults.length > 0 && (
                  <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto shadow-lg bg-white mt-2">
                    {clienteSearchResults.map((cliente) => (
                      <div
                        key={cliente.id}
                        className="p-3 hover:bg-primary/10 cursor-pointer border-b last:border-b-0 flex items-center justify-between transition-colors"
                        onClick={() => seleccionarCliente(cliente)}
                      >
                        <div>
                          <span className="font-medium">
                            {cliente.nombres} {cliente.apellidos}
                          </span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {cliente.carnet}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {cliente.celular}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mensaje de "No se encontraron clientes" */}
                {clienteSearchTerm.trim().length >= 2 && 
                 clienteSearchResults.length === 0 && 
                 !searchingClientes && (
                  <div className="text-center py-2 text-sm text-muted-foreground border rounded-md bg-muted/20 mt-2">
                    No se encontraron clientes. Puede escribir el nombre manualmente.
                  </div>
                )}
              </div>

              {/* Mostrar nota del cliente seleccionado */}
              {selectedCliente && showClienteNota && (
                <div className="mb-4 p-3 bg-muted/30 rounded-md border">
                  <p className="text-xs text-muted-foreground font-medium">Nota del cliente:</p>
                  <p className="text-sm mt-0.5 break-words whitespace-pre-wrap">
                    {selectedCliente.nota && selectedCliente.nota.trim() ? (
                      selectedCliente.nota
                    ) : (
                      <span className="text-muted-foreground italic">Sin nota</span>
                    )}
                  </p>
                </div>
              )}

              {/* Cliente seleccionado o manual */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">
                    Nombre del Cliente <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="nombre" 
                    value={datosCliente.nombre} 
                    onChange={handleNombreManualChange} 
                    placeholder="Ingrese el nombre completo" 
                    className={selectedCliente ? "border-green-500 bg-green-50" : ""}
                  />
                  {selectedCliente && (
                    <p className="text-xs text-green-600">✓ Cliente registrado</p>
                  )}
                  {clienteManual && !selectedCliente && datosCliente.nombre && (
                    <p className="text-xs text-amber-600">ℹ Cliente no registrado (solo para esta cotización)</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">
                    Teléfono <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="telefono" 
                    value={datosCliente.telefono} 
                    onChange={handleTelefonoManualChange} 
                    placeholder="Número de teléfono"
                    className={selectedCliente ? "border-green-500 bg-green-50" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input 
                    id="direccion" 
                    value={datosCliente.direccion} 
                    onChange={(e) => setDatosCliente(prev => ({ ...prev, direccion: e.target.value }))} 
                    placeholder="Dirección completa" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipoPago">
                    Tipo de Pago <span className="text-red-500">*</span>
                  </Label>
                  <Select value={datosCliente.tipoPago} onValueChange={(value: "contra-entrega" | "pago-adelantado" | "mitad-adelanto") => setDatosCliente(prev => ({ ...prev, tipoPago: value }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccione tipo de pago" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contra-entrega">Contra Entrega</SelectItem>
                      <SelectItem value="pago-adelantado">Pago por Adelantado</SelectItem>
                      <SelectItem value="mitad-adelanto">Mitad de Adelanto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {datosCliente.tipoPago !== "pago-adelantado" && (
                  <div className="space-y-2">
                    <Label htmlFor="vigencia">
                      Vigencia <span className="text-red-500">*</span>
                    </Label>
                    <Select value={datosCliente.vigencia.toString()} onValueChange={(value) => setDatosCliente(prev => ({ ...prev, vigencia: parseInt(value) as 5 | 10 | 15 | 30 }))}>
                      <SelectTrigger><SelectValue placeholder="Seleccione vigencia" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 días</SelectItem>
                        <SelectItem value="10">10 días</SelectItem>
                        <SelectItem value="15">15 días</SelectItem>
                        <SelectItem value="30">30 días</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="descuento">Descuento (monto Bs)</Label>
                  <Input 
                    id="descuento" 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={datosCliente.descuento || ""} 
                    onChange={(e) => { 
                      const descuento = Number(e.target.value) || 0; 
                      setDatosCliente(prev => ({ ...prev, descuento: Math.min(descuento, subtotal) })); 
                    }} 
                    placeholder="0" 
                    className="number-input-no-scroll" 
                    onWheel={(e) => e.currentTarget.blur()} 
                  />
                </div>
              </div>

              {/* Indicador de cliente no registrado */}
              {clienteManual && !selectedCliente && datosCliente.nombre && (
                <div className="mt-4 p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-xs text-amber-700">
                    <span className="font-medium">ℹ Cliente no registrado:</span> Esta cotización se generará sin guardar en la base de datos.
                  </p>
                </div>
              )}

              {/* Botón Generar Cotización */}
              <div className="mt-4">
                <Button onClick={generarCotizacion} className="w-full" disabled={cotizacionItems.length === 0 || loading || tieneItemsInvalidos}>
                  {loading ? "Generando..." : tieneItemsInvalidos ? "Cantidades inválidas" : "Generar Cotización"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Columna Derecha: Buscar Productos y Productos Agregados */}
          <div className="lg:col-span-1 space-y-6">
            {/* Buscar Productos */}
            <Card>
              <CardHeader><CardTitle>Buscar Productos</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input ref={searchInputRef} placeholder="Buscar por nombre o descripción... (mín. 2 caracteres)" value={searchQuery} onChange={handleSearchChange} onKeyDown={handleSearchKeyDown} className="pl-10" disabled={loading} autoFocus />
                </div>
                {loading && <div className="text-center py-4"><p className="text-muted-foreground">Buscando productos...</p></div>}
                {!loading && searchResults.length > 0 && (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {searchResults.map((product) => (
                      <div key={product.idproducto} className="border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          {product.imagen ? <img src={getProductImageUrl(product.imagen)} alt={product.nombre} className="w-16 h-16 rounded-md object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/64x64/f3f4f6/000000?text=Sin+imagen"; }} /> : <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center"><span className="text-xs text-muted-foreground">Sin imagen</span></div>}
                          <div className="flex-1 min-w-0"><h4 className="font-semibold text-sm">{product.nombre}</h4><p className="text-xs text-muted-foreground line-clamp-2">{product.descripcion}</p><div className="flex items-center gap-2 mt-1 flex-wrap"><Badge variant="outline" className="text-xs">{product.nombre_ubicacion}</Badge></div><p className="text-xs font-medium">Bs {formatBs(product.precio_venta)} | Stock: {product.stock}</p></div>
                          <Button size="sm" onClick={() => agregarProducto(product)} disabled={product.stock === 0}>{product.stock === 0 ? "Sin Stock" : "Agregar"}</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Productos Agregados */}
            <Card>
              <CardHeader><CardTitle>Productos Agregados</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {cotizacionItems.length === 0 ? (<p className="text-muted-foreground text-center py-8">No hay productos agregados</p>) : (
                  <>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {cotizacionItems.map((item) => (
                        <div key={item.uniqueId} className="border rounded-lg p-3 bg-card">
                          <div className="flex items-start gap-3 mb-3">
                            {(item.imagenUrl || getProductImageUrl(item.imagen)) ? <img src={item.imagenUrl || getProductImageUrl(item.imagen)} alt={item.nombre} className="w-12 h-12 rounded object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/50x50/f3f4f6/000000?text=Producto"; }} /> : <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0"><span className="text-xs text-muted-foreground">Sin img</span></div>}
                            <div className="flex-1 min-w-0"><h5 className="font-bold text-base break-words whitespace-normal leading-tight">{item.nombre}</h5><p className="text-sm font-medium text-green-600 mt-1">Bs {formatBs(item.precio_venta)} c/u</p></div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => actualizarCantidad(item.uniqueId, item.cantidad - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min="0"
                                value={item.cantidad === 0 ? "" : item.cantidad}
                                onChange={(e) => handleCantidadInputChange(item.uniqueId, e.target.value)}
                                onBlur={(e) => handleCantidadInputBlur(item.uniqueId, e.target.value)}
                                className="w-12 h-8 text-center text-sm font-medium number-input-no-scroll"
                                onWheel={(e) => e.currentTarget.blur()}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => actualizarCantidad(item.uniqueId, item.cantidad + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold whitespace-nowrap">Bs {formatBs(item.precio_venta * item.cantidad)}</p>
                              <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => eliminarItem(item.uniqueId)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm"><span>Subtotal:</span><span>Bs {formatBs(subtotal)}</span></div>
                      {descuentoTotal > 0 && (
                        <div className="flex justify-between text-sm text-red-600"><span>Descuento:</span><span>-Bs {formatBs(descuentoTotal)}</span></div>
                      )}
                      <div className="flex justify-between text-lg font-bold"><span>Total:</span><span>Bs {formatBs(totalFinal)}</span></div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialog para crear cliente */}
        <Dialog open={showClienteForm} onOpenChange={setShowClienteForm}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
              <DialogDescription>Complete los datos para registrar un nuevo cliente</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombres">
                  Nombre(s) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombres"
                  placeholder="Ej: María"
                  value={clienteFormData.nombres}
                  onChange={(e) => setClienteFormData({...clienteFormData, nombres: e.target.value})}
                  disabled={submittingCliente}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellidos">
                  Apellido(s) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="apellidos"
                  placeholder="Ej: González Ramírez"
                  value={clienteFormData.apellidos}
                  onChange={(e) => setClienteFormData({...clienteFormData, apellidos: e.target.value})}
                  disabled={submittingCliente}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carnet">
                  Carnet <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="carnet"
                  placeholder="Ej: 1234567"
                  value={clienteFormData.carnet}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 13) {
                      setClienteFormData({...clienteFormData, carnet: value});
                    }
                  }}
                  maxLength={13}
                  disabled={submittingCliente}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="celular">
                  Celular <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="celular"
                  placeholder="Ej: 72123456"
                  value={clienteFormData.celular}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9+]/g, "");
                    if (value.length <= 12) {
                      setClienteFormData({...clienteFormData, celular: value});
                    }
                  }}
                  maxLength={12}
                  disabled={submittingCliente}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nota">Nota</Label>
                <Input
                  id="nota"
                  placeholder="Observaciones adicionales..."
                  value={clienteFormData.nota}
                  onChange={(e) => setClienteFormData({...clienteFormData, nota: e.target.value})}
                  disabled={submittingCliente}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowClienteForm(false)} disabled={submittingCliente}>
                Cancelar
              </Button>
              <Button onClick={handleCreateCliente} disabled={submittingCliente}>
                {submittingCliente ? "Creando..." : "Crear Cliente"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
}