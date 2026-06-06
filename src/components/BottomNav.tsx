import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

type Tab = {
  to: string;
  label: string;
  icon: string;
};

const TABS: Tab[] = [
  { to: "/swipe", label: "Lướt", icon: "🔥" },
  { to: "/recommend", label: "Gợi ý", icon: "💡" },
  { to: "/liked", label: "Đã thích", icon: "❤️" },
  { to: "/settings", label: "Cài đặt", icon: "⚙️" },
];

export default function BottomNav() {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="sticky bottom-0 z-20 border-t border-border bg-surface/85 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors",
                  isActive ? "text-accent" : "text-muted hover:text-text",
                )
              }
            >
              <span className="text-lg leading-none" aria-hidden>
                {tab.icon}
              </span>
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
