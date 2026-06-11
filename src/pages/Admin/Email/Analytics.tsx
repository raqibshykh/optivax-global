
import PageMeta from "../../../components/common/PageMeta";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useCampaigns } from "../../../hooks/useEmailMarketing";
import Badge from "../../../components/ui/badge/Badge";

export default function Analytics() {
  const { campaigns, isLoading } = useCampaigns();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  const sentCampaigns = campaigns.filter(c => c.status === 'sent');
  const totalSent = sentCampaigns.reduce((sum, c) => sum + c.stats.sent, 0);
  const totalOpened = sentCampaigns.reduce((sum, c) => sum + c.stats.opened, 0);
  const totalClicked = sentCampaigns.reduce((sum, c) => sum + c.stats.clicked, 0);

  const avgOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0";
  const avgClickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : "0";

  // Chart Data preparation
  const chartLabels = sentCampaigns.map(c => c.name);
  const openRates = sentCampaigns.map(c => c.stats.sent > 0 ? ((c.stats.opened / c.stats.sent) * 100).toFixed(1) : 0);
  const clickRates = sentCampaigns.map(c => c.stats.sent > 0 ? ((c.stats.clicked / c.stats.sent) * 100).toFixed(1) : 0);

  const lineChartOptions: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      fontFamily: "Inter, sans-serif",
    },
    colors: ["#3b82f6", "#10b981"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    xaxis: {
      categories: chartLabels,
      labels: { style: { colors: "#9ca3af" } }
    },
    yaxis: {
      labels: { style: { colors: "#9ca3af" }, formatter: (value) => `${value}%` },
      max: 100
    },
    grid: { borderColor: "#e5e7eb", strokeDashArray: 4 },
    tooltip: { theme: "light" },
    legend: { position: "top" }
  };

  const lineChartSeries = [
    { name: "Open Rate (%)", data: openRates.map(Number) },
    { name: "Click Rate (%)", data: clickRates.map(Number) }
  ];

  const donutOptions: ApexOptions = {
    chart: { type: "donut", fontFamily: "Inter, sans-serif" },
    labels: ["Opened", "Clicked", "Ignored"],
    colors: ["#3b82f6", "#10b981", "#9ca3af"],
    legend: { position: "bottom" },
    dataLabels: { enabled: false },
    tooltip: { theme: "light" }
  };

  const ignored = totalSent - totalOpened;
  const donutSeries = [totalOpened, totalClicked, ignored > 0 ? ignored : 0];

  return (
    <>
      <PageMeta title="Email Analytics | Optivax Global" description="Email marketing performance metrics" />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Email Analytics</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Track campaign performance and engagement.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Emails Sent</p>
          <h4 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{totalSent.toLocaleString()}</h4>
          <span className="mt-2 inline-block text-xs font-medium text-green-500">+12% from last month</span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Open Rate</p>
          <h4 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{avgOpenRate}%</h4>
          <span className="mt-2 inline-block text-xs font-medium text-green-500">+2.4% from last month</span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Click Rate</p>
          <h4 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{avgClickRate}%</h4>
          <span className="mt-2 inline-block text-xs font-medium text-red-500">-0.5% from last month</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Engagement Trends</h3>
          <div className="h-80">
            {sentCampaigns.length > 0 ? (
              <ReactApexChart options={lineChartOptions} series={lineChartSeries} type="area" height="100%" />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">Not enough data to display trends</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Overall Interaction</h3>
          <div className="h-80 flex items-center justify-center">
            {totalSent > 0 ? (
              <ReactApexChart options={donutOptions} series={donutSeries} type="donut" width="100%" />
            ) : (
              <div className="text-gray-500">No sent emails to analyze</div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Performing Campaigns</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Open Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Click Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {sentCampaigns.sort((a, b) => ((b.stats.opened/b.stats.sent) - (a.stats.opened/a.stats.sent))).map(camp => {
                const oRate = ((camp.stats.opened / camp.stats.sent) * 100).toFixed(1);
                const cRate = ((camp.stats.clicked / camp.stats.sent) * 100).toFixed(1);
                return (
                  <tr key={camp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{camp.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{camp.stats.sent.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge color="success">{oRate}%</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge color="primary">{cRate}%</Badge>
                    </td>
                  </tr>
                )
              })}
              {sentCampaigns.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
