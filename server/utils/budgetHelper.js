import { ApiError } from './ApiError.js';

/**
 * 💰 Budget Helper Utility: Pure arithmetic functions for trip budget planning & breakdown.
 * Decoupled from MongoDB, Gemini AI, and HTTP logic for max reusability and clean testing.
 */

/**
 * Validates and sanitizes a monetary input amount to a rounded, non-negative integer.
 * 
 * @param {any} val - Input amount to validate.
 * @param {string} fieldName - Field label for error messaging.
 * @returns {number} Rounded non-negative integer.
 */
const sanitizeNonNegativeAmount = (val, fieldName) => {
  const amount = val ?? 0;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    throw new ApiError(400, `${fieldName} must be a valid non-negative number.`);
  }
  return Math.round(amount);
};

/**
 * Authoritatively calculates trip budget breakdown:
 * - reservedTotal = intercityTransport + accommodation + buffer
 * - itineraryBudget = Math.max(0, totalBudget - reservedTotal)
 * - isOverReserved = reservedTotal > totalBudget
 * 
 * @param {Object} params - Budget calculation inputs.
 * @param {number} params.totalBudget - Estimated total trip budget (must be > 0).
 * @param {number} [params.intercityTransport=0] - Estimated round-trip intercity transport cost.
 * @param {number} [params.accommodation=0] - Estimated accommodation cost.
 * @param {number} [params.buffer=0] - Emergency / miscellaneous reserve amount.
 * @returns {Object} Calculated budget breakdown structure.
 */
export const calculateBudgetBreakdown = ({
  totalBudget,
  intercityTransport = 0,
  accommodation = 0,
  buffer = 0
} = {}) => {
  if (
    totalBudget === undefined ||
    totalBudget === null ||
    typeof totalBudget !== 'number' ||
    !Number.isFinite(totalBudget) ||
    totalBudget <= 0
  ) {
    throw new ApiError(400, 'Total budget must be a valid positive number greater than zero.');
  }

  const roundedTotalBudget = Math.round(totalBudget);
  const roundedIntercityTransport = sanitizeNonNegativeAmount(intercityTransport, 'Intercity transport');
  const roundedAccommodation = sanitizeNonNegativeAmount(accommodation, 'Accommodation cost');
  const roundedBuffer = sanitizeNonNegativeAmount(buffer, 'Buffer amount');

  const reservedTotal = roundedIntercityTransport + roundedAccommodation + roundedBuffer;
  const itineraryBudget = Math.max(0, roundedTotalBudget - reservedTotal);
  const isOverReserved = reservedTotal > roundedTotalBudget;

  return {
    reserved: {
      intercityTransport: roundedIntercityTransport,
      accommodation: roundedAccommodation,
      buffer: roundedBuffer,
      total: reservedTotal
    },
    itineraryBudget,
    isOverReserved
  };
};
