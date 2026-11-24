import { NavLink, Link } from "react-router-dom";
import {
  Home,
  Store,
  PlusCircle,
  MessageCircle,
  Star,
  ClipboardList,
  UserRound,
  Settings,
  MapPin
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import LogoutButton from "../../components/common/LogoutButton";

import "./TrabajadorSidebar.css";

const TrabajadorSidebar = () => {
  const { user } = useAuth();
  const inicial = user?.nombre?.charAt(0)?.toUpperCase() || "T";

  return (
    <aside className="td-sidebar">
      <div className="td-marca">
        <span className="td-logo">
          <MapPin size={24} fill="currentColor" />
        </span>
        <span>ConectaLocal</span>
      </div>

      <div className="td-perfil">
        <span className="td-avatar">{inicial}</span>
        <div>
          <strong>{user?.nombre || "Trabajador"}</strong>
          <span>Trabajador / Negocio</span>
        </div>
      </div>

      <span className="td-menu-label">MENÚ PRINCIPAL</span>

      <nav className="td-nav">
        <NavLink
          to="/trabajador"
          end
          className={({ isActive }) => `td-enlace ${isActive ? "activo" : ""}`}
        >
          <Home size={20} />
          <span>Inicio</span>
        </NavLink>

        <Link to="/trabajador#negocios" className="td-enlace">
          <Store size={20} />
          <span>Mis negocios</span>
        </Link>

        <Link to="/trabajador#solicitudes" className="td-enlace">
          <ClipboardList size={20} />
          <span>Mis solicitudes</span>
        </Link>

        <NavLink
          to="/trabajador/registrar"
          className={({ isActive }) => `td-enlace ${isActive ? "activo" : ""}`}
        >
          <PlusCircle size={20} />
          <span>Agregar negocio</span>
        </NavLink>

        <button type="button" className="td-enlace" disabled>
          <MessageCircle size={20} />
          <span>Mensajería</span>
        </button>

        <button type="button" className="td-enlace" disabled>
          <Star size={20} />
          <span>Reseñas</span>
        </button>
      </nav>

      <div className="td-sidebar-separador" />

      <span className="td-menu-label">CUENTA</span>

      <nav className="td-nav">
        <button type="button" className="td-enlace" disabled>
          <UserRound size={20} />
          <span>Mi perfil</span>
        </button>

        <button type="button" className="td-enlace" disabled>
          <Settings size={20} />
          <span>Configuración</span>
        </button>
      </nav>

      <div className="td-logout">
        <LogoutButton />
      </div>
    </aside>
  );
};

export default TrabajadorSidebar;
