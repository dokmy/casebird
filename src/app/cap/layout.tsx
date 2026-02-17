import { ErrorReportButton } from "@/components/ui/error-report-button";

export default function CapLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ErrorReportButton />
    </>
  );
}
