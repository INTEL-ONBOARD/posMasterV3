import { useEffect, useRef } from "react";

const SCAN_MIN_LENGTH = 3;
const SCAN_KEY_INTERVAL_MS = 90;
const SCAN_STABLE_DELAY_MS = 140;
const SEARCH_LOADING_DELAY_MS = 600;
const SCAN_PATTERN = /^[a-zA-Z0-9\-_]+$/;

const isScanCandidate = (value) => (
  typeof value === "string" &&
  value.length >= SCAN_MIN_LENGTH &&
  SCAN_PATTERN.test(value)
);

const normalizeScannerEnterValue = (currentValue, lastValue) => {
  const newChars = lastValue && currentValue.startsWith(lastValue)
    ? currentValue.slice(lastValue.length)
    : currentValue;
  const digitsOnly = newChars.replace(/\D/g, "");
  const isAllDigits = newChars.length > 0 && digitsOnly.length === newChars.length;

  if (isAllDigits && digitsOnly.length >= 1 && digitsOnly.length <= 13) {
    return digitsOnly;
  }
  if (isAllDigits && digitsOnly.length > 13) {
    return "";
  }
  return currentValue;
};

export function useScannerSearch({
  setSearch,
  setSearchLoading,
  loadingDelay = SEARCH_LOADING_DELAY_MS,
  normalizeValue = (value) => value,
  preservePreviousOnPartialScan = false
}) {
  const scanStateRef = useRef({
    stableValue: "",
    valueAtLastEnter: "",
    lastChangeAt: 0,
    stableTimer: null,
    loadingTimer: null
  });

  useEffect(() => () => {
    const scanState = scanStateRef.current;
    if (scanState.stableTimer) {
      clearTimeout(scanState.stableTimer);
    }
    if (scanState.loadingTimer) {
      clearTimeout(scanState.loadingTimer);
    }
  }, []);

  const setStableValue = (value) => {
    const normalizedValue = normalizeValue(value);
    scanStateRef.current.stableValue = normalizedValue.trim();
    scanStateRef.current.valueAtLastEnter = normalizedValue;
  };

  const clearSearch = () => {
    const scanState = scanStateRef.current;
    if (scanState.stableTimer) {
      clearTimeout(scanState.stableTimer);
      scanState.stableTimer = null;
    }
    if (scanState.loadingTimer) {
      clearTimeout(scanState.loadingTimer);
      scanState.loadingTimer = null;
    }
    setSearch("");
    setSearchLoading?.(false);
    setStableValue("");
  };

  const handleSearch = (e) => {
    const rawValue = e.target.value;
    const now = Date.now();
    const scanState = scanStateRef.current;
    const previousStableValue = scanState.stableValue;
    const timeSinceLastChange = now - scanState.lastChangeAt;
    const appendedValue = previousStableValue && rawValue.startsWith(previousStableValue)
      ? rawValue.slice(previousStableValue.length)
      : "";
    const possibleAppendedScan =
      timeSinceLastChange > 0 &&
      timeSinceLastChange <= SCAN_KEY_INTERVAL_MS &&
      isScanCandidate(previousStableValue) &&
      SCAN_PATTERN.test(appendedValue);
    const shouldReplacePreviousScan =
      possibleAppendedScan &&
      appendedValue.length >= SCAN_MIN_LENGTH &&
      isScanCandidate(appendedValue);
    const nextSearch = shouldReplacePreviousScan
      ? appendedValue
      : preservePreviousOnPartialScan && possibleAppendedScan
        ? previousStableValue
        : rawValue;
    const normalizedNextSearch = normalizeValue(nextSearch);

    scanState.lastChangeAt = now;
    setSearchLoading?.(true);
    setSearch(normalizedNextSearch);

    if (scanState.stableTimer) {
      clearTimeout(scanState.stableTimer);
    }
    scanState.stableTimer = setTimeout(() => {
      scanStateRef.current.stableValue = normalizedNextSearch.trim();
    }, SCAN_STABLE_DELAY_MS);

    if (setSearchLoading) {
      if (scanState.loadingTimer) {
        clearTimeout(scanState.loadingTimer);
      }
      scanState.loadingTimer = setTimeout(() => setSearchLoading(false), loadingDelay);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const nextSearch = normalizeScannerEnterValue(
      e.currentTarget.value,
      scanStateRef.current.valueAtLastEnter
    );

    const normalizedNextSearch = normalizeValue(nextSearch);

    setSearch(normalizedNextSearch);
    setStableValue(normalizedNextSearch);
  };

  return {
    handleSearch,
    handleSearchKeyDown,
    clearSearch,
    setStableValue
  };
}
