import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./components/pages/LoginPage";
import LoginSuccess from "./components/pages/LoginSuccess";
import Dashboard from "./Dashboard";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import HomeRedirect from "./components/pages/HomeRedirect";
import { AuthProvider } from "./components/auth/AuthContext";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Default route */}
          <Route path="/" element={<HomeRedirect />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/login-success" element={<LoginSuccess />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
