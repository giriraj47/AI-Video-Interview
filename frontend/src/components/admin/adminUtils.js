/**
 * Shared formatting helpers used across Admin sub-components.
 */

export const formatDateTime = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getHiringBadgeStyle = (decision) => {
  switch (decision) {
    case "Strong Hire":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "Hire":
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    case "No Hire":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
};
