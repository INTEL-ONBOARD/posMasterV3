import { useEffect, useState } from "react";

/**
 * Toast notification state for the Inventory Share page: holds the current
 * toast (or null) and auto-dismisses it after ~3.8s, same as the inline
 * behavior InventoryShare.jsx had before this refactor.
 */
export function useTransferToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  return { toast, setToast };
}
