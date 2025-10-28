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