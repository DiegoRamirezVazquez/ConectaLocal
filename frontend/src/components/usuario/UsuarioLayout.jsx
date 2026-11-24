
import { Outlet } from "react-router-dom";
import UsuarioSidebar from "./UsuarioSidebar";

import "./UsuarioLayout.css";

const UsuarioLayout = () => {
  return (
    <div className="usuario-layout">
      <UsuarioSidebar />

      <main className="usuario-contenido">
        <Outlet />
      </main>
    </div>
  );
};

export default UsuarioLayout;
