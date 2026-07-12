const earnings = {
  '2026-07-09': { R_calc: 1000, amount_received: 0, claimed: false },
  '2026-07-10': { R_calc: 700, amount_received: 0, claimed: false }
};

const today = '2026-07-12';
const amountReceived = 1000;

const pendingDays = Object.entries(earnings)
  .filter(([date, data]) => date < today && (data.R_calc || 0) > (data.amount_received || 0))
  .sort(([a], [b]) => (a < b ? -1 : 1));

console.log("Initial pendingDays:", pendingDays);

let remaining = Math.max(0, amountReceived || 0);
const localUpdates = {};
const dbUpdates = [];

for (const [date, data] of pendingDays) {
  if (remaining <= 0) break;

  const alreadyReceived = data.amount_received || 0;
  const dueForDay = (data.R_calc || 0) - alreadyReceived;
  if (dueForDay <= 0) continue;

  const applying = Math.min(dueForDay, remaining);
  const newReceived = alreadyReceived + applying;
  const nowClaimed = newReceived >= (data.R_calc || 0);

  localUpdates[date] = { claimed: nowClaimed, amount_received: newReceived };
  remaining -= applying;
}

console.log("localUpdates:", localUpdates);

// Simulate Zustand merge
const newEarnings = { ...earnings };
Object.entries(localUpdates).forEach(([date, updates]) => {
  newEarnings[date] = { ...newEarnings[date], ...updates };
});

console.log("New earnings state:", newEarnings);

// Recalculate pending
const newPendingDays = Object.entries(newEarnings)
  .filter(([date, data]) => date < today && (data.R_calc || 0) > (data.amount_received || 0))
  .sort(([a], [b]) => (a < b ? -1 : 1));

const totalPending = newPendingDays.reduce((sum, [_, data]) => sum + ((data.R_calc || 0) - (data.amount_received || 0)), 0);

console.log("New totalPending:", totalPending);
