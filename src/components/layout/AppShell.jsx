import { NavLink } from "react-router-dom";
import { env } from "../../config/env.js";

const links = [
  { to: "/watch", label: "Arena" },
  { to: "/contests", label: "Contests" },
  { to: "/hall-of-fame", label: "Hall of Fame" },
  { to: "/enroll", label: "Enroll" },
  { to: "/operator", label: "Operator" },
];

export function AppShell({ children, bleed = false }) {
  return (
    <div className="shell">
      <header className="shell-nav">
        <NavLink to="/" className="brand">
          Synthetics&apos; Last Cradle
        </NavLink>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? "active" : undefined)}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <span className="deploy-chip">{env.deployLabel}</span>
      </header>
      <main className={bleed ? "shell-main bleed" : "shell-main"}>{children}</main>
    </div>
  );
}
