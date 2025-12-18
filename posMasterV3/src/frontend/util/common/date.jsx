// Sri Lanka timezone offset: UTC+5:30
const SRI_LANKA_OFFSET_HOURS = 5;
const SRI_LANKA_OFFSET_MINUTES = 30;
export const SRI_LANKA_TIMEZONE = 'Asia/Colombo';

/**
 * Get current date in Sri Lankan timezone
 * @returns {Date} Date object adjusted for Sri Lanka
 */
export const getSriLankanDate = () => {
  const now = new Date();
  // Get UTC time and add Sri Lanka offset
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const sriLankaTime = new Date(utcTime + (SRI_LANKA_OFFSET_HOURS * 3600000) + (SRI_LANKA_OFFSET_MINUTES * 60000));
  return sriLankaTime;
};

// Returns current date as "YYYY-MM-DD" in Sri Lankan time
export const getCurrentDate = () => {
  const sriLankaDate = getSriLankanDate();
  const year = sriLankaDate.getFullYear();
  const month = String(sriLankaDate.getMonth() + 1).padStart(2, '0');
  const day = String(sriLankaDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Returns current date-time in Sri Lankan time as ISO format
export const getCurrentDateTime = () => {
  const sriLankaDate = getSriLankanDate();
  const year = sriLankaDate.getFullYear();
  const month = String(sriLankaDate.getMonth() + 1).padStart(2, '0');
  const day = String(sriLankaDate.getDate()).padStart(2, '0');
  const hours = String(sriLankaDate.getHours()).padStart(2, '0');
  const minutes = String(sriLankaDate.getMinutes()).padStart(2, '0');
  const seconds = String(sriLankaDate.getSeconds()).padStart(2, '0');
  const ms = String(sriLankaDate.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}Z`;
};

// Returns current time as "HH:mm:ss" in Sri Lankan time
export const getCurrentTime = () => {
  const sriLankaDate = getSriLankanDate();
  const hours = String(sriLankaDate.getHours()).padStart(2, '0');
  const minutes = String(sriLankaDate.getMinutes()).padStart(2, '0');
  const seconds = String(sriLankaDate.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

// Returns ISO datetime by appending the current Sri Lankan time to a given date
export const appendCurrentTimeToDate = (dateString) => {
  if (!dateString) return null;
  const sriLankaDate = getSriLankanDate();
  const hours = String(sriLankaDate.getHours()).padStart(2, '0');
  const minutes = String(sriLankaDate.getMinutes()).padStart(2, '0');
  const seconds = String(sriLankaDate.getSeconds()).padStart(2, '0');
  const ms = String(sriLankaDate.getMilliseconds()).padStart(3, '0');
  return `${dateString}T${hours}:${minutes}:${seconds}.${ms}Z`;
};

// Accepts a datetime string (e.g. "2025-10-31T00:00:00.000Z")
// Returns only the date part (e.g. "2025-10-31")
export const extractDateOnly = (dateTimeString) => {
  if (!dateTimeString || typeof dateTimeString !== "string") return null;
  return dateTimeString.split("T")[0];
};

// Format a date to Sri Lankan locale display
export const formatSriLankanDate = (date, options = {}) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions = {
    timeZone: SRI_LANKA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  return new Intl.DateTimeFormat('en-GB', { ...defaultOptions, ...options }).format(d);
};

// Format date for display (e.g., "18 Dec 2025, 14:30")
export const formatForDisplay = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SRI_LANKA_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
};

// Format date only for display (e.g., "18 Dec 2025")
export const formatDateForDisplay = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SRI_LANKA_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

// Format time only for display (e.g., "14:30:00")
export const formatTimeForDisplay = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SRI_LANKA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
};
