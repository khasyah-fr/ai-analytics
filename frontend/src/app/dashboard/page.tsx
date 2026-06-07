import { DashboardCard } from "@/components/DashboardCard";
import { Chart } from "@/components/Chart";
import { AnalyticsCard } from "@/components/AnalyticsCard";
import { apiGet, ChartResponse, AnalyticsData } from "@/lib/api";
import { fmtDays, fmtNumber, fmtPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    analytics,
    volume,
    status,
    carrierDelay,
  ] = await Promise.all([
    apiGet<AnalyticsData>("/api/analytics"),
    apiGet<ChartResponse>("/api/charts/volume_over_time"),
    apiGet<ChartResponse>("/api/charts/delivery_status"),
    apiGet<ChartResponse>("/api/charts/carrier_delay_rate"),
  ]);

  return (
    <div className="space-y-16">
      <header className="border-b border-slate-200/60 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-emerald-900">
          Views related to operational data and trends
        </h1>
      </header>

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-800 font-mono">
          Section 01 // Order Status
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          <div className="grid grid-cols-2 gap-4">
            <AnalyticsCard label="Total orders" value={fmtNumber(analytics.total_orders)} />
            <AnalyticsCard label="Delivered" value={fmtNumber(analytics.delivered_orders)}/>
            <AnalyticsCard label="Delayed" value={fmtNumber(analytics.delayed_orders)} />
            <AnalyticsCard label="In transit" value={fmtNumber(analytics.in_transit_orders)} />
            <AnalyticsCard label="Exception" value={fmtNumber(analytics.exception_orders)} />
            <AnalyticsCard label="Canceled" value={fmtNumber(analytics.canceled_orders)} />
          </div>

          <div>
            <DashboardCard title="Order status chart">
              <Chart rows={status.rows} viz={status.viz_spec} />
            </DashboardCard>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-800 font-mono">
          Section 02 // Efficiency
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <AnalyticsCard 
            label="On-time Rate" 
            value={fmtPercent(analytics.on_time_rate)} 
            hint="Total Delivered / Total (Delivered + Delayed + Exception)" 
          />

          <AnalyticsCard 
            label="Avg Delivery Time" 
            value={fmtDays(analytics.avg_delivery_days)}
          />

        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-800 font-mono">
          Section 03 // Trends
        </h2>
        <div className="w-full">
          <DashboardCard title="Order monthly chart">
            <Chart rows={volume.rows} viz={volume.viz_spec} />
          </DashboardCard>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <DashboardCard title="Carrier delay rate">
            <Chart rows={carrierDelay.rows} viz={carrierDelay.viz_spec} />
          </DashboardCard>
        </div>
      </section>
    </div>
  );
}