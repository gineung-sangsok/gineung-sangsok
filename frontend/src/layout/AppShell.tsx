import { type ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import CommandPalette from "../components/CommandPalette";

const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement;
  return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable;
};

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const width = collapsed ? 76 : 248;
  const fullBleed = pathname === "/spatial";

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "[") setCollapsed((c) => !c);
      if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key.toLowerCase() === "n" && pathname !== "/closures/new") navigate("/closures/new");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [navigate, pathname]);

  return (
    <div className="flex h-full">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div
        className="flex-1 flex flex-col min-w-0 h-full transition-[margin] duration-300 ease-[cubic-bezier(.2,.7,.2,1)]"
        style={{ marginLeft: width }}
      >
        <Topbar onOpenSearch={() => setPaletteOpen(true)} />
        <main className={`flex-1 overflow-y-auto thin-scroll ${fullBleed ? "p-6" : "px-8 pt-4 pb-10"}`}>
          <div key={pathname} className={fullBleed ? "h-full" : "max-w-[1360px] mx-auto"}>
            {children}
          </div>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
