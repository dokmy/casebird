import { ErrorReportButton } from "@/components/ui/error-report-button";
import { CaseViewerLayout } from "@/components/cap/CaseViewerLayout";

export default function CapLayout({ children }: { children: React.ReactNode }) {
  return (
    <CaseViewerLayout>
      {children}
      <ErrorReportButton />
    </CaseViewerLayout>
  );
}
