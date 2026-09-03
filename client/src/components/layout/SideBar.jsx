import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  CalendarDays,
  ClipboardList,
  Settings,
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Employees",
    path: "/employees",
    icon: Users,
  },
  {
    name: "Teams",
    path: "/teams",
    icon: UsersRound,
  },
  {
    name: "Leaves",
    path: "/leaves",
    icon: CalendarDays,
  },
  {
    name: "Roster",
    path: "/roster",
    icon: ClipboardList,
  },
  {
    name: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-white border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 px-6 flex items-center border-b border-slate-200">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold">R</span>
        </div>

        <div className="ml-3">
          <h1 className="font-bold text-slate-900">Roster</h1>
          <p className="text-xs text-slate-500">Management System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <Icon size={19} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        <p className="text-xs text-slate-400">
          Roster Management System
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;