import { useState, type FormEvent } from "react";
import { Navigate } from "react-router";
import { ArrowUpRight, Asterisk, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import { useAuth } from "../../context/authContext";
import "./LoginPage.css";

function Brand() {
  return (
    <div className="brand" aria-label="Aurora Saúde">
      <span className="brand-mark" aria-hidden="true">
        <Asterisk size={22} />
      </span>
      <span className="brand-name">
        aurora<span> saúde</span>
      </span>
    </div>
  );
}

export function LoginPage() {
  const { user, isLoading, sessionError, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
      setPassword("");
    } catch (caughtError) {
      setError(
        caughtError instanceof TypeError
          ? "Não foi possível conectar ao servidor. Verifique se o backend está em execução."
          : caughtError instanceof Error
            ? caughtError.message
            : "Não foi possível entrar. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (user) return <Navigate to="/agendamentos" replace />;

  return (
    <main className="page-shell">
      <section className="welcome-panel" aria-label="Apresentação do portal">
        <Brand />
        <div className="welcome-content">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> CUIDADO EM CADA DETALHE
          </div>
          <h1>
            Mais cuidado.
            <br />
            <span>Mais perto de você.</span>
          </h1>
          <p>
            Um espaço para acompanhar seus exames e acessar seus laudos com
            tranquilidade.
          </p>
          <div className="welcome-divider" />
          <div className="welcome-note">
            <span className="note-icon" aria-hidden="true">
              <Asterisk size={20} />
            </span>
            <span>
              Saúde começa com atenção.
              <br />
              <strong>Conte com a gente.</strong>
            </span>
          </div>
        </div>
        <div className="panel-decoration" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="panel-footer">
          AURORA SAÚDE <span>·</span> SEU PORTAL DE EXAMES
        </p>
      </section>
      <section className="access-panel" aria-labelledby="access-title">
        <div className="access-content">
          <div className="access-icon" aria-hidden="true">
            <LockKeyhole size={24} />
          </div>
          {isLoading ? (
            <div role="status" className="loading">
              Verificando sua sessão...
            </div>
          ) : (
            <>
              <p className="section-label">BEM-VINDO AO PORTAL</p>
              <h2 id="access-title">Acesse sua conta</h2>
              <p className="description">
                Entre com seus dados para continuar.
              </p>
              <form
                className="login-form"
                onSubmit={(event) => void handleLogin(event)}
              >
                <TextField
                  id="email"
                  label="E-mail"
                  type="email"
                  autoComplete="username"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <TextField
                  id="password"
                  label="Senha"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={
                              showPassword ? "Ocultar senha" : "Mostrar senha"
                            }
                            aria-pressed={showPassword}
                            edge="end"
                          >
                            {showPassword ? (
                              <EyeOff size={19} />
                            ) : (
                              <Eye size={19} />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  required
                />
                {(error || sessionError) && (
                  <p className="form-error" role="alert">
                    {error || sessionError}
                  </p>
                )}
                <button
                  className="primary-button"
                  type="submit"
                  disabled={isSubmitting}
                >
                  <span>
                    {isSubmitting ? "Entrando..." : "Entrar no portal"}
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              </form>
            </>
          )}
        </div>
        <footer className="access-footer">
          <span>© Aurora Saúde</span>
          <span>Seu cuidado em boas mãos.</span>
        </footer>
      </section>
    </main>
  );
}
