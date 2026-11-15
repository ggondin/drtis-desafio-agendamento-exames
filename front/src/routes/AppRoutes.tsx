import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "../layouts/AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";

const LoginPage = lazy(() =>
  import("../pages/login/LoginPage").then((module) => ({
    default: module.LoginPage,
  })),
);
const AppointmentsPage = lazy(() =>
  import("../pages/appointments/AppointmentsPage").then((module) => ({
    default: module.AppointmentsPage,
  })),
);
const ReportPage = lazy(() =>
  import("../pages/reports/ReportPage").then((module) => ({
    default: module.ReportPage,
  })),
);

export function AppRoutes() {
  return (
    <Suspense
      fallback={
        <p className="route-message" role="status">
          Carregando página...
        </p>
      }
    >
      <Routes>
        <Route path="/entrar" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/agendamentos" element={<AppointmentsPage />} />
            <Route
              path="/agendamentos/:appointmentId/laudo"
              element={<ReportPage />}
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/agendamentos" replace />} />
      </Routes>
    </Suspense>
  );
}
