import { Database } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";

export default function DataManagement() {
  return (
    <div>
      <PageHeader
        en="Data Management"
        title="데이터 관리"
        desc="분석에 활용된 데이터의 출처와 검증 상태를 확인하고 관리합니다."
      />
      <div className="card p-5">
        <EmptyState icon={Database} message="데이터 관리 API가 연결되면 활성화됩니다." />
      </div>
    </div>
  );
}
