import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/Login.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import AppShell from "./components/layout/AppShell.jsx";
import { useSelector } from "react-redux";
import EmployeesPage from "./pages/EmployeesPage.jsx";
import EmployeeDetailsPage from "./pages/EmployeesDetailPage.jsx";
import EmployeeFormPage from "./pages/EmployeeFormPage.jsx";
import TeamFormPage from "./pages/TeamFormPage.jsx";
import TeamsPage from "./pages/TeamPage.jsx";
import TeamDetailsPage from "./pages/TeamDetailsPage.jsx";
import LeavesPage from "./pages/LeavesPage.jsx";
import LeaveDetailsPage from "./pages/LeaveDetailsPage.jsx";
import LeaveFormPage from "./pages/LeaveFormPage.jsx";

function ProtectedRoute({ children }) {
  const isAuthenticated = useSelector(
    (state) => state.auth.isAuthenticated
  );

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppShell>
                <DashboardPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <AppShell>
                <EmployeesPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees/:id"
          element={
            <ProtectedRoute>
              <AppShell>
                <EmployeeDetailsPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees/new"
          element={
            <ProtectedRoute>
              <AppShell>
                <EmployeeFormPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees/:id/edit"
          element={
            <ProtectedRoute>
              <AppShell>
                <EmployeeFormPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        {/* TEAMS ROUTES */}

        <Route
          path="/teams"
          element={
            <ProtectedRoute>
              <AppShell>
                <TeamsPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams/new"
          element={
            <ProtectedRoute>
              <AppShell>
                <TeamFormPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teams/:id"
          element={
            <ProtectedRoute>
              <AppShell>
                <TeamDetailsPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teams/:id/edit"
          element={
            <ProtectedRoute>
              <AppShell>
                <TeamFormPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* LEAVES */}

        <Route
          path="/leaves"
          element={
            <ProtectedRoute>
              <AppShell>
                <LeavesPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/leaves/:id"
          element={
            <ProtectedRoute>
              <AppShell>
                <LeaveDetailsPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/leaves/new"
          element={
            <ProtectedRoute>
              <AppShell>
                <LeaveFormPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/leaves/:id/edit"
          element={
            <ProtectedRoute>
              <AppShell>
                <LeaveFormPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;