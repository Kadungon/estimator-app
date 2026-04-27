import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+B → New Bill
      if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        navigate("/billing");
      }
      // Ctrl+I → Items
      if (e.ctrlKey && e.key === "i") {
        e.preventDefault();
        navigate("/items");
      }
      // Ctrl+E → Estimates history
      if (e.ctrlKey && e.key === "e") {
        e.preventDefault();
        navigate("/estimates");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
}
