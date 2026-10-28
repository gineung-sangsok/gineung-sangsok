import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import AppShell from "./layout/AppShell";
import Dashboard from "./pages/Dashboard";
import ClosureRegister from "./pages/ClosureRegister";
import FunctionAnalysis from "./pages/FunctionAnalysis";
import Inheritance from "./pages/Inheritance";
import SpatialAnalysis from "./pages/SpatialAnalysis";
import DataManagement from "./pages/DataManagement";
import Review from "./pages/Review";
import { DemoStoreProvider } from "./store/DemoStore";
import { ToastProvider } from "./components/ui/Toast";

export default function App() {
  return (
    <BrowserRouter>
      <DemoStoreProvider>
        <ToastProvider>
          <AppShell>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/closures/new" element={<ClosureRegister />} />
              <Route path="/closures/:id/functions" element={<FunctionAnalysis />} />
              <Route path="/closures/:id/inheritance" element={<Inheritance />} />
              <Route path="/closures/:id/review" element={<Review />} />
              <Route path="/spatial" element={<SpatialAnalysis />} />
              <Route path="/data" element={<DataManagement />} />
            </Routes>
          </AppShell>
        </ToastProvider>
      </DemoStoreProvider>
      <Analytics />
    </BrowserRouter>
  );
}
