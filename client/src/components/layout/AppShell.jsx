import Sidebar from "./SideBar.jsx";
import Header from "./Header";

function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 min-w-0">
        <Header />

        <main>{children}</main>
      </div>
    </div>
  );
}

export default AppShell;