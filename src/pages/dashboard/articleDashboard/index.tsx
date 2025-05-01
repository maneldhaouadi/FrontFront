import { ArticleDashboard } from "@/components/dashboard/articleDashboard";

export default function ArticlesDashboardPage() {
  // Vous pourriez récupérer l'ID de la firme depuis les props ou le contexte
  const firmId = 1; // À remplacer par la valeur dynamique

  return (
    <div className="container mx-auto py-4">
      <ArticleDashboard firmId={firmId} />
    </div>
  );
}