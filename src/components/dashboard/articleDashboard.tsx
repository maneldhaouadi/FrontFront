import React, { useEffect, useState } from 'react';
import { article } from '@/api';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar,
  Package,
  DollarSign,
  AlertTriangle,
  Activity,
  PieChart as PieChartIcon,
  BarChart2,
  AlertOctagon,
  Star
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format, subYears } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/common/Spinner';
import { useTranslation } from 'react-i18next';
import { useBreadcrumb } from '@/components/layout/BreadcrumbContext';

// Nouvelles couleurs plus douces
const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
const STATUS_COLORS: Record<string, string> = {
  'draft': '#94a3b8',
  'active': '#10b981',
  'inactive': '#64748b',
  'archived': '#8b5cf6',
  'out_of_stock': '#ef4444',
  'pending_review': '#f59e0b'
};

const STOCK_COLORS = {
  healthy: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  inactive: '#94a3b8'
};

export const ArticleDashboard = ({ firmId }: { firmId: number }) => {
  const { t } = useTranslation('dashboard');
  const { setRoutes } = useBreadcrumb();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subYears(new Date(), 1),
    to: new Date()
  });
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    setRoutes([
      { title: t('Tableau de bord'), href: '/dashboard' },
      { title: t('Articles') }
    ]);
  }, [t, setRoutes]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          simpleStats,
          stockAlerts,
          statusOverview,
          priceTrends,
          stockHealth,
          simplifiedStock,
          topValuedArticles
        ] = await Promise.all([
          article.getSimpleStats(),
          article.getStockAlerts(),
          article.getStatusOverview(),
          article.getPriceTrends(),
          article.getStockHealth(),
          article.getSimplifiedStockStatus(),
          article.getTopValuedArticles()
        ]);

        setStats({
          simpleStats,
          stockAlerts,
          statusOverview,
          priceTrends,
          stockHealth,
          simplifiedStock,
          topValuedArticles
        });
      } catch (err) {
        console.error('Failed to load article data:', err);
        setError(t('Erreur lors du chargement des données'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [firmId, dateRange, t]);

  const currencyFormatter = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  const percentFormatter = (value: number) => 
    `${(value * 100).toFixed(1)}%`;

  const prepareChartData = () => {
    const statusData = stats.statusOverview?.counts
      ? Object.entries(stats.statusOverview.counts).map(([name, value]) => ({
          name: t(`${name}`),
          value,
          color: STATUS_COLORS[name] || COLORS[0]
        }))
      : [];

    const stockStatusData = stats.simplifiedStock
      ? [
          { name: t('Sain'), value: stats.simplifiedStock.healthy, color: STOCK_COLORS.healthy },
          { name: t('Avertissement'), value: stats.simplifiedStock.warning, color: STOCK_COLORS.warning },
          { name: t('Danger'), value: stats.simplifiedStock.danger, color: STOCK_COLORS.danger },
          { name: t('Inactif'), value: stats.simplifiedStock.inactive, color: STOCK_COLORS.inactive }
        ]
      : [];

    return { statusData, stockStatusData };
  };

  const { statusData, stockStatusData } = prepareChartData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="medium" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-4 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            className="h-10 px-6"
          >
            {t('Réessayer')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-180px)]">
      <div className="container py-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('Tableau de bord des articles')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('Vue d\'ensemble de votre inventaire')}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 px-4"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                        {format(dateRange.to, "dd/MM/yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy")
                    )
                  ) : (
                    <span>{t('Sélectionner une période')}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title={t('Total articles')}
            value={stats.simpleStats?.totalArticles || 0}
            icon={<Package className="h-4 w-4" />}
          />
          <SummaryCard
            title={t('Valeur totale')}
            value={stats.simpleStats?.totalValue || 0}
            icon={<DollarSign className="h-4 w-4" />}
            formatter={currencyFormatter}
          />
          <SummaryCard
            title={t('Alertes actives')}
            value={
              (stats.stockAlerts?.outOfStock?.length || 0) + 
              (stats.stockAlerts?.lowStock?.length || 0)
            }
            icon={<AlertOctagon className="h-4 w-4 text-yellow-600" />}
          />
          <SummaryCard
            title={t('Santé stock')}
            value={(stats.stockHealth?.activePercentage || 0) / 100}
            change={stats.stockHealth?.change}
            icon={<Activity className="h-4 w-4 text-blue-600" />}
            formatter={percentFormatter}
          />
        </div>

        {/* Deux cartes séparées pour les graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Carte pour le graphique circulaire */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-indigo-600" />
                {t('Répartition par statut')}
              </CardTitle>
              <CardDescription>
                {t('Distribution des articles par statut')}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} articles`, 'Quantité']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Carte pour le graphique à barres */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-emerald-600" />
                {t('État du stock')}
              </CardTitle>
              <CardDescription>
                {t('Répartition des articles par état de stock')}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={stockStatusData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    name="Nombre d'articles"
                    barSize={30}
                  >
                    {stockStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                {t('Alertes stock')}
              </CardTitle>
              <CardDescription>
                {t('Articles en rupture ou stock faible')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium flex items-center gap-2 text-red-600">
                  {t('En rupture')} ({stats.stockAlerts?.outOfStock?.length || 0})
                </h3>
                <div className="mt-2 space-y-2">
                  {stats.stockAlerts?.outOfStock?.slice(0, 5).map((item: any) => (
                    <div key={item.reference} className="p-3 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{item.reference}</p>
                          <p className="text-sm text-muted-foreground">{item.title}</p>
                        </div>
                        <Badge variant="destructive" className="ml-2">
                          {t('Rupture')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.daysOutOfStock} {t('jours sans stock')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="font-medium flex items-center gap-2 text-yellow-600">
                  {t('Stock faible')} ({stats.stockAlerts?.lowStock?.length || 0})
                </h3>
                <div className="mt-2 space-y-2">
                  {stats.stockAlerts?.lowStock?.slice(0, 5).map((item: any) => (
                    <div key={item.reference} className="p-3 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{item.reference}</p>
                          <p className="text-sm text-muted-foreground">{item.title}</p>
                        </div>
                        <Badge variant="warning" className="ml-2">
                          {item.remainingStock} {t('restants')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('Seuil critique')}: {item.criticalThreshold}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-blue-600" />
                {t('Articles les plus valorisés')}
              </CardTitle>
              <CardDescription>
                {t('Top 5 des articles avec la plus grande valeur en stock')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.topValuedArticles?.slice(0, 5).map((article: any, index: number) => (
                <div key={article.reference} className="p-3 border rounded-lg hover:bg-accent transition-colors">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{article.reference}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{article.title}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-medium">
                      {currencyFormatter(article.totalValue)}
                    </Badge>
                  </div>
                  <div className="flex justify-between mt-2 text-sm">
                    <span className="text-muted-foreground">
                      Stock: {article.quantityInStock}
                    </span>
                    <span className="text-muted-foreground">
                      Prix: {currencyFormatter(article.unitPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
};

const SummaryCard = ({
  title,
  value,
  change,
  icon,
  formatter = (val: any) => val,
}: {
  title: string;
  value: number;
  change?: number;
  icon?: React.ReactNode;
  formatter?: (val: any) => string;
}) => {
  const isPositive = change && change >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatter(value)}</div>
        {change !== undefined && (
          <p className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'} mt-1`}>
            {isPositive ? '↑' : '↓'} {Math.abs(change)}% {t('vs période précédente')}
          </p>
        )}
      </CardContent>
    </Card>
  );
};