/**
 * Calculate penalties for unpaid months.
 * Rules:
 * - Monthly contribution: KSh 600, due by the 10th
 * - Late penalty: KSh 10/day after the 10th
 * - Penalties accumulate for all unpaid past months
 */

const MONTHLY_AMOUNT = 600;
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
 * Given a list of paid month/year combos, calculate what's owed.
 * Starts from January 2025 (group start) up to current month.
 */
export function calculateOutstanding(
  paidMonths: Array<{ month: string; year: number; status: string }>
): PaymentBreakdown {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth();
  const currentDay = now.getDate();

  // Start from March 2025 (penalties begin from 10th March)
  const startYear = 2025;
  const startMonthIndex = 2; // March

  const paidSet = new Set(
    paidMonths
      .filter(p => p.status === 'paid')
      .map(p => `${p.month}-${p.year}`)
  );

  const unpaidMonths: UnpaidMonth[] = [];

  let year = startYear;
  let monthIndex = startMonthIndex;

  while (year < currentYear || (year === currentYear && monthIndex <= currentMonthIndex)) {
    const monthName = MONTHS[monthIndex];
    const key = `${monthName}-${year}`;

    if (!paidSet.has(key)) {
      // Calculate penalty days
      let penaltyDays = 0;

      if (year < currentYear || monthIndex < currentMonthIndex) {
        // Past month: penalty from the 11th of that month to end of that month,
        // plus all days in subsequent months up to today
        const deadlineDate = new Date(year, monthIndex, DEADLINE_DAY);
        const daysSinceDeadline = Math.floor(
          (now.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        penaltyDays = Math.max(0, daysSinceDeadline);
      } else {
        // Current month: only penalize if past the 10th
        if (currentDay > DEADLINE_DAY) {
          penaltyDays = currentDay - DEADLINE_DAY;
        }
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
