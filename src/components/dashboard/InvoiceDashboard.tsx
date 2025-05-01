import { useSwipeable } from 'react-swipeable';
import React, { useEffect, useState } from 'react';
import { expense_invoice } from '@/api/expense_invoice';
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

import { CalendarIcon, ArrowUpIcon, ArrowDownIcon } from '@radix-ui/react-icons';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format, subYears } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const InvoiceDashboard = ({ firmId }: { firmId: number }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subYears(new Date(), 1),
    to: new Date()
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<any>({});

  const tabOrder = ['overview', 'financial', 'articles', 'taxes', 'interlocutors'];
  
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

        const params = {
          firmId,
          startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
          endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined
        };

        const [
          financial,
          discountsTaxes,
          articles,
          misc,
          summary,
          status,
          monthly,
          interlocutors,
          payments,
          yearly
        ] = await Promise.all([
          expense_invoice.getFinancialStats(firmId),
          expense_invoice.getDiscountsTaxesStats(firmId),
          expense_invoice.getArticlesStats(firmId),
          expense_invoice.getMiscStats(firmId),
          expense_invoice.getInvoiceSummary(firmId),
          expense_invoice.getStatusDistribution(firmId),
          expense_invoice.getMonthlyTrends(firmId),
          expense_invoice.getTopInterlocutors(firmId),
          expense_invoice.getPaymentAnalysis(firmId),
          expense_invoice.getYearlySummary(firmId)
        ]);

        setStats({
          financial,
          discountsTaxes,
          articles,
          misc,
          summary,
          status,
          monthly,
          interlocutors,
          payments,
          yearly
        });
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
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
    const monthlyData = stats.monthly?.map((month: any) => ({
      name: month.month,
      amount: month.totalAmount,
      count: month.count
    }));

    const statusData = stats.status
      ? Object.entries(stats.status).map(([name, value]: [string, any]) => ({
          name,
          count: value.count,
          amount: value.totalAmount
        }))
      : [];

    const currencyData = stats.financial?.currencyDistribution
      ? Object.entries(stats.financial.currencyDistribution).map(([name, value]) => ({
          name,
          value
        }))
      : [];

    const discountTypesData = stats.discountsTaxes?.discountsByType
      ? Object.entries(stats.discountsTaxes.discountsByType).map(([name, value]) => ({
          name,
          value
        }))
      : [];

    const topTaxesData = stats.discountsTaxes?.topTaxes?.slice(0, 5).map((tax: any) => ({
      name: tax.taxName,
      value: tax.totalAmount,
      count: tax.count
    }));

    const topArticles = stats.articles?.topArticles?.slice(0, 5) || [];
    const topInterlocutors = stats.interlocutors?.slice(0, 5) || [];

    return {
      monthlyData,
      statusData,
      currencyData,
      discountTypesData,
      topTaxesData,
      topArticles,
      topInterlocutors
    };
  };

  const { 
    monthlyData, 
    statusData, 
    currencyData, 
    discountTypesData, 
    topTaxesData,
    topArticles, 
    topInterlocutors 
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
          <h1 className="text-2xl font-bold">Tableau de bord des dépenses</h1>
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
            <TabsTrigger value="financial">Financier</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="taxes">Taxes</TabsTrigger>
            <TabsTrigger value="interlocutors">Fournisseurs</TabsTrigger>
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
                title="Total des dépenses"
                value={stats.financial?.totalExpenses}
                change={stats.yearly?.change}
                icon={<CalendarIcon />}
                formatter={currencyFormatter}
              />
              <SummaryCard
                title="Moyenne par facture"
                value={stats.financial?.averageInvoiceAmount}
                change={stats.yearly?.averageChange}
                icon={<CalendarIcon />}
                formatter={currencyFormatter}
              />
              <SummaryCard
                title="Factures payées"
                value={stats.payments?.paid?.totalAmount}
                change={stats.payments?.paidChange}
                icon={<CalendarIcon />}
                formatter={currencyFormatter}
              />
              <SummaryCard
                title="Factures impayées"
                value={stats.payments?.unpaid?.totalAmount}
                change={stats.payments?.unpaidChange}
                icon={<CalendarIcon />}
                formatter={currencyFormatter}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tendance mensuelle</CardTitle>
                  <CardDescription>Évolution des dépenses par mois</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'count' ? value : currencyFormatter(Number(value)),
                          name === 'count' ? 'Nombre' : 'Montant'
                        ]}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="count" name="Nombre" fill="#8884d8" />
                      <Line yAxisId="right" type="monotone" dataKey="amount" name="Montant" stroke="#82ca9d" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Répartition par statut</CardTitle>
                  <CardDescription>Distribution des factures par statut</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={statusData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" />
                      <PolarRadiusAxis />
                      <Radar
                        name="Montant"
                        dataKey="amount"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Tooltip formatter={(value) => [currencyFormatter(Number(value)), 'Montant']} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Synthèse annuelle</CardTitle>
                <CardDescription>Performance globale sur la période</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatBlock 
                    title="Total factures" 
                    value={stats.summary?.totalInvoices} 
                    description="Nombre total" 
                  />
                  <StatBlock 
                    title="Montant total" 
                    value={stats.summary?.totalAmount} 
                    formatter={currencyFormatter}
                    description="Dépenses globales" 
                  />
                  <StatBlock 
                    title="Moyenne par facture" 
                    value={stats.summary?.averageAmount} 
                    formatter={currencyFormatter}
                    description="Montant moyen" 
                  />
                  <StatBlock 
                    title="Factures avec PJ" 
                    value={stats.misc?.invoicesWithAttachments} 
                    description="Pièces jointes" 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vue financière */}
          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Répartition des devises</CardTitle>
                  <CardDescription>Distribution par devise utilisée</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={currencyData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
          {currencyData.map((entry: any, index: number) => (
  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
))}

                      </Pie>
                      <Tooltip formatter={(value) => [percentFormatter(Number(value)), 'Pourcentage']} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payé vs Impayé</CardTitle>
                  <CardDescription>Comparaison des factures payées et impayées</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: 'Payé',
                          count: stats.payments?.paid?.count,
                          amount: stats.payments?.paid?.totalAmount
                        },
                        {
                          name: 'Impayé',
                          count: stats.payments?.unpaid?.count,
                          amount: stats.payments?.unpaid?.totalAmount
                        }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'count' ? value : currencyFormatter(Number(value)),
                          name === 'count' ? 'Nombre' : 'Montant'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="count" name="Nombre" fill="#8884d8" />
                      <Bar dataKey="amount" name="Montant" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Vue articles */}
          <TabsContent value="articles" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top 5 articles</CardTitle>
                  <CardDescription>Articles les plus dépensés par quantité et montant</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topArticles.map((article: any) => ({
                        name: article.articleName,
                        amount: article.totalAmount,
                        quantity: article.totalQuantity
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'quantity' ? value : currencyFormatter(Number(value)),
                          name === 'quantity' ? 'Quantité' : 'Montant'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="amount" name="Montant total" fill="#8884d8" />
                      <Bar dataKey="quantity" name="Quantité" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dépenses par article</CardTitle>
                  <CardDescription>Relation entre quantité achetée et montant dépensé</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                      <CartesianGrid />
                      <XAxis
                        type="number"
                        dataKey="totalQuantity"
                        name="Quantité"
                        unit="unités"
                      />
                      <YAxis
                        type="number"
                        dataKey="totalAmount"
                        name="Montant"
                        tickFormatter={(value) => currencyFormatter(value).replace('€', '').trim()}
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(value, name) => [
                          name === 'totalQuantity' ? value : currencyFormatter(Number(value)),
                          name === 'totalQuantity' ? 'Quantité' : 'Montant'
                        ]}
                      />
                      <Scatter
                        name="Articles"
                        data={stats.articles?.articlesRevenue}
                        fill="#8884d8"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Performance des articles</CardTitle>
                <CardDescription>Analyse détaillée des articles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatBlock 
                    title="Total dépenses articles" 
                    value={stats.articles?.articlesRevenue?.reduce((sum: number, item: any) => sum + item.totalAmount, 0)} 
                    formatter={currencyFormatter}
                    description="Dépenses totales" 
                  />
                  <StatBlock 
                    title="Quantité totale" 
                    value={stats.articles?.articlesQuantity} 
                    description="Unités achetées" 
                  />
                  <StatBlock 
                    title="Moyenne par ligne" 
                    value={stats.articles?.averageArticleLineAmount} 
                    formatter={currencyFormatter}
                    description="Montant moyen" 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vue taxes */}
          <TabsContent value="taxes" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Répartition des remises</CardTitle>
                  <CardDescription>Par type de remise appliquée</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={discountTypesData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {discountTypesData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [currencyFormatter(Number(value)), 'Montant']} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top taxes</CardTitle>
                  <CardDescription>Taxes les plus fréquemment appliquées</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topTaxesData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 60
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === 'count') {
                            return [value, 'Nombre de factures'];
                          }
                          return [
                            currencyFormatter(Number(value)),
                            'Montant total'
                          ];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="value" name="Montant total" fill="#8884d8" />
                      <Bar dataKey="count" name="Nombre de factures" fill="#FFBB28" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total des remises</CardTitle>
                  <CardDescription>Montant global des réductions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {currencyFormatter(stats.discountsTaxes?.discountStats?.totalDiscounts || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Retenues fiscales</CardTitle>
                  <CardDescription>Total des retenues à la source</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {currencyFormatter(stats.discountsTaxes?.totalTaxWithholding || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Timbre fiscal</CardTitle>
                  <CardDescription>Présence et montant total</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Factures</div>
                      <div className="text-2xl font-bold">
                        {stats.discountsTaxes?.taxStampStats?.count || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Montant</div>
                      <div className="text-2xl font-bold">
                        {currencyFormatter(stats.discountsTaxes?.taxStampStats?.totalTaxStamp || 0)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Vue interlocuteurs */}
          <TabsContent value="interlocutors" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top 5 fournisseurs</CardTitle>
                  <CardDescription>Par nombre de factures et montant total</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topInterlocutors}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="interlocutorName" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'invoiceCount' ? value : currencyFormatter(Number(value)),
                          name === 'invoiceCount' ? 'Nombre' : 'Montant'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="totalAmount" name="Montant total" fill="#8884d8" />
                      <Bar dataKey="invoiceCount" name="Nombre de factures" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Répartition fournisseurs</CardTitle>
                  <CardDescription>Distribution par montant total</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      width={400}
                      height={200}
                      data={topInterlocutors.map((item: any) => ({
                        name: item.interlocutorName,
                        size: item.totalAmount
                      }))}
                      dataKey="size"
                      aspectRatio={4/3}
                      stroke="#fff"
                      fill="#8884d8"
                    >
                      <Tooltip 
                        formatter={(value) => [currencyFormatter(Number(value)), 'Montant total']}
                      />
                    </Treemap>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
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
  formatter = (val: any) => val
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
  // Ensure consistent formatting between server and client
  const formattedValue = typeof value === 'number' ? formatter(value) : 'N/A';
  
  return (
    <div className="flex flex-col">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="text-2xl font-bold">{formattedValue}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
};