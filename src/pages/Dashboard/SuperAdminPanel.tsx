import React, { useEffect, useState, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import { api } from "../../lib/client";
import Chart from "react-apexcharts";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

interface Payment {
  id: string;
  amount: number;
  currency?: string;
  created_at: string;
  date?: string;
  status?: string;
  method: string;
  transactionId: string;
  organization_id?: string;
  invoiceId?: string;
}

interface Subscription {
  id: string;
  organization_id: string;
  plan_name: string;
  status: string;
  billing_cycle: string;
  current_period_end: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  status: string;
}

interface MockDeptEmployee {
  id: string;
  name: string;
  department: string;
  role: string;
}

export default function SuperAdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock Departments Data
  const [deptEmployees, setDeptEmployees] = useState<MockDeptEmployee[]>([
    { id: "de1", name: "Alice Johnson", department: "Production", role: "Production Manager" },
    { id: "de2", name: "Bob Smith", department: "Sales", role: "Sales Executive" },
    { id: "de3", name: "Charlie Davis", department: "Marketing", role: "Content Creator" },
    { id: "de4", name: "Diana Prince", department: "HR", role: "HR Admin" },
  ]);

  const [newEmp, setNewEmp] = useState({ name: "", department: "", role: "" });

  const handleAddDeptEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.department || !newEmp.role) return;
    setDeptEmployees([...deptEmployees, {
      id: `de${Date.now()}`,
      name: newEmp.name,
      department: newEmp.department,
      role: newEmp.role
    }]);
    setNewEmp({ name: "", department: "", role: "" });
  };

  const handleDeleteAllDeptEmployees = () => {
    if (confirm("Are you sure you want to delete all department employees?")) {
      setDeptEmployees([]);
    }
  };

  const handleDeleteEmployee = (id: string) => {
    setDeptEmployees(deptEmployees.filter(emp => emp.id !== id));
  };

  const uniqueDepartmentsCount = useMemo(() => {
    const depts = new Set(deptEmployees.map(e => e.department));
    return depts.size;
  }, [deptEmployees]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [usersData, orgsData, paymentsData, subsData, clientsData] =
        await Promise.all([
          api.get<UserProfile[]>("/saas/v1/profiles/list"),
          api.get<Organization[]>("/saas/v1/organizations/list"),
          api.get<Payment[]>("/saas/v1/payments/list"),
          api.get<Subscription[]>("/saas/v1/subscriptions/list"),
          api.get<Client[]>("/saas/v1/clients/list"),
        ]);

      setUsers(usersData || []);
      setOrganizations(orgsData || []);
      setPayments(paymentsData || []);
      setSubscriptions(subsData || []);
      setClients(clientsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const revenue = useMemo(() => {
    return payments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [payments]);

  const chartData = useMemo(() => {
    const dailyMap: { [key: string]: number } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dailyMap[dateStr] = 0;
    }
    payments.forEach((p) => {
      const dateStr = new Date(p.created_at || p.date || "").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (dailyMap[dateStr] !== undefined) {
        dailyMap[dateStr] += Number(p.amount || 0);
      }
    });
    return {
      categories: Object.keys(dailyMap),
      series: [{ name: "Revenue ($)", data: Object.values(dailyMap) }],
    };
  }, [payments]);

  const chartOptions: any = {
    chart: { type: "area", toolbar: { show: false } },
    colors: ["#3C50E0"],
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 100] },
    },
    xaxis: {
      categories: chartData.categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (val: number) => `$${val}` } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
  };

  const getClientSubscriptionStatus = (clientEmail: string) => {
    const matchedUser = users.find(
      (u) => u.email.toLowerCase() === clientEmail.toLowerCase()
    );
    if (!matchedUser) return { plan: "None", status: "Inactive" };
    const matchedOrg = organizations.find((o) => o.owner_id === matchedUser.id);
    if (!matchedOrg) return { plan: "None", status: "Inactive" };
    const matchedSub = subscriptions.find(
      (s) => s.organization_id === matchedOrg.id
    );
    if (!matchedSub) return { plan: "None", status: "Inactive" };
    return { plan: matchedSub.plan_name, status: matchedSub.status };
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Super Admin Dashboard | SaaS Platform"
        description="Super admin dashboard for managing the entire platform."
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Super Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage the entire SaaS platform billing and metrics
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Users</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{users.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Organizations</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{organizations.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Subscriptions</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {subscriptions.filter((s) => s.status === "active").length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Revenue</h3>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              ${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow md:col-span-2 lg:col-span-4 border-l-4 border-brand-500">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Departments</h3>
            <p className="text-3xl font-bold text-brand-500 mt-2">{uniqueDepartmentsCount}</p>
            <p className="text-sm text-gray-500 mt-1">Total operational departments tracked globally</p>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Platform Revenue Trend (Last 7 Days)
          </h2>
          <div className="h-80">
            <Chart options={chartOptions} series={chartData.series} type="area" height="100%" />
          </div>
        </div>

        {/* Recent Payments */}
        {/* Admin Users Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Admin Users
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Name", "Email", "Role"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users
                  .filter((u) => u.role && u.role !== "super_admin" && u.role?.endsWith("_admin"))
                  .map((admin) => (
                    <tr key={admin.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {admin.full_name || admin.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {admin.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 capitalize">
                        {admin.role?.replace("_admin", " Admin")}
                      </td>
                    </tr>
                  ))}
                {users.filter((u) => u.role && u.role !== "super_admin" && u.role?.endsWith("_admin")).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-300">
                      No admin users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Departments & Employees Management */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Departments & Employees
            </h2>
            <button 
              onClick={handleDeleteAllDeptEmployees}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Delete All
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Employee Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Role</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {deptEmployees.map(emp => (
                    <tr key={emp.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{emp.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        <span className="bg-brand-100 text-brand-800 px-2 py-1 rounded-full text-xs">{emp.department}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{emp.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-500 hover:text-red-700">Remove</button>
                      </td>
                    </tr>
                  ))}
                  {deptEmployees.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">No employees found. Add one below.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Add Employee</h3>
              <form onSubmit={handleAddDeptEmployee} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input required type="text" className="w-full rounded border-gray-300 p-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} placeholder="e.g. John Doe"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                  <input required type="text" className="w-full rounded border-gray-300 p-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white" value={newEmp.department} onChange={e => setNewEmp({...newEmp, department: e.target.value})} placeholder="e.g. Sales"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <input required type="text" className="w-full rounded border-gray-300 p-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white" value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value})} placeholder="e.g. Sales Admin"/>
                </div>
                <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 rounded transition-colors text-sm">
                  Add to Department
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Payments</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Transaction ID", "Amount", "Method", "Status", "Date"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {payments.slice(0, 5).map((pay) => (
                  <tr key={pay.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{pay.transactionId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 font-bold">
                      ${Number(pay.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {pay.currency?.toUpperCase() || "USD"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 capitalize">{pay.method}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        pay.status === "succeeded" || pay.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {pay.status || "completed"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {new Date(pay.created_at || pay.date || "").toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No payments recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Client Subscription Statuses */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Client Subscription &amp; Billing Status
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Company", "Contact Email", "Active Plan", "Status"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {clients.map((client) => {
                  const subStatus = getClientSubscriptionStatus(client.email);
                  return (
                    <tr key={client.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{client.company}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{client.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">{subStatus.plan}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          subStatus.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {subStatus.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
