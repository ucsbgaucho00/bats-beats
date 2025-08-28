// src/AdminDashboard.jsx

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// A simple component for the KPI cards
const KpiCard = ({ title, value }) => (
  <div className="kpi-card">
    <h3 className="kpi-card-title">{title}</h3>
    <p className="kpi-card-value">{value}</p>
  </div>
);

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const { data, error: rpcError } = await supabase.rpc('get_admin_dashboard_analytics');
        if (rpcError) throw rpcError;
        setAnalytics(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <p>Loading analytics...</p>;
  if (error) return <p>Error loading analytics: {error}</p>;
  if (!analytics) return <p>No analytics data found.</p>;

  // Format the revenue number for display
  const formatCurrency = (num) => `$${num.toFixed(2)}`;

  return (
    <div>
      <h2>Key Metrics</h2>
      <div className="kpi-grid">
        <KpiCard title="Total Revenue" value={formatCurrency(analytics.kpis.total_revenue)} />
        <KpiCard title="Revenue (Last 24h)" value={formatCurrency(analytics.kpis.revenue_24h)} />
        <KpiCard title="Total Users" value={analytics.kpis.total_users} />
        <KpiCard title="Signups (Last 24h)" value={analytics.kpis.signups_24h} />
        <KpiCard title="Total Teams" value={analytics.kpis.total_teams} />
      </div>

      <div className="chart-container">
        <h3>Sales (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={analytics.sales_over_time}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="var(--mlb-blue)" activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}