import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut } from "lucide-react";

import { useLogoutMutation } from "../../services/api/authApi";
import { logout } from "../../store/authSlice";

function Header() {
  const admin = useSelector((state) => state.auth.admin);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [logoutApi, { isLoading }] = useLogoutMutation();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      dispatch(logout());
      navigate("/login", { replace: true });
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      {/* Left */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Roster Management
        </h2>
      </div>

      {/* Right */}
      <div className="flex items-center gap-5">
        {/* Notifications */}
        <button
          type="button"
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg"
        >
          <Bell size={20} />

          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Admin Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"
          >
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-600">
                {admin?.name?.charAt(0)?.toUpperCase() || "A"}
              </span>
            </div>

            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-900">
                {admin?.name || "Admin"}
              </p>

              <p className="text-xs text-slate-500">
                {admin?.role || "Administrator"}
              </p>
            </div>

            <ChevronDown
              size={16}
              className={`text-slate-400 transition-transform ${
                showMenu ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-900">
                  {admin?.name || "Admin"}
                </p>

                <p className="text-xs text-slate-500 mt-0.5">
                  {admin?.email || ""}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoading}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <LogOut size={17} />

                {isLoading ? "Logging out..." : "Logout"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;