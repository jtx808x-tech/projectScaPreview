import "@/App.css";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LangProvider } from "@/context/LangContext";
import AppShell from "@/components/AppShell";
import Login from "@/views/Login";
// Stok
import Dashboard from "@/views/Dashboard";
import PaperMutations from "@/views/PaperMutations";
import InkMutations from "@/views/InkMutations";
import OtherMutations from "@/views/OtherMutations";
import StockReport from "@/views/StockReport";
import DetailReport from "@/views/DetailReport";
import LogsUsers from "@/views/LogsUsers";
import YearClose from "@/views/YearClose";
// HPP
import HppCalculator from "@/views/hpp/Calculator";
// PO Tracker
import PoDashboard from "@/views/po/PoDashboard";
import PoList from "@/views/po/PoList";
import PoForm from "@/views/po/PoForm";
import PoDetail from "@/views/po/PoDetail";
import PoCalendar from "@/views/po/PoCalendar";

function Protected({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <div className="flex h-screen items-center justify-center text-muted-foreground">Memuat…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireSuper({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <div className="flex h-screen items-center justify-center text-muted-foreground">Memuat…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "superadmin") return <Navigate to="/stok" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <AuthProvider>
          <LangProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Protected><AppShell /></Protected>}>
                  <Route index element={<Navigate to="/stok" replace />} />
                  {/* Stok tools */}
                  <Route path="stok" element={<Dashboard />} />
                  <Route path="stok/kertas" element={<PaperMutations />} />
                  <Route path="stok/tinta" element={<InkMutations />} />
                  <Route path="stok/lainnya" element={<OtherMutations />} />
                  <Route path="stok/laporan-stok" element={<StockReport />} />
                  <Route path="stok/laporan-detail" element={<RequireSuper><DetailReport /></RequireSuper>} />
                  <Route path="stok/log-user" element={<LogsUsers />} />
                  <Route path="stok/tutup-tahun" element={<YearClose />} />
                  {/* HPP tools — superadmin only */}
                  <Route path="hpp" element={<RequireSuper><HppCalculator /></RequireSuper>} />
                  {/* PO Tracker tools */}
                  <Route path="po" element={<PoDashboard />} />
                  <Route path="po/pos" element={<PoList />} />
                  <Route path="po/pos/new" element={<PoForm />} />
                  <Route path="po/pos/:id" element={<PoDetail />} />
                  <Route path="po/pos/:id/edit" element={<PoForm />} />
                  <Route path="po/kalender" element={<PoCalendar />} />
                  {/* Legacy aliases (backward compat) */}
                  <Route path="kertas" element={<Navigate to="/stok/kertas" replace />} />
                  <Route path="tinta" element={<Navigate to="/stok/tinta" replace />} />
                  <Route path="lainnya" element={<Navigate to="/stok/lainnya" replace />} />
                  <Route path="laporan-stok" element={<Navigate to="/stok/laporan-stok" replace />} />
                  <Route path="laporan-detail" element={<Navigate to="/stok/laporan-detail" replace />} />
                  <Route path="log-user" element={<Navigate to="/stok/log-user" replace />} />
                  <Route path="tutup-tahun" element={<Navigate to="/stok/tutup-tahun" replace />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
            <Toaster richColors position="top-right" />
          </LangProvider>
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
