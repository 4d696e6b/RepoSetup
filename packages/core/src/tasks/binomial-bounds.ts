/** One-sided Clopper–Pearson bounds for independent problem-level Bernoulli trials.
 * Binomial-tail inversion, not a normal approximation. Endpoints are rounded outward.
 * Repeated generations of one problem must not be counted as independent trials. */
export function taskBinomialBounds(successes: number, trials: number, alpha: number) {
  if (
    !Number.isSafeInteger(trials) ||
    trials < 1 ||
    trials > 10000 ||
    !Number.isSafeInteger(successes) ||
    successes < 0 ||
    successes > trials ||
    !Number.isFinite(alpha) ||
    alpha < 1e-9 ||
    alpha >= 0.5
  )
    throw new RangeError("Invalid bounded binomial evidence.");
  const lower =
    successes === 0
      ? 0
      : successes === trials
        ? Math.pow(alpha, 1 / trials)
        : invert(successes, trials, alpha, true);
  const upper =
    successes === trials
      ? 1
      : successes === 0
        ? -Math.expm1(Math.log(alpha) / trials)
        : invert(successes, trials, alpha, false);
  // Conservative numerical guard in probability units, never tightens admission.
  return { lower: Math.max(0, lower - 1e-10), upper: Math.min(1, upper + 1e-10) };
}

function invert(k: number, n: number, alpha: number, lower: boolean): number {
  const logChoose = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) logChoose[i] = logChoose[i - 1]! + Math.log(n - i + 1) - Math.log(i);
  let left = 0,
    right = 1;
  for (let step = 0; step < 60; step++) {
    const p = (left + right) / 2;
    let sum = 0,
      compensation = 0;
    for (let i = lower ? k : 0; i <= (lower ? n : k); i++) {
      const term = Math.exp(logChoose[i]! + i * Math.log(p) + (n - i) * Math.log1p(-p));
      const corrected = term - compensation;
      const next = sum + corrected;
      compensation = next - sum - corrected;
      sum = next;
    }
    if (lower ? sum < alpha : sum > alpha) left = p;
    else right = p;
  }
  return lower ? left : right;
}
