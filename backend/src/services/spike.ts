// A jump must be at least this many views to count as a spike
const MIN_JUMP = 10000;

// ...and the new count must be at least this many times the old count
const MIN_MULTIPLIER = 10;

// Did the views jump unusually fast between two reports?
// Pure function: no database, so it is easy to test.
// A spike only flags the post for a person to review. It never blocks a payment,
// because real posts can go viral.
export function isViewSpike(previousViews: number, newViews: number): boolean {
  // The first count we see has nothing to compare against
  if (previousViews <= 0) {
    return false;
  }

  const jump = newViews - previousViews;
  return jump >= MIN_JUMP && newViews >= previousViews * MIN_MULTIPLIER;
}
