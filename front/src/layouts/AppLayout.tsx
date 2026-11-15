import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { Asterisk, CalendarDays, LogOut } from "lucide-react";
import { useAuth } from "../context/authContext";
import "./AppLayout.css";

export function AppLayout() {
  const { user, signOut } = useAuth();
  const isReportPage = useLocation().pathname.endsWith("/laudo");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");

  async function handleSignOut(): Promise<void> {
    setError("");
    setIsSigningOut(true);
    try {
      await signOut();
    } catch {
      setError("Não foi possível sair. Tente novamente.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span aria-hidden="true">
            <Asterisk size={22} />
          </span>
          <strong>
            aurora <em>saúde</em>
          </strong>
        </div>
        <div className="sidebar-label">PORTAL DE EXAMES</div>
        <nav aria-label="Navegação principal">
          <NavLink
            className={({ isActive }) =>
              isActive ? "sidebar-link active" : "sidebar-link"
            }
            to="/agendamentos"
          >
            <CalendarDays size={18} aria-hidden="true" /> Agendamentos
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <span className="sidebar-avatar" aria-hidden="true">
            <Asterisk size={20} />
          </span>
          <div>
            <strong>Seu cuidado</strong>
            <small>em boas mãos</small>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-header">
          <div className="header-breadcrumb">
            <span>Portal</span>
            <span aria-hidden="true">/</span>
            <strong>Agendamentos</strong>
            {isReportPage && (
              <>
                <span aria-hidden="true">/</span>
                <strong>Laudo</strong>
              </>
            )}
          </div>
          <div className="header-user">
            <span className="user-avatar" aria-hidden="true">
              {user?.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{user?.name}</strong>
              <small>
                {user?.role === "clinic" ? "Equipe da clínica" : "Paciente"}
              </small>
            </div>
            <button
              type="button"
              className="logout-button"
              onClick={() => void handleSignOut()}
              disabled={isSigningOut}
            >
              <LogOut size={15} aria-hidden="true" /> Sair
            </button>
          </div>
        </header>
        {error && (
          <p className="layout-error" role="alert">
            {error}
          </p>
        )}
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
