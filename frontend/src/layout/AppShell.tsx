import { type ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Topbar from "./Topbar";
import CommandPalette from "../components/CommandPalette";

const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement;
  return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable;
};

export default function AppShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const fullBleed = pathname === "/spatial";

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
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
    <div className="village flex flex-col h-full">
      <Topbar onOpenSearch={() => setPaletteOpen(true)} />
      <main className={`flex-1 overflow-y-auto thin-scroll ${fullBleed ? "p-6" : "px-8 pt-8 pb-12"}`}>
        <div key={pathname} className={fullBleed ? "h-full" : "max-w-[1280px] mx-auto"}>
          {children}
        </div>
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
