import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border py-8 text-center text-sm text-text-muted">
        © {new Date().getFullYear()} LocalBMS — Discover local events near you
      </footer>
    </div>
  );
}
