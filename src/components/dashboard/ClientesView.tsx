// Clientes.tsx
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Plus,
  Search,
  Edit,
  Trash2,
  User,
  Phone,
  CreditCard,
  FileText,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  toggleClienteStatus,
  type Cliente,
  type ClienteRequest,
} from "@/api/clientesApi";

interface ClienteFormData {
  nombres: string;
  apellidos: string;
  carnet: string;
  celular: string;
  nota: string;
}

export function ClientesView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ClienteFormData>({
    nombres: "",
    apellidos: "",
    carnet: "",
    celular: "",
    nota: "",
  });
  const { toast } = useToast();

  // Cargar clientes al montar el componente
  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const data = await getClientes();
      setClientes(data);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron cargar los clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar clientes
  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) return clientes;
    const term = searchTerm.toLowerCase();
    return clientes.filter(
      (c) =>
        c.nombres.toLowerCase().includes(term) ||
        c.apellidos.toLowerCase().includes(term) ||
        (c.carnet && c.carnet.toLowerCase().includes(term)) ||
        (c.celular && c.celular.includes(term))
    );
  }, [clientes, searchTerm]);

  const handleAdd = () => {
    setFormData({
      nombres: "",
      apellidos: "",
      carnet: "",
      celular: "",
      nota: "",
    });
    setIsEditing(false);
    setEditingId(null);
    setIsFormOpen(true);
  };

  const handleEdit = (cliente: Cliente) => {
    setFormData({
      nombres: cliente.nombres,
      apellidos: cliente.apellidos,
      carnet: cliente.carnet || "",
      celular: cliente.celular || "",
      nota: cliente.nota || "",
    });
    setIsEditing(true);
    setEditingId(cliente.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number, nombreCompleto: string) => {
    try {
      await deleteCliente(id);
      const data = await getClientes();
      setClientes(data);
      toast({
        title: "Cliente eliminado",
        description: `${nombreCompleto} ha sido eliminado.`,
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el cliente",
        variant: "destructive",
      });
    }
  };

  // Validación para carnet: opcional, si se ingresa debe tener entre 5 y 13 caracteres
  const validateCarnet = (carnet: string): boolean => {
    if (carnet.trim() === "") return true; // Permitir vacío
    return carnet.length >= 5 && carnet.length <= 13;
  };

  // Validación para celular: opcional, si se ingresa solo números y el signo +, entre 6 y 12 caracteres
  const validateCelular = (celular: string): boolean => {
    if (celular.trim() === "") return true; // Permitir vacío
    const celularRegex = /^[0-9+]{6,12}$/;
    return celularRegex.test(celular);
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.nombres.trim()) {
      toast({
        title: "Error",
        description: "Los nombres son obligatorios",
        variant: "destructive",
      });
      return;
    }
    if (!formData.apellidos.trim()) {
      toast({
        title: "Error",
        description: "Los apellidos son obligatorios",
        variant: "destructive",
      });
      return;
    }
    if (!validateCarnet(formData.carnet.trim())) {
      toast({
        title: "Error",
        description: "El carnet debe tener entre 5 y 13 caracteres o estar vacío",
        variant: "destructive",
      });
      return;
    }
    if (!validateCelular(formData.celular.trim())) {
      toast({
        title: "Error",
        description: "El celular debe tener entre 6 y 12 caracteres (solo números y el signo +) o estar vacío",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      
      const clienteData: ClienteRequest = {
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        carnet: formData.carnet.trim() || undefined,
        celular: formData.celular.trim() || undefined,
        nota: formData.nota.trim() || undefined,
      };

      if (isEditing && editingId !== null) {
        const updated = await updateCliente(editingId, clienteData);
        setClientes(clientes.map((c) => (c.id === editingId ? updated : c)));
        toast({
          title: "Cliente actualizado",
          description: `${formData.nombres} ${formData.apellidos} ha sido actualizado.`,
        });
      } else {
        const newCliente = await createCliente(clienteData);
        setClientes([...clientes, newCliente]);
        toast({
          title: "Cliente agregado",
          description: `${formData.nombres} ${formData.apellidos} ha sido agregado.`,
        });
      }

      setIsFormOpen(false);
      setFormData({
        nombres: "",
        apellidos: "",
        carnet: "",
        celular: "",
        nota: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar el cliente",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setFormData({
      nombres: "",
      apellidos: "",
      carnet: "",
      celular: "",
      nota: "",
    });
  };

  const inputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    
    // Para carnet: limitar a 13 caracteres
    if (id === "carnet") {
      if (value.length <= 13) {
        setFormData({
          ...formData,
          [id]: value,
        });
      }
      return;
    }
    
    // Para celular: solo permitir números y el signo +, limitar a 12 caracteres
    if (id === "celular") {
      const validChars = value.replace(/[^0-9+]/g, "");
      if (validChars.length <= 12) {
        setFormData({
          ...formData,
          [id]: validChars,
        });
      }
      return;
    }

    setFormData({
      ...formData,
      [id]: value,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
          <User className="h-7 w-7" />
          Gestión de Clientes
        </h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90 w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Cliente" : "Agregar Nuevo Cliente"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombres">
                  Nombre(s) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombres"
                  placeholder="Ej: María"
                  value={formData.nombres}
                  onChange={inputChange}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellidos">
                  Apellido(s) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="apellidos"
                  placeholder="Ej: González Ramírez"
                  value={formData.apellidos}
                  onChange={inputChange}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carnet">Carnet (opcional)</Label>
                <Input
                  id="carnet"
                  placeholder="Ej: 1234567 (opcional)"
                  value={formData.carnet}
                  onChange={inputChange}
                  maxLength={13}
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">
                  Dejar vacío si no tiene carnet
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="celular">Celular (opcional)</Label>
                <Input
                  id="celular"
                  placeholder="Ej: 72123456 (opcional)"
                  value={formData.celular}
                  onChange={inputChange}
                  maxLength={12}
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">
                  Dejar vacío si no tiene celular
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nota">Nota (opcional)</Label>
                <Input
                  id="nota"
                  placeholder="Observaciones adicionales..."
                  value={formData.nota}
                  onChange={inputChange}
                  disabled={submitting}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel} disabled={submitting}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Actualizar" : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla de clientes */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle>Lista de Clientes</CardTitle>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Vista móvil - Cards */}
          <div className="block lg:hidden space-y-3 w-full">
            {filteredClientes.map((cliente) => (
              <Card key={cliente.id} className="p-3 w-full">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">
                        {cliente.nombres} {cliente.apellidos}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Carnet: {cliente.carnet || "No registrado"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(cliente)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Esto eliminará
                              permanentemente al cliente "{cliente.nombres} {cliente.apellidos}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDelete(cliente.id, `${cliente.nombres} ${cliente.apellidos}`)
                              }
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span>{cliente.celular || "No registrado"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3 text-muted-foreground" />
                      <span>{cliente.carnet || "N/A"}</span>
                    </div>
                  </div>
                  {cliente.nota && (
                    <div className="text-xs bg-muted p-1 rounded">
                      <span className="font-medium">Nota:</span> {cliente.nota}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Vista desktop - Tabla */}
          <div className="hidden lg:block">
            <div className="w-full border rounded-lg">
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre Completo</TableHead>
                      <TableHead>Carnet</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>Nota</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClientes.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell>
                          <div className="font-medium">{cliente.nombres}</div>
                          <div className="text-xs text-muted-foreground">{cliente.apellidos}</div>
                        </TableCell>
                        <TableCell>{cliente.carnet || "—"}</TableCell>
                        <TableCell>{cliente.celular || "—"}</TableCell>
                        <TableCell>
                          {cliente.nota ? (
                            <span className="text-sm">{cliente.nota}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(cliente)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará
                                    permanentemente al cliente "{cliente.nombres} {cliente.apellidos}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleDelete(cliente.id, `${cliente.nombres} ${cliente.apellidos}`)
                                    }
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {filteredClientes.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              {searchTerm ? "No se encontraron clientes" : "No hay clientes registrados"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}