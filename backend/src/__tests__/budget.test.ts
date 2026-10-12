import { calculatePayout } from "../services/payout";

// A ladder with one milestone, to keep the numbers easy
const ladder = [{ viewThreshold: 10000, payout: 500 }];

describe("budget cap", () => {
  test("pays in full when the budget covers it", () => {
    const result = calculatePayout({ views: 10000, milestones: ladder, amountPaid: 0, remainingBudget: 800 });
    expect(result.amountToPay).toBe(500);
    expect(result.budgetRanOut).toBe(false);
  });

  test("pays in full when the remaining budget is exactly the amount owed", () => {
    const result = calculatePayout({ views: 10000, milestones: ladder, amountPaid: 0, remainingBudget: 500 });
    expect(result.amountToPay).toBe(500);
    expect(result.budgetRanOut).toBe(false);
  });

  test("pays only what is left when the budget is short (partial payout)", () => {
    const result = calculatePayout({ views: 10000, milestones: ladder, amountPaid: 0, remainingBudget: 300 });
    expect(result.amountToPay).toBe(300);
    expect(result.budgetRanOut).toBe(true);
  });

  test("pays nothing when the budget is already used up", () => {
    const result = calculatePayout({ views: 10000, milestones: ladder, amountPaid: 0, remainingBudget: 0 });
    expect(result.amountToPay).toBe(0);
    expect(result.budgetRanOut).toBe(true);
  });

  test("treats a negative remaining budget as zero", () => {
    const result = calculatePayout({ views: 10000, milestones: ladder, amountPaid: 0, remainingBudget: -50 });
    expect(result.amountToPay).toBe(0);
  });

  test("total paid across many posts never goes above the budget", () => {
    const totalBudget = 1200;
    let spent = 0;

    // 10 posts each earn Rs 500, but the budget only covers 2 full payouts and part of a third
    for (let post = 0; post < 10; post++) {
      const result = calculatePayout({
        views: 10000,
        milestones: ladder,
        amountPaid: 0,
        remainingBudget: totalBudget - spent,
      });
      spent += result.amountToPay;
      expect(spent).toBeLessThanOrEqual(totalBudget);
    }

    expect(spent).toBe(1200); // 500 + 500 + 200, then nothing
  });

  test("a partial payout is topped up only by the unpaid part later", () => {
    // The post earned 500 but only 300 was paid because the budget ran out
    const result = calculatePayout({ views: 10000, milestones: ladder, amountPaid: 300, remainingBudget: 1000 });
    expect(result.amountToPay).toBe(200);
  });
});
