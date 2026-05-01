import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAuthStore } from "../../store/authStore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { DollarSign, FileText, ShoppingBag, TrendingUp } from "lucide-react";

interface DashboardKPIs {
  total_revenue: number;
  total_estimates: number;
  average_order_value: number;
}

interface RevenueTrend {
  date: string;
  revenue: number;
}

interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

export default function DashboardPage() {
  const { company } = useAuthStore();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [revenueTrends, setRevenueTrends] = useState<RevenueTrend[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!company) return;

    invoke<DashboardKPIs>("get_dashboard_kpis", { companyId: company.id })
      .then(setKpis)
      .catch(console.error);

    invoke<RevenueTrend[]>("get_revenue_trends", { companyId: company.id, days })
      .then(setRevenueTrends)
      .catch(console.error);

    invoke<TopItem[]>("get_top_items", { companyId: company.id, limit: 5 })
      .then(setTopItems)
      .catch(console.error);
  }, [company, days]);

  const kpiCards = [
    {
      title: "Total Revenue",
      value: `₹${(kpis?.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: <DollarSign size={24} color="var(--primary)" />,
    },
    {
      title: "Total Estimates",
      value: kpis?.total_estimates || 0,
      icon: <FileText size={24} color="var(--accent)" />,
    },
    {
      title: "Average Order Value",
      value: `₹${(kpis?.average_order_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: <TrendingUp size={24} color="#10b981" />,
    },
    {
      title: "Top Item Sold",
      value: topItems.length > 0 ? topItems[0].name : "N/A",
      icon: <ShoppingBag size={24} color="#f59e0b" />,
    },
  ];

  return (
    <div className="page animate-fade" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: "24px" }}>Dashboard</h1>
        <select
          className="select"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          style={{ width: "150px" }}
        >
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
          <option value={365}>Last Year</option>
        </select>
      </header>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        {kpiCards.map((card, idx) => (
          <div
            key={idx}
            className="card"
            style={{
              padding: "20px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              backgroundColor: "var(--surface)",
              borderRadius: "12px",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ padding: "12px", borderRadius: "10px", backgroundColor: "var(--surface-hover)" }}>
              {card.icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>{card.title}</p>
              <h3 style={{ margin: "4px 0 0 0", fontSize: "20px" }}>{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", flex: 1, minHeight: "400px" }}>
        {/* Revenue Trend Chart */}
        <div className="card" style={{ padding: "20px", backgroundColor: "var(--surface)", borderRadius: "12px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "16px" }}>Revenue Over Time</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={revenueTrends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", borderRadius: "8px" }}
                itemStyle={{ color: "var(--text)" }}
              />
              <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--primary)" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Selling Items */}
        <div className="card" style={{ padding: "20px", backgroundColor: "var(--surface)", borderRadius: "12px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "16px" }}>Top Items by Revenue</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topItems} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" width={100} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "var(--surface-hover)" }}
                contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", borderRadius: "8px" }}
              />
              <Bar dataKey="revenue" fill="var(--accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
