// Utility to normalize term statistics for consistent UI usage
// Input: term object that may include a nested `statistics` field
// Output: normalized stats with sensible defaults

export const extractTermStats = (term) => {
  const stats = term?.statistics || null;
  if (!stats) {
    return null;
  }

  const filled = typeof stats?.filled?.total === 'number' ? stats.filled.total : 0;
  const total = typeof stats?.capacity?.totalPositions === 'number' ? stats.capacity.totalPositions : 0;
  const percent = typeof stats?.completionPercent === 'number'
    ? stats.completionPercent
    : (total > 0 ? Math.round((filled / total) * 100) : 0);
  const barangays = typeof stats?.capacity?.barangaysCount === 'number' ? stats.capacity.barangaysCount : null;

  return {
    byPosition: {
      chairpersons: stats?.chairpersons ?? 0,
      secretaries: stats?.secretaries ?? 0,
      treasurers: stats?.treasurers ?? 0,
      councilors: stats?.councilors ?? 0
    },
    capacityByPosition: {
      chairpersons: stats?.capacity?.chairpersons ?? 0,
      secretaries: stats?.capacity?.secretaries ?? 0,
      treasurers: stats?.capacity?.treasurers ?? 0,
      councilors: stats?.capacity?.councilors ?? 0
    },
    filled,
    total,
    vacant: Math.max(0, total - filled),
    percent,
    barangays
  };
};

export default { extractTermStats };












