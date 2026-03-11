/**
 * Calculate penalties for unpaid months.
 * Rules:
 * - Monthly contribution: KSh 500, due by the 10th of the NEXT month
 * - e.g. February contribution deadline is March 10th
 * - Late penalty: KSh 10/day after the deadline
 * - Penalties accumulate for all unpaid past months
 * - If penalty is marked as paid in penalties table, stop counting
 */

const MONTHLY_AMOUNT = 500;
const DAILY_PENALTY = 10;
const DEADLINE_DAY = 10;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface UnpaidMonth {
  month: string;
  year: number;
  contribution: number;
  penaltyDays: number;
  penaltyAmount: number;
  totalDue: number;
}

export interface PaymentBreakdown {
  unpaidMonths: UnpaidMonth[];
  totalContribution: number;
  totalPenalties: number;
  grandTotal: number;
}

/**
 * Given a list of paid month/year combos and paid penalties, calculate what's owed.
 * Starts from January 2025 (group start) up to current month.
 * 
 * Penalty logic: For month X, the deadline is the 10th of month X+1.
 * Penalties start from the 11th of month X+1.
 * e.g. February 2026 contribution deadline = March 10, 2026. Penalties from March 11.
 */
export function calculateOutstanding(
  paidMonths: Array<{ month: string; year: number; status: string }>,
  paidPenaltyMonths?: Array<{ month: string; year: number }>
): PaymentBreakdown {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth();
  const currentDay = now.getDate();

  // Start from March 2026
  const startYear = 2026;
  const startMonthIndex = 2; // March

  const paidSet = new Set(
    paidMonths
      .filter(p => p.status === 'paid')
      .map(p => `${p.month}-${p.year}`)
  );

  const paidPenaltySet = new Set(
    (paidPenaltyMonths || []).map(p => `${p.month}-${p.year}`)
  );

  const unpaidMonths: UnpaidMonth[] = [];

  let year = startYear;
  let monthIndex = startMonthIndex;

  while (year < currentYear || (year === currentYear && monthIndex <= currentMonthIndex)) {
    const monthName = MONTHS[monthIndex];
    const key = `${monthName}-${year}`;

    if (!paidSet.has(key)) {
      // Deadline for this month's contribution is the 10th of the NEXT month
      let deadlineMonth = monthIndex + 1;
      let deadlineYear = year;
      if (deadlineMonth > 11) {
        deadlineMonth = 0;
        deadlineYear++;
      }

      let penaltyDays = 0;

      // Only calculate penalty if penalty hasn't been marked as paid
      if (!paidPenaltySet.has(key)) {
        const deadlineDate = new Date(deadlineYear, deadlineMonth, DEADLINE_DAY);

        if (now > deadlineDate) {
          // Past the deadline - count days since deadline
          const daysSinceDeadline = Math.floor(
            (now.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          penaltyDays = Math.max(0, daysSinceDeadline);
        }
        // If we haven't passed the deadline yet, no penalty
      }

      const penaltyAmount = penaltyDays * DAILY_PENALTY;

      unpaidMonths.push({
        month: monthName,
        year,
        contribution: MONTHLY_AMOUNT,
        penaltyDays,
        penaltyAmount,
        totalDue: MONTHLY_AMOUNT + penaltyAmount,
      });
    }

    monthIndex++;
    if (monthIndex > 11) {
      monthIndex = 0;
      year++;
    }
  }

  const totalContribution = unpaidMonths.reduce((sum, m) => sum + m.contribution, 0);
  const totalPenalties = unpaidMonths.reduce((sum, m) => sum + m.penaltyAmount, 0);

  return {
    unpaidMonths,
    totalContribution,
    totalPenalties,
    grandTotal: totalContribution + totalPenalties,
  };
}
