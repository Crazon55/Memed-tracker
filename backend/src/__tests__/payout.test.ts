import { calculatePayout } from "../services/payout";

// The ladder used in every test: 10K -> Rs 500, 50K -> Rs 2000, 100K -> Rs 5000
const ladder = [
  { viewThreshold: 10000, payout: 500 },
  { viewThreshold: 50000, payout: 2000 },
  { viewThreshold: 100000, payout: 5000 },
];

// A budget big enough that it never limits the payout in these tests
const plenty = 1000000;

describe("calculatePayout", () => {
  test("pays nothing below the first milestone", () => {
    const result = calculatePayout({ views: 9999, milestones: ladder, amountPaid: 0, remainingBudget: plenty });
    expect(result.amountToPay).toBe(0);
  });

  test("pays the first milestone when it is crossed", () => {
    const result = calculatePayout({ views: 12000, milestones: ladder, amountPaid: 0, remainingBudget: plenty });
    expect(result.amountToPay).toBe(500);
  });

  test("pays on exactly the threshold", () => {
    const result = calculatePayout({ views: 10000, milestones: ladder, amountPaid: 0, remainingBudget: plenty });
    expect(result.amountToPay).toBe(500);
  });

  test("crossing several milestones at once pays only the highest one", () => {
    const result = calculatePayout({ views: 60000, milestones: ladder, amountPaid: 0, remainingBudget: plenty });
    expect(result.earnedTotal).toBe(2000);
    expect(result.amountToPay).toBe(2000); // not 500 + 2000
  });

  test("pays only the difference when a higher milestone is reached later", () => {
    const result = calculatePayout({ views: 60000, milestones: ladder, amountPaid: 500, remainingBudget: plenty });
    expect(result.amountToPay).toBe(1500);
  });

  test("never pays twice for the same views", () => {
    const result = calculatePayout({ views: 13000, milestones: ladder, amountPaid: 500, remainingBudget: plenty });
    expect(result.amountToPay).toBe(0);
  });

  test("never claws money back when views go down", () => {
    const result = calculatePayout({ views: 5000, milestones: ladder, amountPaid: 500, remainingBudget: plenty });
    expect(result.amountToPay).toBe(0);
  });

  test("works when the milestones are listed out of order", () => {
    const shuffled = [ladder[2], ladder[0], ladder[1]];
    const result = calculatePayout({ views: 60000, milestones: shuffled, amountPaid: 0, remainingBudget: plenty });
    expect(result.amountToPay).toBe(2000);
  });

  test("a huge view count still pays only the top milestone", () => {
    const result = calculatePayout({ views: 5000000, milestones: ladder, amountPaid: 0, remainingBudget: plenty });
    expect(result.amountToPay).toBe(5000);
  });
});
