import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      {/* Sidebar fijo a la izquierda */}
      <Sidebar />

      {/* Contenedor principal */}
      <div className="flex-1 flex flex-col">
        {/* Contenedor que controla el espacio vertical */}
        <div className="bg-gray-50">
          <div className="bg-white border shadow-sm">
            <Topbar />
          </div>
        </div>

        {/* Contenido principal del dashboard */}
        <main className="flex-1 overflow-y-auto px-4 md:px-6 pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
