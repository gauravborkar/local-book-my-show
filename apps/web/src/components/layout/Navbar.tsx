import { Link, NavLink } from "react-router-dom";
import { Ticket } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/Button";

export function Navbar() {
  const { user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-surface/90 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
            <Ticket className="h-5 w-5 text-white" />
          </span>
          LocalBMS
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "text-brand-400 font-medium" : "text-text-muted hover:text-text"
            }
          >
            Discover
          </NavLink>
          {user && (
            <NavLink
              to="/my-bookings"
              className={({ isActive }) =>
                isActive ? "text-brand-400 font-medium" : "text-text-muted hover:text-text"
              }
            >
              My Bookings
            </NavLink>
          )}
          {(user?.role === "EVENT_MANAGER" || user?.role === "ADMIN") && (
            <NavLink
              to="/manager"
              className={({ isActive }) =>
                isActive ? "text-brand-400 font-medium" : "text-text-muted hover:text-text"
              }
            >
              Manager
            </NavLink>
          )}
          {user?.role === "ADMIN" && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                isActive ? "text-brand-400 font-medium" : "text-text-muted hover:text-text"
              }
            >
              Admin
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-text-muted sm:inline">{user.name}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
