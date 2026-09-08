/**
 * 📅 dateUtils.js: Centralized date presentation formatting utility for TripPilot.
 * Standardizes date display across all components to "DD Month YYYY" format (e.g. "31 August 2026", "3 September 2026").
 */

/**
 * Converts YYYY-MM-DD, ISO string, or Date instance into "DD Month YYYY" format.
 * 
 * @param {string|Date} dateStr - Target date string or Date object.
 * @returns {string} Formatted date string (e.g. "31 August 2026").
 */
export const formatDateToDisplay = (dateStr) => {
  if (!dateStr) return '';

  // Safely parse YYYY-MM-DD without timezone shifting
  const dateObj =
    typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)
      ? new Date(`${dateStr}T00:00:00`)
      : new Date(dateStr);

  if (isNaN(dateObj.getTime())) return String(dateStr);

  const day = dateObj.getDate();
  const month = dateObj.toLocaleString('en-US', { month: 'long' });
  const year = dateObj.getFullYear();
  return `${day} ${month} ${year}`;
};
