import { Carrot, House, Package, ShoppingBasket } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FN, type FnCode } from "../../data/demo";
import { HouseBadge } from "./HouseFrame";

export const FN_ICON: Record<FnCode, LucideIcon> = {
  F01: ShoppingBasket,
  F02: Carrot,
  F03: Package,
  F04: House,
};

/** 기능 코드별 아이콘을 기능 파스텔 색 원(또는 house면 집 모양) 안에 그린다. */
export default function FunctionIcon({ code, size = 48, house = false }: { code: FnCode; size?: number; house?: boolean }) {
  const Icon = FN_ICON[code];
  const { hex, deep } = FN[code];
  if (house) return <HouseBadge icon={Icon} fill={`${hex}99`} color={deep} size={size} />;
  return (
    <span
      className="rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
      style={{ width: size, height: size, background: `${hex}66`, color: deep }}
    >
      <Icon style={{ width: size * 0.48, height: size * 0.48 }} strokeWidth={2.1} />
    </span>
  );
}
