import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, PauseCircle, Save, PartyPopper, AlertTriangle, MessageSquarePlus } from "lucide-react";
import PageHeader, { DemoTag } from "../components/ui/PageHeader";
import FlowStepper from "../components/ui/FlowStepper";
import StatusBadge from "../components/ui/StatusBadge";
import Donut from "../components/ui/Donut";
import { CANDIDATES, FUNCTIONS, FUNCTION_RESULTS, RESOURCE_TYPES, totalScore } from "../data/demo";
import { useDemo } from "../store/DemoStore";
import { useToast } from "../components/ui/Toast";
import { FacilityStrip } from "./FunctionAnalysis";

const TEMPLATES = ["이동장터 정차 지점 협의 필요", "농협 배송 최소 주문금액 조정 요청", "마을회관 이장 동의 확인 완료", "현장 재조사 후 재검토"];

const DECISION_BADGE = {
  accepted: { v: "confirmed" as const, t: "기능 있음" },
  rejected: { v: "muted" as const, t: "해당 없음" },
  pending: { v: "review" as const, t: "판단 보류" },
};

function Confetti() {
  const colors = ["#7BB58A", "#4F8A68", "#B39443", "#857F72", "#B9DABF", "#D8CB98"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 60 }, (_, i) => {
        const left = (i * 37) % 100;
        const delay = (i % 10) * 0.05;
        const dur = 1.4 + ((i * 13) % 10) / 10;
        return (
          <span
            key={i}
            className="absolute top-[-10px] w-2 h-3 rounded-[2px]"
            style={{ left: `${left}%`, background: colors[i % colors.length], animation: `confetti ${dur}s ${delay}s cubic-bezier(.2,.6,.4,1) forwards`, transform: `rotate(${i * 29}deg)` }}
          />
        );
      })}
      <style>{`@keyframes confetti{0%{opacity:1;transform:translateY(0) rotate(0)}100%{opacity:0;transform:translateY(520px) rotate(540deg)}}`}</style>
    </div>
  );
}

export default function Review() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const { fnDecisions, fnNotes, picks, reviewed, setReviewed, reviewDone, setReviewDone } = useDemo();
  const [open, setOpen] = useState<string | null>("F01");
  const [comment, setComment] = useState("");
  const [shake, setShake] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const done = FUNCTIONS.filter((f) => reviewed[f.code]).length;
  const picked = FUNCTIONS.filter((f) => picks[f.code]).length;
  const issues = FUNCTIONS.filter((f) => fnDecisions[f.code] === "pending" || !picks[f.code]).length;

  const complete = () => {
    if (done < 4) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      toast({ kind: "warn", title: `${4 - done}개 기능 확인이 남았습니다`, desc: "각 행의 체크를 눌러 확인해 주세요." });
      return;
    }
    setReviewDone(true);
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 2600);
  };

  return (
    <div>
      <PageHeader
        eyebrow={<FlowStepper />}
        title="최종 제안 검토"
        badge={<>{reviewDone ? <StatusBadge variant="confirmed" dot>검토 완료</StatusBadge> : <StatusBadge variant="review" dot>검토 중</StatusBadge>}<DemoTag /></>}
        desc="기능별 상속안과 근거를 마지막으로 확인하고 제안 내용을 확정합니다."
      />

      <FacilityStrip />

      <div className="grid grid-cols-12 gap-5 items-start">
        <div className={`col-span-8 space-y-5 ${shake ? "animate-shake" : ""}`}>
          <div className="card p-5 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[16px] font-bold text-action">기능별 검토</h2>
                <p className="text-[12px] text-text-muted mt-0.5">행을 펼쳐 근거를 확인하고, 오른쪽 체크로 확인 처리하세요</p>
              </div>
              <button
                onClick={() => FUNCTIONS.forEach((f) => setReviewed(f.code, true))}
                className="btn btn-ghost btn-sm"
              >
                <Check className="w-3.5 h-3.5" /> 모두 확인
              </button>
            </div>

            <div className="space-y-2 stagger">
              {FUNCTIONS.map((f) => {
                const cand = CANDIDATES.find((c) => c.id === picks[f.code]);
                const res = FUNCTION_RESULTS.find((r) => r.code === f.code)!;
                const isOpen = open === f.code;
                const ok = reviewed[f.code];
                const db = DECISION_BADGE[fnDecisions[f.code]];
                return (
                  <div key={f.code} className={`rounded-2xl border transition-all ${isOpen ? "border-border-strong bg-surface-tint" : "border-border hover:border-border-strong"}`}>
                    <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setOpen(isOpen ? null : f.code)}>
                      <span className="w-1.5 h-10 rounded-full" style={{ background: f.hex }} />
                      <div className="w-[150px]">
                        <p className="text-[11px] font-bold" style={{ color: f.hex }}>{f.code}</p>
                        <p className="text-[14px] font-bold">{f.name}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-text-muted">상속 자원</p>
                        <p className={`text-[13px] font-semibold truncate ${cand ? "" : "text-status-warn"}`}>{cand ? cand.name : "미지정 — 상속안 단계에서 선택"}</p>
                      </div>
                      <StatusBadge variant={db.v}>{db.t}</StatusBadge>
                      <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                      <button
                        onClick={(e) => { e.stopPropagation(); setReviewed(f.code, !ok); }}
                        className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all active:scale-90 ${ok ? "bg-status-ok border-status-ok text-white" : "border-border-strong text-transparent hover:text-text-muted"}`}
                        title="담당자 확인"
                      >
                        <Check className={`w-4 h-4 ${ok ? "animate-pop" : ""}`} strokeWidth={3} />
                      </button>
                    </div>
                    <div className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(.2,.7,.2,1)]" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                      <div className="overflow-hidden">
                        <div className="px-4 pb-4 pl-[38px] grid grid-cols-3 gap-4 text-[12.5px]">
                          <div>
                            <p className="text-text-muted text-[11px] mb-1">분석 근거</p>
                            <p className="font-medium">{res.evidence}</p>
                            <p className="text-text-muted text-[11px] mt-1">신뢰도 {Math.round((res.confidence ?? 0) * 100)}% · {res.source}</p>
                          </div>
                          <div>
                            <p className="text-text-muted text-[11px] mb-1">추천 근거</p>
                            {cand ? (
                              <>
                                <p className="font-medium">{RESOURCE_TYPES[cand.type]} · {cand.distanceKm}km · {cand.weekly}</p>
                                <p className="text-text-muted text-[11px] mt-1">종합 점수 {totalScore(cand)}점 · {cand.note}</p>
                              </>
                            ) : (
                              <button onClick={() => navigate(`/closures/${id}/inheritance`)} className="text-brand font-semibold hover:underline">상속안 지정하러 가기 →</button>
                            )}
                          </div>
                          <div>
                            <p className="text-text-muted text-[11px] mb-1">담당자 메모</p>
                            <p className={fnNotes[f.code] ? "font-medium" : "text-text-muted"}>{fnNotes[f.code] || "메모 없음"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-5 animate-fade-up">
            <h2 className="text-[16px] font-bold text-action mb-3">검토 의견</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t}
                  onClick={() => setComment((c) => (c ? `${c}\n· ${t}` : `· ${t}`))}
                  className="h-8 px-3 rounded-lg border border-dashed border-border-strong text-[12px] text-text-secondary hover:border-brand hover:text-brand hover:bg-brand-soft transition-all inline-flex items-center gap-1.5"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" /> {t}
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="상속안 수정 사유, 운영 조건 확인 결과 등 검토 의견을 입력하세요."
              rows={5}
              className="field resize-none"
            />
          </div>
        </div>

        {/* summary */}
        <aside className="col-span-4 sticky top-4 space-y-4 animate-fade-up" style={{ animationDelay: ".1s" }}>
          <div className="card p-6 relative overflow-hidden">
            {celebrate && <Confetti />}
            <div className="flex justify-center">
              <Donut
                size={170}
                thickness={18}
                slices={FUNCTIONS.map((f) => ({ key: f.code, value: 25, color: reviewed[f.code] ? f.hex : "#E9EFF2" }))}
                center={
                  reviewDone ? (
                    <div className="animate-pop">
                      <PartyPopper className="w-8 h-8 text-brand mx-auto" />
                      <p className="text-[13px] font-bold mt-1">검토 완료</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[34px] font-bold leading-none tnum">{done}<span className="text-[16px] text-text-muted">/4</span></p>
                      <p className="text-[11px] text-text-muted mt-1">기능 확인</p>
                    </div>
                  )
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-5 text-center">
              {[
                { k: "분석 기능", v: "4개" },
                { k: "상속안", v: `${picked}/4` },
                { k: "확인 필요", v: `${issues}건`, warn: issues > 0 },
              ].map((x) => (
                <div key={x.k} className="rounded-xl bg-surface-tint border border-border py-2.5">
                  <p className="text-[11px] text-text-muted">{x.k}</p>
                  <p className={`text-[15px] font-bold tnum ${x.warn ? "text-status-warn" : ""}`}>{x.v}</p>
                </div>
              ))}
            </div>
            {issues > 0 && !reviewDone && (
              <p className="mt-4 text-[12px] text-status-warn flex items-start gap-1.5 bg-[#FBF1E4] rounded-xl p-3">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                판단 보류 또는 상속 자원 미지정 항목이 있습니다. 확인 후 진행을 권장합니다.
              </p>
            )}
          </div>

          <div className="card p-4 space-y-2">
            <button
              onClick={complete}
              className={`btn w-full !h-12 text-white transition-all ${reviewDone ? "bg-status-ok" : "btn-primary"}`}
            >
              {reviewDone ? <><Check className="w-4 h-4" strokeWidth={3} /> 검토 완료됨</> : "검토 완료"}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => toast({ kind: "info", title: "검토를 보류했습니다" })} className="btn btn-ghost"><PauseCircle className="w-4 h-4" /> 보류</button>
              <button onClick={() => toast({ title: "수정 사항을 저장했습니다" })} className="btn btn-ghost"><Save className="w-4 h-4" /> 저장</button>
            </div>
            {reviewDone && (
              <p className="text-[11px] text-text-muted text-center pt-1 animate-fade-in">
                담당자 검토 완료를 의미하며, 공식적인 행정 승인과는 구분됩니다.
                <button onClick={() => setReviewDone(false)} className="ml-1 text-brand font-semibold hover:underline">되돌리기</button>
              </p>
            )}
          </div>

          <button onClick={() => navigate(`/closures/${id}/inheritance`)} className="btn btn-ghost w-full"><ArrowLeft className="w-4 h-4" /> 상속안 단계로</button>
        </aside>
      </div>
    </div>
  );
}
