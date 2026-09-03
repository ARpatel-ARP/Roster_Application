import { useGetDashboardQuery } from "../services/api/dashApi.js";
import { useGetEmployeesQuery } from "../services/api/employeeApi";

function DashboardPage() {
  const { data, error, isLoading } = useGetDashboardQuery();

  const {
  data: employeesResponse,
  isLoading: employeesLoading,
  isError: employeesError,
} = useGetEmployeesQuery({ page: 1, limit: 5 });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600">
            Unable to load dashboard
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const dashboard = data?.data;

  const stats = [
    {
      label: "Total Employees",
      value: dashboard?.totalEmployees ?? 0,
      description: "All employees",
    },
    {
      label: "Active Employees",
      value: dashboard?.activeEmployees ?? 0,
      description: "Currently active",
    },
    {
      label: "Today's Leaves",
      value: dashboard?.todayLeaves ?? 0,
      description: "Employees on leave",
    },
    {
      label: "Upcoming Holidays",
      value: dashboard?.upcomingHolidays ?? 0,
      description: "Scheduled holidays",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
    {console.log("Employees:", employeesResponse)}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Welcome back! Here's what's happening with your workforce.
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">
                {stat.label}
              </p>

              <div className="mt-3 flex items-end justify-between">
                <p className="text-3xl font-bold text-slate-900">
                  {stat.value}
                </p>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                {stat.description}
              </p>
            </div>
          ))}
        </div>

        {/* Workforce Overview */}
        <div className="mt-8 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Workforce Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current employee status
            </p>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Active workforce
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {dashboard?.activeEmployees ?? 0}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Total workforce
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {dashboard?.totalEmployees ?? 0}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  On leave today
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {dashboard?.todayLeaves ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Today's Leaves
            </h2>

            <p className="mt-3 text-3xl font-bold text-slate-900">
              {dashboard?.todayLeaves ?? 0}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Approved employee leaves for today
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Upcoming Holidays
            </h2>

            <p className="mt-3 text-3xl font-bold text-slate-900">
              {dashboard?.upcomingHolidays ?? 0}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Holidays scheduled from today onward
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;