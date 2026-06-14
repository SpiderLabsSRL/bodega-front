import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, Bell, Shield, Database, Palette } from "lucide-react";
import { ManagementSection } from "./ManagementSection";
import {
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  getUbicaciones,
  createUbicacion,
  updateUbicacion,
  deleteUbicacion,
} from "@/api/ManagementSectionApi";

export function ConfiguracionView() {
  const [categorias, setCategorias] = useState<string[]>([]);
  const [ubicaciones, setUbicaciones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de carga para cada sección
  const [loadingStates, setLoadingStates] = useState({
    coloresDiseno: false,
    coloresLuz: false,
    tipos: false,
    categorias: false,
    ubicaciones: false,
    watts: false,
    tamanos: false
  });

  // Estados para controlar qué formularios están abiertos
  const [openForms, setOpenForms] = useState({
    coloresDiseno: false,
    coloresLuz: false,
    tipos: false,
    categorias: false,
    ubicaciones: false,
    watts: false,
    tamanos: false
  });

  // Función para verificar si algún formulario está abierto
  const isAnyFormOpen = () => {
    return Object.values(openForms).some(isOpen => isOpen);
  };

  // Manejar el evento de popstate (botón atrás del navegador)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (isAnyFormOpen()) {
        // Prevenir la navegación hacia atrás
        event.preventDefault();
        // Cerrar todos los formularios
        setOpenForms({
          coloresDiseno: false,
          coloresLuz: false,
          tipos: false,
          categorias: false,
          ubicaciones: false,
          watts: false,
          tamanos: false
        });
        // Agregar una nueva entrada al historial para mantener la posición actual
        window.history.pushState(null, '', window.location.href);
      }
    };

    // Agregar una entrada inicial al historial
    window.history.pushState(null, '', window.location.href);

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [openForms]);

  // Función para actualizar el estado de carga de una sección
  const setSectionLoading = (section: keyof typeof loadingStates, isLoading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [section]: isLoading
    }));
  };

  // Función para abrir/cerrar formularios
  const toggleForm = (section: keyof typeof openForms, isOpen: boolean) => {
    setOpenForms(prev => ({
      ...prev,
      [section]: isOpen
    }));

    // Si se está abriendo un formulario, agregar una entrada al historial
    if (isOpen) {
      window.history.pushState({ formOpen: true }, '');
    }
  };

  // Función para cerrar un formulario específico
  const handleCloseForm = (section: keyof typeof openForms) => {
    toggleForm(section, false);
  };

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Cargar todos los datos en paralelo
        const [
          categoriasData,
          ubicacionesData
        ] = await Promise.all([
          getCategorias(),
          getUbicaciones()
        ]);

        // Mapear a arrays de strings (solo los nombres)
        setCategorias(categoriasData.map(item => item.nombre));
        setUbicaciones(ubicacionesData.map(item => item.nombre));
      } catch (error) {
        console.error("Error loading configuration data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Handlers para Categorías
  const handleAddCategoria = async (name: string) => {
    setSectionLoading('categorias', true);
    try {
      await createCategoria({ nombre: name });
      const updatedData = await getCategorias();
      setCategorias(updatedData.map(item => item.nombre));
      handleCloseForm('categorias');
    } catch (error) {
      throw error;
    } finally {
      setSectionLoading('categorias', false);
    }
  };

  const handleEditCategoria = async (oldName: string, newName: string) => {
    setSectionLoading('categorias', true);
    try {
      const currentData = await getCategorias();
      const itemToEdit = currentData.find(item => item.nombre === oldName);
      if (itemToEdit) {
        await updateCategoria(itemToEdit.id, { nombre: newName });
        const updatedData = await getCategorias();
        setCategorias(updatedData.map(item => item.nombre));
      }
    } catch (error) {
      throw error;
    } finally {
      setSectionLoading('categorias', false);
    }
  };

  const handleDeleteCategoria = async (name: string) => {
    setSectionLoading('categorias', true);
    try {
      const currentData = await getCategorias();
      const itemToDelete = currentData.find(item => item.nombre === name);
      if (itemToDelete) {
        await deleteCategoria(itemToDelete.id);
        const updatedData = await getCategorias();
        setCategorias(updatedData.map(item => item.nombre));
      }
    } catch (error) {
      throw error;
    } finally {
      setSectionLoading('categorias', false);
    }
  };

  // Handlers para Ubicaciones
  const handleAddUbicacion = async (name: string) => {
    setSectionLoading('ubicaciones', true);
    try {
      await createUbicacion({ nombre: name });
      const updatedData = await getUbicaciones();
      setUbicaciones(updatedData.map(item => item.nombre));
      handleCloseForm('ubicaciones');
    } catch (error) {
      throw error;
    } finally {
      setSectionLoading('ubicaciones', false);
    }
  };

  const handleEditUbicacion = async (oldName: string, newName: string) => {
    setSectionLoading('ubicaciones', true);
    try {
      const currentData = await getUbicaciones();
      const itemToEdit = currentData.find(item => item.nombre === oldName);
      if (itemToEdit) {
        await updateUbicacion(itemToEdit.id, { nombre: newName });
        const updatedData = await getUbicaciones();
        setUbicaciones(updatedData.map(item => item.nombre));
      }
    } catch (error) {
      throw error;
    } finally {
      setSectionLoading('ubicaciones', false);
    }
  };

  const handleDeleteUbicacion = async (name: string) => {
    setSectionLoading('ubicaciones', true);
    try {
      const currentData = await getUbicaciones();
      const itemToDelete = currentData.find(item => item.nombre === name);
      if (itemToDelete) {
        await deleteUbicacion(itemToDelete.id);
        const updatedData = await getUbicaciones();
        setUbicaciones(updatedData.map(item => item.nombre));
      }
    } catch (error) {
      throw error;
    } finally {
      setSectionLoading('ubicaciones', false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Configuración del Sistema</h1>
      </div>

      {/* Secciones de gestión */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ManagementSection
          title="Categorías"
          icon={Settings}
          iconColor="text-green-600"
          data={categorias}
          onAdd={handleAddCategoria}
          onEdit={handleEditCategoria}
          onDelete={handleDeleteCategoria}
          onCloseForm={() => handleCloseForm('categorias')}
          loading={loadingStates.categorias}
          isFormOpen={openForms.categorias}
          onToggleForm={(isOpen) => toggleForm('categorias', isOpen)}
        />

        <ManagementSection
          title="Ubicaciones"
          icon={Settings}
          iconColor="text-purple-600"
          data={ubicaciones}
          onAdd={handleAddUbicacion}
          onEdit={handleEditUbicacion}
          onDelete={handleDeleteUbicacion}
          onCloseForm={() => handleCloseForm('ubicaciones')}
          loading={loadingStates.ubicaciones}
          isFormOpen={openForms.ubicaciones}
          onToggleForm={(isOpen) => toggleForm('ubicaciones', isOpen)}
        />
      </div>
    </div>
  );
}