import { isViewSpike } from "../services/spike";

describe("isViewSpike", () => {
  test("flags a huge jump (10x and more than 10,000 extra views)", () => {
    expect(isViewSpike(2000, 500000)).toBe(true);
  });

  test("flags a jump that is exactly 10x and exactly 10,000 more", () => {
    expect(isViewSpike(1111, 11111)).toBe(true);
  });

  test("does not flag normal growth", () => {
    expect(isViewSpike(12000, 20000)).toBe(false);
  });

  test("does not flag a big multiple on a small number (jump under 10,000)", () => {
    expect(isViewSpike(100, 5000)).toBe(false);
  });

  test("does not flag a big jump that is under 10x", () => {
    expect(isViewSpike(50000, 200000)).toBe(false);
  });

  test("does not flag the first report (nothing to compare with)", () => {
    expect(isViewSpike(0, 900000)).toBe(false);
  });

  test("does not flag views going down", () => {
    expect(isViewSpike(50000, 2000)).toBe(false);
  });
});
