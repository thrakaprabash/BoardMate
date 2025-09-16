import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";
import NightBackdrop from "./NightBackdrop";

export default function AppLayout({ children }) {
  return (
    <div className="relative min-h-screen text-white">
      <NightBackdrop />
      <div className="relative z-10">
        <TopBar />
        <div className="mx-auto max-w-7xl px-4 py-6 md:flex md:gap-6">
          <Sidebar />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
