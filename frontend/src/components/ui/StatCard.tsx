import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import AnimatedNumber from "./AnimatedNumber";

export default function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  delta,
  deltaGood = "up",
  trend,
  color = "#1C1C1C",
  onClick,
  active,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  delta?: number;
  deltaGood?: "up" | "down";
  trend?: number[];
  color?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const good = delta === undefined ? true : deltaGood === "up" ? delta >= 0 : delta <= 0;
  const id = `sp-${Array.from(label).map((c) => c.charCodeAt(0).toString(36)).join("")}`;

  return (
    <button
      onClick={onClick}
      className={`card card-hover p-6 text-left w-full group relative overflow-hidden ${
        active ? "ring-2 ring-ink border-ink" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <p className="text-[14px] font-semibold text-text-secondary">{label}</p>
        <div
          className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110"
          style={{ background: `${color}33`, color: "#24352B" }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="font-title text-[40px] leading-none mt-2">
        <AnimatedNumber value={value} />
        {suffix && <span className="text-[16px] font-semibold text-text-muted ml-0.5">{suffix}</span>}
      </p>
      {trend && (
        <div className="h-[44px] -mx-1 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend.map((v, i) => ({ i, v }))} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                cursor={{ stroke: color, strokeOpacity: 0.25 }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="px-2 py-1 rounded-md bg-ink text-white text-[11px] font-semibold">{payload[0].value}</div>
                  ) : null
                }
              />
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${id})`} animationDuration={1100} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {delta !== undefined && (
        <p className={`text-[11.5px] font-semibold mt-1 inline-flex items-center gap-1 ${good ? "text-status-ok" : "text-status-error"}`}>
          {delta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {delta > 0 ? "+" : ""}
          {delta}
          <span className="text-text-muted font-medium">지난달 대비</span>
        </p>
      )}
    </button>
  );
}
