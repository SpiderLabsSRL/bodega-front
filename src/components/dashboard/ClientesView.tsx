import { useState, useMemo } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Datos mock para clientes
interface Cliente {
  id: number;
  nombres: string;
  apellidos: string;
  carnet: string;
  celular: string;
  nota?: string;
  fechaRegistro: string;
}

// Mock de clientes
const mockClientes: Cliente[] = [
  {
    id: 1,
    nombres: "María",
    apellidos: "González Ramírez",
    carnet: "1234567",
    celular: "72123456",
    nota: "Cliente preferente",
    fechaRegistro: "2026-01-15",
  },
  {
    id: 2,
    nombres: "Carlos",
    apellidos: "Mendoza Pérez",
    carnet: "7654321",
    celular: "71234567",
    nota: "",
    fechaRegistro: "2026-02-20",
  },
  {
    id: 3,
    nombres: "Ana",
    apellidos: "Flores Jiménez",
    carnet: "9876543",
    celular: "70876543",
    nota: "Cliente frecuente",
    fechaRegistro: "2026-03-10",
  },
  {
    id: 4,
    nombres: "Roberto",
    apellidos: "Sánchez Lima",
    carnet: "4567890",
    celular: "73456789",
    nota: "Pago en efectivo",
    fechaRegistro: "2026-04-05",
  },
  {
    id: 5,
    nombres: "Laura",
    apellidos: "Torres Vaca",
    carnet: "5432109",
    celular: "74567890",
    nota: "",
    fechaRegistro: "2026-05-12",
  },
];

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
  const [clientes, setClientes] = useState<Cliente[]>(mockClientes);
  const [formData, setFormData] = useState<ClienteFormData>({
    nombres: "",
    apellidos: "",
    carnet: "",
    celular: "",
    nota: "",
  });
  const { toast } = useToast();

  // Filtrar clientes
  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) return clientes;
    const term = searchTerm.toLowerCase();
    return clientes.filter(
      (c) =>
        c.nombres.toLowerCase().includes(term) ||
        c.apellidos.toLowerCase().includes(term) ||
        c.carnet.includes(term) ||
        c.celular.includes(term)
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
      carnet: cliente.carnet,
      celular: cliente.celular,
      nota: cliente.nota || "",
    });
    setIsEditing(true);
    setEditingId(cliente.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number, nombreCompleto: string) => {
    setClientes(clientes.filter((c) => c.id !== id));
    toast({
      title: "Cliente eliminado",
      description: `${nombreCompleto} ha sido eliminado.`,
      variant: "destructive",
    });
  };

  const handleSubmit = () => {
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
    if (!formData.carnet.trim()) {
      toast({
        title: "Error",
        description: "El carnet es obligatorio",
        variant: "destructive",
      });
      return;
    }
    if (!formData.celular.trim()) {
      toast({
        title: "Error",
        description: "El celular es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (isEditing && editingId !== null) {
      // Editar cliente existente
      setClientes(
        clientes.map((c) =>
          c.id === editingId
            ? {
                ...c,
                ...formData,
              }
            : c
        )
      );
      toast({
        title: "Cliente actualizado",
        description: `${formData.nombres} ${formData.apellidos} ha sido actualizado.`,
      });
    } else {
      // Agregar nuevo cliente
      const newCliente: Cliente = {
        id: Math.max(...clientes.map((c) => c.id), 0) + 1,
        ...formData,
        fechaRegistro: new Date().toISOString().split("T")[0],
      };
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
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

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
                <Label htmlFor="nombres">Nombre(s) *</Label>
                <Input
                  id="nombres"
                  placeholder="Ej: María"
                  value={formData.nombres}
                  onChange={inputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellidos">Apellido(s) *</Label>
                <Input
                  id="apellidos"
                  placeholder="Ej: González Ramírez"
                  value={formData.apellidos}
                  onChange={inputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carnet">Carnet *</Label>
                <Input
                  id="carnet"
                  placeholder="Ej: 1234567"
                  value={formData.carnet}
                  onChange={inputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="celular">Celular *</Label>
                <Input
                  id="celular"
                  placeholder="Ej: 72123456"
                  value={formData.celular}
                  onChange={inputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nota">Nota</Label>
                <Input
                  id="nota"
                  placeholder="Observaciones adicionales..."
                  value={formData.nota}
                  onChange={inputChange}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
                {isEditing ? "Actualizar" : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{clientes.length}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <User className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Con Nota</p>
                <p className="text-2xl font-bold">{clientes.filter(c => c.nota?.trim()).length}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Con Celular</p>
                <p className="text-2xl font-bold">{clientes.filter(c => c.celular).length}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <Phone className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Con Carnet</p>
                <p className="text-2xl font-bold">{clientes.filter(c => c.carnet).length}</p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-full">
                <CreditCard className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
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
                        Carnet: {cliente.carnet}
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
                      <span>{cliente.celular}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3 text-muted-foreground" />
                      <span>{cliente.carnet}</span>
                    </div>
                  </div>
                  {cliente.nota && (
                    <div className="text-xs bg-muted p-1 rounded">
                      <span className="font-medium">Nota:</span> {cliente.nota}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Registro: {cliente.fechaRegistro}
                  </div>
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
                        <TableCell>{cliente.carnet}</TableCell>
                        <TableCell>{cliente.celular}</TableCell>
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
              No se encontraron clientes
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}