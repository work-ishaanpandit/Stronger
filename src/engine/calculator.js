/**
 * STRONGER FINANCIAL ENGINE
 * Implements the asymmetric multiplier model from PRD Section 4.
 *
 * Order of operations:
 *   Step 1: P_base  = Σ(W_i × C_i × B_i)                    [Normal tasks]
 *   Step 2: E_base  = (P_base / P_potential) × 1000          [Capped at ₹1000]
 *   Step 3: S_net   = E_base − D_tot                         [Kickass damage]
 *   Step 4: M_pow   = Π(1 + C_j)                             [Power multipliers]
 *   Step 5: R_calc  = max(0, (S_net × M_pow) − debt)         [Uncapped final]
 */

/**
 * @param {Array} tasks - Array of task objects for the day
 * @param {number} debtCarryover - Negative balance carried from previous day
 * @returns {Object} Detailed breakdown of the calculation
 */
export function calculateDayEarnings(tasks = [], debtCarryover = 0) {
  // Filter out soft-deleted 'cancelled' tasks so they don't affect the math
  const activeTasks = tasks.filter((t) => t.status !== 'cancelled');
  
  const normalTasks = activeTasks.filter((t) => t.type === 'normal');
  const powerTasks = activeTasks.filter((t) => t.type === 'power');
  const kickassTasks = activeTasks.filter((t) => t.type === 'kickass');

  // ─── Step 1: Base Points ────────────────────────────────────────────────
  const P_base = normalTasks.reduce((sum, t) => {
    const C_i = t.completionPercentage ?? 0; // 0.0 – 1.0
    const W_i = t.weight ?? 1;
    const B_i = t.hasBonus ? 1.2 : 1.0;
    return sum + W_i * C_i * B_i;
  }, 0);

  const P_potential = normalTasks.reduce((sum, t) => sum + (t.weight ?? 1), 0);

  // ─── Step 2: Base Earnings (capped at ₹1000) ────────────────────────────
  const E_base =
    P_potential > 0 ? Math.min((P_base / P_potential) * 1000, 1000) : 0;

  // ─── Step 3: Kickass Damage ─────────────────────────────────────────────
  const D_tot = kickassTasks.reduce((sum, t) => {
    const missed = t.status === 'missed';
    return sum + (missed ? (t.damage ?? 0) : 0);
  }, 0);

  const S_net = E_base - D_tot;

  // ─── Step 4: Power Multipliers ──────────────────────────────────────────
  const M_pow = powerTasks.reduce((product, t) => {
    const C_j = t.completionPercentage ?? 0;
    return product * (1 + C_j);
  }, 1.0);

  // ─── Step 5: Final Payout ───────────────────────────────────────────────
  // Ignore debtCarryover so daily calculations are fully independent
  const rawPayout = S_net * M_pow;
  const R_calc = rawPayout;

  // newDebt is now 0 because negative R_calc directly reduces the global pending balance
  const newDebt = 0;

  return {
    P_base: round2(P_base),
    P_potential: round2(P_potential),
    E_base: round2(E_base),
    D_tot: round2(D_tot),
    S_net: round2(S_net),
    M_pow: round2(M_pow),
    debtCarryover: round2(debtCarryover),
    R_calc: round2(R_calc),
    newDebt: round2(newDebt),
    // Derived helpers
    completionRatio: P_potential > 0 ? round2(P_base / P_potential) : 0,
    powerBoost: round2(M_pow - 1),
  };
}

/**
 * Recalculate when a specific task changes — returns updated earnings object.
 */
export function recalculate(tasks, debtCarryover = 0) {
  return calculateDayEarnings(tasks, debtCarryover);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
