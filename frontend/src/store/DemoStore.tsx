import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { type Facility, type FnCode } from "../data/constants";
import { FACILITIES } from "../data/demo";

export type Decision = "pending" | "accepted" | "rejected";

interface Store {
  facilities: Facility[];
  addFacility: (f: Facility) => void;
  fnDecisions: Record<FnCode, Decision>;
  setFnDecision: (code: FnCode, d: Decision) => void;
  fnNotes: Record<FnCode, string>;
  setFnNote: (code: FnCode, note: string) => void;
  picks: Record<FnCode, string | null>;
  setPick: (code: FnCode, id: string | null) => void;
  excluded: Set<string>;
  toggleExcluded: (key: string) => void;
  reviewed: Record<FnCode, boolean>;
  setReviewed: (code: FnCode, v: boolean) => void;
  reviewDone: boolean;
  setReviewDone: (v: boolean) => void;
}

const Ctx = createContext<Store | null>(null);

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [facilities, setFacilities] = useState<Facility[]>(FACILITIES);
  const [fnDecisions, setFnDecisions] = useState<Record<FnCode, Decision>>({
    F01: "accepted", F02: "pending", F03: "accepted", F04: "pending",
  });
  const [fnNotes, setFnNotes] = useState<Record<FnCode, string>>({ F01: "", F02: "", F03: "", F04: "" });
  const [picks, setPicks] = useState<Record<FnCode, string | null>>({ F01: "r1", F02: null, F03: "r6", F04: "r8" });
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [reviewed, setReviewedState] = useState<Record<FnCode, boolean>>({ F01: true, F02: false, F03: false, F04: false });
  const [reviewDone, setReviewDone] = useState(false);

  const value = useMemo<Store>(
    () => ({
      facilities,
      addFacility: (f) => setFacilities((prev) => [f, ...prev.filter((p) => p.entity_id !== f.entity_id)]),
      fnDecisions,
      setFnDecision: (code, d) => setFnDecisions((p) => ({ ...p, [code]: d })),
      fnNotes,
      setFnNote: (code, note) => setFnNotes((p) => ({ ...p, [code]: note })),
      picks,
      setPick: (code, id) => setPicks((p) => ({ ...p, [code]: id })),
      excluded,
      toggleExcluded: (key) =>
        setExcluded((prev) => {
          const n = new Set(prev);
          if (n.has(key)) n.delete(key);
          else n.add(key);
          return n;
        }),
      reviewed,
      setReviewed: (code, v) => setReviewedState((p) => ({ ...p, [code]: v })),
      reviewDone,
      setReviewDone,
    }),
    [facilities, fnDecisions, fnNotes, picks, excluded, reviewed, reviewDone],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemo must be used inside DemoStoreProvider");
  return v;
}
