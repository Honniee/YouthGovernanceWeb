import { query } from '../config/database.js';

/**
 * Compute unified statistics for a term.
 * All counts are ACTIVE-only and scoped to the provided term.
 * Capacity is derived from barangay count and per-position limits.
 *
 * Returns object with shape used by getActiveTerm banner:
 * {
 *   chairpersons, secretaries, treasurers, councilors,
 *   capacity: { chairpersons, secretaries, treasurers, councilors, totalPositions, barangaysCount },
 *   filled: { total },
 *   completionPercent
 * }
 */
export const computeTermStatistics = async (termId) => {
  if (!termId) {
    return null;
  }

  // Get barangays count (capacity driver)
  const barangayCountResult = await query('SELECT COUNT(*) AS count FROM "Barangay"');
  const barangaysCount = parseInt(barangayCountResult.rows[0]?.count || 0);

  // Per-position limits (mirror SKValidationService.POSITION_LIMITS)
  const chairCapacity = barangaysCount * 1;
  const secretaryCapacity = barangaysCount * 1;
  const treasurerCapacity = barangaysCount * 1;
  const councilorCapacity = barangaysCount * 7;
  const totalCapacity = chairCapacity + secretaryCapacity + treasurerCapacity + councilorCapacity;

  // Active-only filled counts by position (count based on is_active only, not account_access)
  const officialsQuery = `
    SELECT 
      COUNT(CASE WHEN sk.is_active = true AND sk.position = 'SK Chairperson' THEN 1 END) as chairpersons,
      COUNT(CASE WHEN sk.is_active = true AND sk.position = 'SK Secretary' THEN 1 END) as secretaries,
      COUNT(CASE WHEN sk.is_active = true AND sk.position = 'SK Treasurer' THEN 1 END) as treasurers,
      COUNT(CASE WHEN sk.is_active = true AND sk.position = 'SK Councilor' THEN 1 END) as councilors
    FROM "SK_Officials" sk
    WHERE sk.term_id = $1
  `;
  const officialsResult = await query(officialsQuery, [termId]);
  const row = officialsResult.rows[0] || {};

  const filledChair = parseInt(row.chairpersons) || 0;
  const filledSecretary = parseInt(row.secretaries) || 0;
  const filledTreasurer = parseInt(row.treasurers) || 0;
  const filledCouncilor = parseInt(row.councilors) || 0;
  const filledTotal = filledChair + filledSecretary + filledTreasurer + filledCouncilor;

  const completionPercent = totalCapacity > 0 ? Math.round((filledTotal / totalCapacity) * 100) : 0;

  return {
    chairpersons: filledChair,
    secretaries: filledSecretary,
    treasurers: filledTreasurer,
    councilors: filledCouncilor,
    capacity: {
      chairpersons: chairCapacity,
      secretaries: secretaryCapacity,
      treasurers: treasurerCapacity,
      councilors: councilorCapacity,
      totalPositions: totalCapacity,
      barangaysCount
    },
    filled: { total: filledTotal },
    completionPercent
  };
};

export default { computeTermStatistics };

