// ============================================================
// Modal Hook — Generic modal state management
// ============================================================

import { useState, useCallback } from "react";

/**
 * Generic hook for managing modal open/close state with optional data.
 *
 * @example
 * const modal = useModal<TicketData>();
 * modal.open(ticketData); // Open with data
 * modal.open();           // Open without data
 * modal.close();          // Close
 */
export function useModal<T = undefined>() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | undefined>(undefined);

  const open = useCallback((initialData?: T) => {
    setData(initialData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setData(undefined);
  }, []);

  return { isOpen, data, open, close };
}
