import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Users,
  Package,
  DollarSign,
  Repeat,
  Target,
  Crown
} from "lucide-react";
import { motion } from "framer-motion";

export default function AIInsights() {
  const { businessId } = useBusiness();

  // Fetch comprehensive analytics data
  const { data: analytics } = useQuery({
    queryKey: ["ai-insights", businessId],
    queryFn: async () => {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // Fetch all required data
      const [ordersRes, productsRes, customersRes, orderItemsRes] = await Promise.all([
        supabase.from("orders").select("*").eq("business_id", businessId!),
        supabase.from("products").select("*").eq("business_id", businessId!),
        supabase.from("customers").select("*").eq("business_id", businessId!),
        supabase.from("order_items").select("*, orders!inner(business_id, created_at)").eq("orders.business_id", businessId!),
      ]);

      const allOrders = ordersRes.data || [];
      const allProducts = productsRes.data || [];
      const allCustomers = customersRes.data || [];
      const allOrderItems = orderItemsRes.data || [];

      // 1. WEEKLY SALES FORECAST (simple moving average)
      const last7DaysOrders = allOrders.filter(o => o.created_at >= sevenDaysAgo);
      const last7DaysRevenue = last7DaysOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
      const dailyAverage = last7DaysRevenue / 7;
      const weeklyForecast = dailyAverage * 7;
      const growthRate = allOrders.length > 0 ? ((last7DaysOrders.length / allOrders.length) * 100).toFixed(1) : "0";

      // 2. LOW STOCK ALERTS
      const lowStockProducts = allProducts
        .filter(p => p.is_active && (p.stock_quantity || 0) < 10)
        .map(p => ({
          name: p.name,
          stock: p.stock_quantity || 0,
          category: p.category || "Uncategorized"
        }))
        .slice(0, 5);

      // 3. REPEAT CUSTOMER RATE
      const customersWithMultipleOrders = allCustomers.filter(c => (c.order_count || 0) > 1);
      const repeatRate = allCustomers.length > 0
        ? ((customersWithMultipleOrders.length / allCustomers.length) * 100).toFixed(1)
        : "0";

      // 4. HIGH VALUE CUSTOMERS
      const highValueCustomers = allCustomers
        .filter(c => Number(c.total_spent || 0) >= 5000)
        .sort((a, b) => Number(b.total_spent || 0) - Number(a.total_spent || 0))
        .slice(0, 5)
        .map(c => ({
          name: c.name,
          spent: Number(c.total_spent || 0),
          orders: c.order_count || 0,
          status: c.lead_status || "cold"
        }));

      // 5. PRODUCT DEMAND RANKING
      const productDemand = new Map<string, { name: string; quantity: number; revenue: number }>();

      allOrderItems.forEach(item => {
        const existing = productDemand.get(item.product_id || item.product_name);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += Number(item.total_price || 0);
        } else {
          productDemand.set(item.product_id || item.product_name, {
            name: item.product_name,
            quantity: item.quantity,
            revenue: Number(item.total_price || 0)
          });
        }
      });

      const topProducts = Array.from(productDemand.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // 6. REVENUE TRENDS
      const last30DaysOrders = allOrders.filter(o => o.created_at >= thirtyDaysAgo);
      const last30DaysRevenue = last30DaysOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
      const thisWeekOrders = last7DaysOrders.length;
      const avgOrderValue = last7DaysOrders.length > 0
        ? last7DaysRevenue / last7DaysOrders.length
        : 0;

      return {
        weeklyForecast,
        growthRate,
        lowStockProducts,
        repeatRate,
        highValueCustomers,
        topProducts,
        last30DaysRevenue,
        thisWeekOrders,
        avgOrderValue,
        totalCustomers: allCustomers.length,
        activeProducts: allProducts.filter(p => p.is_active).length
      };
    },
    enabled: !!businessId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          AI Insights
        </h1>
        <p className="text-muted-foreground mt-1">AI-powered analytics and business intelligence</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Weekly Forecast</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs. {analytics?.weeklyForecast?.toFixed(0) || "0"}</div>
              <p className="text-xs text-muted-foreground mt-1">
                +{analytics?.growthRate || "0"}% growth rate
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Repeat Rate</CardTitle>
                <Repeat className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.repeatRate || "0"}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Customer retention
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs. {analytics?.avgOrderValue?.toFixed(0) || "0"}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Last 7 days
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Orders This Week</CardTitle>
                <Target className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.thisWeekOrders || "0"}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active this week
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Insights */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Low Stock Alerts */}
        <Card className="border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="font-display">Low Stock Alerts</CardTitle>
              <Badge variant="destructive" className="ml-auto">{analytics?.lowStockProducts?.length || 0}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {analytics?.lowStockProducts && analytics.lowStockProducts.length > 0 ? (
              <div className="space-y-2">
                {analytics.lowStockProducts.map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-orange-600" />
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-orange-600">
                      {product.stock} left
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">All products are well stocked! 🎉</p>
            )}
          </CardContent>
        </Card>

        {/* High Value Customers */}
        <Card className="border-2 border-purple-200 bg-purple-50/50 dark:bg-purple-950/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-600" />
              <CardTitle className="font-display">High Value Customers</CardTitle>
              <Badge variant="secondary" className="ml-auto">{analytics?.highValueCustomers?.length || 0}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {analytics?.highValueCustomers && analytics.highValueCustomers.length > 0 ? (
              <div className="space-y-2">
                {analytics.highValueCustomers.map((customer, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="font-medium text-sm">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.orders} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">Rs. {customer.spent.toFixed(0)}</p>
                      <Badge variant="outline" className="text-xs">
                        {customer.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Create orders to identify VIP customers 💎</p>
            )}
          </CardContent>
        </Card>

        {/* Product Demand Ranking */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="font-display">Product Demand Ranking</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {analytics?.topProducts && analytics.topProducts.length > 0 ? (
              <div className="space-y-3">
                {analytics.topProducts.map((product, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.quantity} units sold • Rs. {product.revenue.toFixed(0)} revenue
                      </p>
                    </div>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, (product.quantity / (analytics.topProducts[0]?.quantity || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Create orders to see product performance 📊</p>
            )}
          </CardContent>
        </Card>

        {/* AI Performance Summary */}
        <Card className="lg:col-span-2 border-border bg-background shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="font-display">AI Performance Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground">
                {analytics?.totalCustomers && analytics.totalCustomers > 0 ? (
                  <>
                    📈 Your business has <strong>{analytics.totalCustomers} customers</strong> and{' '}
                    <strong>{analytics.activeProducts} active products</strong>.
                    {analytics.thisWeekOrders > 0 && (
                      <> This week, you've processed <strong>{analytics.thisWeekOrders} orders</strong>{' '}
                        with an average value of <strong>Rs. {analytics.avgOrderValue.toFixed(0)}</strong>.</>
                    )}
                    {Number(analytics.repeatRate) > 0 && (
                      <> Your repeat customer rate is <strong>{analytics.repeatRate}%</strong>,
                        showing {Number(analytics.repeatRate) > 30 ? "excellent" : "good"} customer retention.</>
                    )}
                    {analytics.lowStockProducts.length > 0 && (
                      <> ⚠️ <strong>{analytics.lowStockProducts.length} products</strong> are running low on stock
                        and need restocking soon.</>
                    )}
                    {analytics.weeklyForecast > 0 && (
                      <> Based on current trends, we forecast approximately{' '}
                        <strong>Rs. {analytics.weeklyForecast.toFixed(0)}</strong> in revenue for the next 7 days.</>
                    )}
                  </>
                ) : (
                  <>
                    🚀 <strong>Get started</strong> by adding products, customers, and creating your first orders.
                    Once you have data, AI insights will automatically generate here with forecasts, alerts,
                    and personalized recommendations for your business.
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
