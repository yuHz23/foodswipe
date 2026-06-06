import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import Onboarding from "@/pages/Onboarding";
import Swipe from "@/pages/Swipe";
import Detail from "@/pages/Detail";
import Liked from "@/pages/Liked";
import Settings from "@/pages/Settings";
import Recommend from "@/pages/Recommend";

export default function App() {
  // Khởi tạo & áp theme ngay khi app mount
  useTheme();

  // Cập nhật chiều cao thực của viewport (mobile address bar)
  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`,
      );
    };
    setVh();
    window.addEventListener("resize", setVh);
    return () => window.removeEventListener("resize", setVh);
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Onboarding />} />
      <Route path="/swipe" element={<Swipe />} />
      <Route path="/recommend" element={<Recommend />} />
      <Route path="/detail/:id" element={<Detail />} />
      <Route path="/liked" element={<Liked />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
