import { InvoiceDashboard } from "@/components/dashboard/InvoiceDashboard";

export default function DashboardPage() {
  // Vous pourriez récupérer l'ID de la firme depuis les props ou le contexte
  const firmId = 1; // À remplacer par la valeur dynamique

  return (
    <div className="container mx-auto py-4">
      <InvoiceDashboard firmId={firmId} />
    </div>
  );
}