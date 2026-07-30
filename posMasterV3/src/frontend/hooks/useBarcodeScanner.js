import { useEffect, useRef } from "react";

/**
 * Custom hook for barcode scanner input
 * Barcode scanners typically send characters rapidly followed by Enter key
 * This hook captures that input pattern and returns the scanned barcode
 */
export function useBarcodeScanner(onScan, enabled = true) {
  const barcodeBuffer = useRef("");
  const lastKeyTime = useRef(Date.now());
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTime.current;
      lastKeyTime.current = now;

      // If Enter key is pressed and we have buffered input
      if (e.key === "Enter" && barcodeBuffer.current.length > 0) {
        e.preventDefault();
        const scannedCode = barcodeBuffer.current.trim();
        barcodeBuffer.current = "";

        // Only process if it looks like a valid barcode (at least 3 characters)
        if (scannedCode.length >= 3) {
          onScan(scannedCode);
        }
        return;
      }

      // If time gap is too long (>100ms), likely manual typing - reset buffer
      // Barcode scanners typically send characters within 50ms of each other
      if (timeSinceLastKey > 100) {
        barcodeBuffer.current = "";
      }

      // Only capture alphanumeric characters and common barcode characters
      if (e.key.length === 1 && /^[a-zA-Z0-9\-_]$/.test(e.key)) {
        // Don't capture if user is focused on an input field
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
          activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "SELECT" ||
          activeElement.isContentEditable
        );

        if (!isInputFocused) {
          barcodeBuffer.current += e.key;

          // Clear buffer after 500ms of no input (scanner finished but no Enter)
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            barcodeBuffer.current = "";
          }, 500);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, onScan]);
}
