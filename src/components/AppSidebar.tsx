import {
  ShoppingCart,
  Package,
  Package2,
  TrendingUp,
  FileText,
  CreditCard,
  Users,
  Settings,
  LogOut,
  Clock,
  Warehouse,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DashboardView } from "@/pages/Dashboard";
import { logout, getCurrentUser } from "@/api/AuthApi";
import { useEffect } from "react";

interface AppSidebarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

const menuItems = [
  {
    title: "Vender",
    url: "vender",
    icon: ShoppingCart,
    roles: ["admin", "asistente"],
  },
  {
    title: "Productos",
    url: "productos",
    icon: Package,
    roles: ["admin", "asistente"],
  },
  { 
    title: "Inventario", 
    url: "inventario", 
    icon: Package2, 
    roles: ["admin"] 
  },
  {
    title: "Ventas",
    url: "ventas",
    icon: TrendingUp,
    roles: ["admin", "asistente"],
  },
  {
    title: "Cotización",
    url: "cotizacion",
    icon: FileText,
    roles: ["admin", "asistente"],
  },
  {
    title: "Pagos Pendientes",
    url: "pagos-pendientes",
    icon: Clock,
    roles: ["admin", "asistente"],
  },
  {
    title: "Bodega",
    url: "bodega",
    icon: Warehouse,
    roles: ["admin"],
  },
  {
    title: "Clientes",
    url: "clientes",
    icon: User,
    roles: ["admin", "asistente"],
  },
  {
    title: "Configuración",
    url: "configuracion",
    icon: Settings,
    roles: ["admin"],
  },
  {
    title: "Gestión de Usuarios",
    url: "usuarios",
    icon: Users,
    roles: ["admin"],
  },
];

export function AppSidebar({ currentView, onViewChange }: AppSidebarProps) {
  const { state, setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const { toast } = useToast();

  const user = getCurrentUser();
  const userRole = user?.rol.toLowerCase() || "admin";

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(userRole),
  );

  const collapsed = state === "collapsed";

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      navigate("/login");
    }
  };

  const isActive = (view: string) => currentView === view;

  const handleMenuItemClick = (view: DashboardView) => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setOpenMobile(false);
    }
    onViewChange(view);
  };

  useEffect(() => {
    const handleRouteChange = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setOpenMobile(false);
      }
    };
    handleRouteChange();
  }, [currentView, setOpenMobile]);

  return (
    <Sidebar className="h-screen overflow-hidden bg-background">
      <SidebarHeader className="p-4 flex-shrink-0 border-b bg-background">
        <div className="flex items-center gap-2">
          <img
            src="/lovable-uploads/84af3e7f-9171-4c73-900f-9499a9673234.png"
            alt="NEOLED Logo"
            className={`${collapsed ? "h-8 w-8" : "h-auto w-auto"} transition-all`}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto overflow-x-hidden bg-background [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2 p-2">
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() =>
                      handleMenuItemClick(item.url as DashboardView)
                    }
                    className={`
                      py-3 px-4 h-auto min-h-[48px]
                      ${isActive(item.url)
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                      }
                      ${collapsed ? "justify-center px-2" : "justify-start"}
                    `}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <item.icon className={`${collapsed ? "h-5 w-5" : "h-5 w-5"}`} />
                    {!collapsed && <span className="text-base">{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 flex-shrink-0 border-t bg-background">
        <Button
          variant="secondary"
          size={collapsed ? "sm" : "default"}
          onClick={handleLogout}
          className={`
            w-full
            ${collapsed ? "h-12 px-2" : "h-12"}
          `}
        >
          <LogOut className={`${collapsed ? "h-5 w-5" : "h-5 w-5"}`} />
          {!collapsed && <span className="ml-2 text-base">Cerrar Sesión</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}