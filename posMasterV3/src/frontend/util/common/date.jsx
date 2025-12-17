// Returns current date as "YYYY-MM-DD"
export const getCurrentDate = () => {
  const now = new Date();
  console.log(now.toISOString().split("T")[0]);
  return now.toISOString().split("T")[0];
};

// Returns current date-time as "YYYY-MM-DDTHH:mm:ss.sssZ"
export const getCurrentDateTime = () => {
  const currDate =  new Date().toISOString();
  console.log(currDate);
  return currDate;
};

// Returns ISO datetime by appending the current UTC time to a given date
export const appendCurrentTimeToDate = (dateString) => {
  if (!dateString) return null; // Handle invalid input
  const now = new Date();
  const currentTime = now.toISOString().split("T")[1]; // "HH:mm:ss.sssZ"
  return `${dateString}T${currentTime}`;
};

// Accepts a datetime string (e.g. "2025-10-31T00:00:00.000Z")
// Returns only the date part (e.g. "2025-10-31")
export const extractDateOnly = (dateTimeString) => {
  if (!dateTimeString || typeof dateTimeString !== "string") return null;
  const newDate = dateTimeString.split("T")[0];
  console.log('new date is '+newDate);
  return dateTimeString.split("T")[0];
};