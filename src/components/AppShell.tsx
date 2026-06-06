import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import BottomNav from "./BottomNav";

type AppShellProps = {
  children: ReactNode;
  hideNav?: boolean;
  /** Cho phép trang tự quản lý scroll/đầy màn hình (vd: Swipe) */
  noPadding?: boolean;
  className?: string;
};

export default function AppShell({
  children,
  hideNav = false,
  noPadding = false,
  className,
}: AppShellProps) {
  return (
    <div className="relative z-[1] mx-auto flex min-h-[100dvh] max-w-md flex-col">
      <main
        className={cn(
          "flex-1",
          !noPadding && "px-4 pb-6 pt-5",
          className,
        )}
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
