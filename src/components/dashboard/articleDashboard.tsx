import { useSwipeable } from 'react-swipeable';
import React, { useEffect, useState } from 'react';
import { article } from '@/api';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  ComposedChart,
  Treemap
} from 'recharts';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import { 
  CalendarIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  PackageIcon,
  DollarSignIcon,
  AlertCircleIcon,
  CheckIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  GaugeIcon,
  TagIcon
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format, subYears } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const ArticleDashboard = ({ firmId }: { firmId: number }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subYears(new Date(), 1),
    to: new Date()
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<any>({});

  const tabOrder = ['overview', 'stock', 'quality', 'prices', 'alerts'];
  
  const handleSwipe = (dir: 'left' | 'right') => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (dir === 'left' && currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    } else if (dir === 'right' && currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleSwipe('left'),
    onSwipedRight: () => handleSwipe('right'),
    trackMouse: true
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          simpleStats,
          stockAlerts,
          statusOverview,
          qualityScores,
          suspiciousArticles,
          priceTrends,
          stockHealth
        ] = await Promise.all([
          article.getSimpleStats(),
          article.getStockAlerts(),
          article.getStatusOverview(),
          article.getQualityScores(),
          article.getSuspiciousArticles(),
          article.getPriceTrends(),
          article.getStockHealth()
        ]);

        // Mock data for missing endpoints
        const mockCategoryDistribution = {
          categories: [],
          totalCategories: 0
        };
        
        const mockValueAnalysis: any[] = [];

        setStats({
          simpleStats,
          stockAlerts,
          statusOverview,
          qualityScores,
          suspiciousArticles,
          priceTrends,
          stockHealth,
          categoryDistribution: mockCategoryDistribution,
          valueAnalysis: mockValueAnalysis
        });
      } catch (err) {
        console.error('Failed to load article data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [firmId, dateRange]);

  // Formatters
  const currencyFormatter = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  const percentFormatter = (value: number) => 
    `${(value * 100).toFixed(1)}%`;

  // Data preparation
  const prepareChartData = () => {
    const statusData = stats.statusOverview?.statusCounts
      ? Object.entries(stats.statusOverview.statusCounts).map(([name, value]) => ({
          name,
          value
        }))
      : [];

    const stockValueData = stats.simpleStats?.topStockValueArticles?.slice(0, 5).map((article: any) => ({
      name: article.reference,
      value: article.value
    }));

    const qualityData = stats.qualityScores?.scores?.slice(0, 5).map((item: any) => ({
      name: item.reference,
      score: item.score
    }));

    const categoryData = stats.categoryDistribution?.categories?.map((category: any) => ({
      name: category.name,
      count: category.count,
      value: category.value
    }));

    const priceTrendData = [
      {
        name: 'Anciens',
        price: stats.priceTrends?.oldArticles?.averagePrice,
        count: stats.priceTrends?.oldArticles?.count
      },
      {
        name: 'Nouveaux',
        price: stats.priceTrends?.newArticles?.averagePrice,
        count: stats.priceTrends?.newArticles?.count
      }
    ];

    return {
      statusData,
      stockValueData,
      qualityData,
      categoryData,
      priceTrendData
    };
  };

  const { 
    statusData, 
    stockValueData, 
    qualityData,
    categoryData,
    priceTrendData
  } = prepareChartData();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-100px)]">
      <div className="space-y-4 p-4" {...swipeHandlers}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold">Tableau de bord des articles</h1>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className="w-[260px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Sélectionner une période</span>
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
            <Badge variant="outline" className="px-3 py-1">
              {dateRange?.from ? format(dateRange.from, 'dd MMM yyyy') : ''} - {dateRange?.to ? format(dateRange.to, 'dd MMM yyyy') : ''}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="quality">Qualité</TabsTrigger>
            <TabsTrigger value="prices">Prix</TabsTrigger>
            <TabsTrigger value="alerts">Alertes</TabsTrigger>
          </TabsList>

          {/* Add swipe indicators */}
          <div className="flex justify-center items-center gap-2">
            {tabOrder.map((tab) => (
              <div
                key={tab}
                className={`w-2 h-2 rounded-full ${
                  activeTab === tab ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Vue d'ensemble */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Total articles"
              value={stats.simpleStats?.totalArticles}
              icon={<PackageIcon className="h-4 w-4" />}
              onClick={() => {
                window.location.href = '/article/article-Lists'; // Adaptez selon votre route
              }}
            />
              <SummaryCard
                title="Valeur stock"
                value={stats.simpleStats?.totalStockAvailable}
                icon={<DollarSignIcon className="h-4 w-4" />}
                formatter={currencyFormatter}
              />
              <SummaryCard
                title="En rupture"
                value={stats.simpleStats?.outOfStockCount}
                icon={<AlertCircleIcon className="h-4 w-4" />}
              />
              <SummaryCard
                title="Santé stock"
                value={stats.stockHealth?.activePercentage}
                change={stats.stockHealth?.change}
                icon={<GaugeIcon className="h-4 w-4" />}
                formatter={percentFormatter}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Répartition par statut</CardTitle>
                  <CardDescription>Distribution des articles par statut</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value, 'Articles']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top valeur de stock</CardTitle>
                  <CardDescription>Articles avec la plus grande valeur de stock</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={stockValueData}
                      margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip 
                        formatter={(value) => [currencyFormatter(Number(value)), 'Valeur']}
                      />
                      <Legend />
                      <Bar dataKey="value" name="Valeur stock" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Synthèse globale</CardTitle>
                <CardDescription>Performance globale des articles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatBlock 
                    title="Articles actifs" 
                    value={stats.statusOverview?.activeCount} 
                    description="Disponibles" 
                  />
                  <StatBlock 
                    title="Moyenne qualité" 
                    value={stats.qualityScores?.averageScore} 
                    formatter={(val) => `${Math.round(val)}%`}
                    description="Score moyen" 
                  />
                  <StatBlock 
                    title="Évolution prix" 
                    value={stats.priceTrends?.priceEvolution?.percentage} 
                    formatter={(val) => `${val > 0 ? '+' : ''}${Math.round(val)}%`}
                    description={stats.priceTrends?.priceEvolution?.trend === 'up' ? 'Hausse' : 'Baisse'} 
                  />
                  <StatBlock 
                    title="Catégories" 
                    value={stats.categoryDistribution?.totalCategories} 
                    description="Diversité" 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vue stock */}
          <TabsContent value="stock" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Répartition par catégorie</CardTitle>
                  <CardDescription>Distribution des articles par catégorie</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                      <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'count' ? value : currencyFormatter(Number(value)),
                          name === 'count' ? 'Nombre' : 'Valeur'
                        ]}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="count" name="Nombre" fill="#8884d8" />
                      <Bar yAxisId="right" dataKey="value" name="Valeur" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Analyse de valeur</CardTitle>
                  <CardDescription>Relation entre quantité et valeur</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 20, right: 20, bottom: 20, left: 40 }}
                    >
                      <CartesianGrid />
                      <XAxis
                        type="number"
                        dataKey="quantity"
                        name="Quantité"
                        unit="unités"
                      />
                      <YAxis
                        type="number"
                        dataKey="value"
                        name="Valeur"
                        tickFormatter={(value) => currencyFormatter(value).replace('€', '').trim()}
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(value, name) => [
                          name === 'quantity' ? value : currencyFormatter(Number(value)),
                          name === 'quantity' ? 'Quantité' : 'Valeur'
                        ]}
                      />
                      <Scatter
                        name="Articles"
                        data={stats.valueAnalysis}
                        fill="#8884d8"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Stock moyen</CardTitle>
                  <CardDescription>Quantité moyenne par article</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {Math.round(stats.simpleStats?.averageStockPerArticle || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rotation stock</CardTitle>
                  <CardDescription>Ratio de rotation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {stats.stockHealth?.turnoverRate?.toFixed(2) || 'N/A'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Stock dormant</CardTitle>
                  <CardDescription>Articles non vendus</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Articles</div>
                      <div className="text-2xl font-bold">
                        {stats.stockAlerts?.slowMoving?.length || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Valeur</div>
                      <div className="text-2xl font-bold">
                        {currencyFormatter(stats.stockAlerts?.slowMovingValue || 0)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Vue qualité */}
          <TabsContent value="quality" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top qualité</CardTitle>
                  <CardDescription>Meilleurs scores de qualité</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={qualityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Score']}
                      />
                      <Legend />
                      <Bar dataKey="score" name="Score qualité" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Analyse qualité</CardTitle>
                  <CardDescription>Répartition des scores</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.qualityScores?.scoreDistribution}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="range" />
                      <PolarRadiusAxis angle={30} domain={[0, 'dataMax + 10']} />
                      <Radar
                        name="Articles"
                        dataKey="count"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Détails qualité</CardTitle>
                <CardDescription>Analyse détaillée de la qualité</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatBlock 
                    title="Incomplets" 
                    value={stats.qualityScores?.incompleteCount} 
                    description="Articles" 
                  />
                  <StatBlock 
                    title="Sans image" 
                    value={stats.qualityScores?.noImageCount} 
                    description="Articles" 
                  />
                  <StatBlock 
                    title="Sans description" 
                    value={stats.qualityScores?.noDescriptionCount} 
                    description="Articles" 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vue prix */}
          <TabsContent value="prices" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Comparaison prix</CardTitle>
                  <CardDescription>Anciens vs nouveaux articles</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priceTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'count' ? value : currencyFormatter(Number(value)),
                          name === 'count' ? 'Nombre' : 'Prix moyen'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="price" name="Prix moyen" fill="#8884d8" />
                      <Bar dataKey="count" name="Nombre" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Évolution des prix</CardTitle>
                  <CardDescription>Tendance sur la période</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.priceTrends?.monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [currencyFormatter(Number(value)), 'Prix moyen']}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="averagePrice" name="Prix moyen" stroke="#8884d8" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Prix minimum</CardTitle>
                  <CardDescription>Article le moins cher</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {currencyFormatter(stats.priceTrends?.minPrice?.price || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {stats.priceTrends?.minPrice?.reference || 'N/A'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Prix maximum</CardTitle>
                  <CardDescription>Article le plus cher</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {currencyFormatter(stats.priceTrends?.maxPrice?.price || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {stats.priceTrends?.maxPrice?.reference || 'N/A'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Écart prix</CardTitle>
                  <CardDescription>Différence max-min</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {currencyFormatter(
                      (stats.priceTrends?.maxPrice?.price || 0) - 
                      (stats.priceTrends?.minPrice?.price || 0)
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Vue alertes */}
          <TabsContent value="alerts" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Alertes stock</CardTitle>
                  <CardDescription>Articles en rupture ou stock faible</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-red-500 flex items-center gap-2">
                        <AlertCircleIcon className="h-4 w-4" />
                        En rupture ({stats.stockAlerts?.outOfStock?.length || 0})
                      </h3>
                      <div className="mt-2 space-y-2">
                        {stats.stockAlerts?.outOfStock?.slice(0, 3).map((item: any) => (
                          <div key={item.reference} className="flex justify-between items-center p-2 border rounded">
                            <div>
                              <p className="font-medium">{item.reference}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.daysOutOfStock} jours sans stock
                              </p>
                            </div>
                            <Badge variant="destructive">Rupture</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-medium text-yellow-500 flex items-center gap-2">
                        <AlertCircleIcon className="h-4 w-4" />
                        Stock faible ({stats.stockAlerts?.lowStock?.length || 0})
                      </h3>
                      <div className="mt-2 space-y-2">
                        {stats.stockAlerts?.lowStock?.slice(0, 3).map((item: any) => (
                          <div key={item.reference} className="flex justify-between items-center p-2 border rounded">
                            <div>
                              <p className="font-medium">{item.reference}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.remainingStock} unités restantes
                              </p>
                            </div>
                            <Badge variant="warning">Faible</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Articles suspects</CardTitle>
                  <CardDescription>Anomalies détectées</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-red-500 flex items-center gap-2">
                        <AlertCircleIcon className="h-4 w-4" />
                        Prix à 0 ({stats.suspiciousArticles?.zeroPrice?.length || 0})
                      </h3>
                      <div className="mt-2 space-y-2">
                        {stats.suspiciousArticles?.zeroPrice?.slice(0, 3).map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center p-2 border rounded">
                            <p className="font-medium">{item.reference}</p>
                            <Badge variant="destructive">Erreur</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-medium text-yellow-500 flex items-center gap-2">
                        <AlertCircleIcon className="h-4 w-4" />
                        Stock élevé ({stats.suspiciousArticles?.highStock?.length || 0})
                      </h3>
                      <div className="mt-2 space-y-2">
                        {stats.suspiciousArticles?.highStock?.slice(0, 3).map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center p-2 border rounded">
                            <div>
                              <p className="font-medium">{item.reference}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} unités
                              </p>
                            </div>
                            <Badge variant="warning">Anomalie</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Résumé des alertes</CardTitle>
                <CardDescription>Synthèse des problèmes détectés</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatBlock 
                    title="Total alertes" 
                    value={
                      (stats.stockAlerts?.outOfStock?.length || 0) + 
                      (stats.stockAlerts?.lowStock?.length || 0) +
                      (stats.suspiciousArticles?.zeroPrice?.length || 0) +
                      (stats.suspiciousArticles?.highStock?.length || 0)
                    } 
                    description="Problèmes détectés" 
                  />
                  <StatBlock 
                    title="Valeur à risque" 
                    value={stats.stockAlerts?.atRiskValue} 
                    formatter={currencyFormatter}
                    description="Stock problématique" 
                  />
                  <StatBlock 
                    title="Références invalides" 
                    value={stats.suspiciousArticles?.invalidReference?.length || 0} 
                    description="À corriger" 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
};

// Composants utilitaires
const SummaryCard = ({
  title,
  value,
  change,
  icon,
  formatter = (val: any) => val,
  onClick
}: {
  title: string;
  value: number;
  change?: number;
  icon?: React.ReactNode;
  formatter?: (val: any) => string;
  onClick?: () => void;
}) => {
  const isPositive = change && change >= 0;

  return (
    <Card onClick={onClick} className={onClick ? "cursor-pointer hover:bg-gray-50 transition-colors" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatter(value)}</div>
        {change !== undefined && (
          <p className={`text-xs flex items-center ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
            {Math.abs(change)}% vs période précédente
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const StatBlock = ({
  title,
  value,
  description,
  formatter = (val: any) => val
}: {
  title: string;
  value: number;
  description: string;
  formatter?: (val: any) => string;
}) => {
  return (
    <div className="flex flex-col">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="text-2xl font-bold">{formatter(value)}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
};