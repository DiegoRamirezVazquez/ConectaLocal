
import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  MessageCircle,
  Star,
  UserRound,
  MapPin,
  Menu,
  X
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import LogoutButton from "../../components/common/LogoutButton";

import "./UsuarioSidebar.css";

const UsuarioSidebar = () => {
  const { user } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const inicial = user?.nombre?.charAt(0)?.toUpperCase() || "U";

  const cerrarMenu = () => setMenuAbierto(false);

  return (
    <>
      <header className="us-mobile-header">
        <div className="us-marca">
          <span className="us-logo">
            <MapPin size={23} fill="currentColor" />
          </span>
          <span>ConectaLocal</span>
        </div>

        <button
          type="button"
          className="us-menu-toggle"
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
        >
          {menuAbierto ? <X size={25} /> : <Menu size={25} />}
        </button>
      </header>

      {menuAbierto && (
        <div
          className="us-overlay"
          onClick={cerrarMenu}
        />
      )}

      <aside className={`us-sidebar ${menuAbierto ? "us-abierto" : ""}`}>
        <div className="us-marca us-marca-desktop">
          <span className="us-logo">
            <MapPin size={24} fill="currentColor" />
          </span>
          <span>ConectaLocal</span>
        </div>

        <div className="us-perfil">
          <span className="us-avatar">{inicial}</span>

          <div>
            <strong>{user?.nombre || "Usuario"}</strong>
            <span>Comunidad ConectaLocal</span>
          </div>
        </div>

        <span className="us-menu-label">MENÚ PRINCIPAL</span>

        <nav className="us-nav">
          <NavLink
            to="/inicio"
            end
            onClick={cerrarMenu}
            className={({ isActive }) =>
              `us-enlace ${isActive ? "activo" : ""}`
            }
          >
            <Home size={20} />
            <span>Inicio</span>
          </NavLink>

          <NavLink
            to="/mensajes"
            onClick={cerrarMenu}
            className={({ isActive }) =>
              `us-enlace ${isActive ? "activo" : ""}`
            }
          >
            <MessageCircle size={20} />
            <span>Mensajes</span>
          </NavLink>

          <NavLink
            to="/recomendaciones"
            onClick={cerrarMenu}
            className={({ isActive }) =>
              `us-enlace ${isActive ? "activo" : ""}`
            }
          >
            <Star size={20} />
            <span>Recomendaciones</span>
          </NavLink>
        </nav>

        <div className="us-sidebar-separador" />

        <span className="us-menu-label">CUENTA</span>

        <nav className="us-nav">
          <NavLink
            to="/perfil"
            onClick={cerrarMenu}
            className={({ isActive }) =>
              `us-enlace ${isActive ? "activo" : ""}`
            }
          >
            <UserRound size={20} />
            <span>Mi perfil</span>
          </NavLink>
        </nav>

        <div className="us-logout">
          <LogoutButton />
        </div>
      </aside>
    </>
  );
};

export default UsuarioSidebar;
