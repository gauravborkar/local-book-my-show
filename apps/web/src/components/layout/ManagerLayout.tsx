import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/manager", label: "Dashboard", end: true },
  { to: "/manager/events", label: "Events" },
  { to: "/manager/facilities", label: "Facilities" },
  { to: "/manager/check-in", label: "Check-in" },
];

export function ManagerLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="flex flex-wrap gap-2 mb-8 border-b border-border pb-4">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-brand-600/20 text-brand-300"
                  : "text-text-muted hover:text-text hover:bg-surface-muted"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
