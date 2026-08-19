/**
 * Mentor-defined team scheduling rules.
 *
 * The generator reads this configuration instead of scattering team-name
 * checks throughout the scheduling algorithm.
 */
const normalize = (value) => String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

export const TEAM_RULES = {
  windows: {
    aliases: ["windows", "windows administrators"],
    requiredShifts: { Morning: 1, General: 1, Evening: 1 },
    weekendCoverage: true,
  },
  linux: {
    aliases: ["linux", "linux administrators"],
    requiredShifts: { Morning: 1, General: 1, Evening: 1 },
    weekendCoverage: true,
    rotation: true,
  },
  network: {
    aliases: ["network", "network administrators"],
    requiredShifts: { General: 1, Evening: 1 },
    weekendCoverage: true,
  },
  cloud: {
    aliases: ["cloud", "cloud administrator", "cloud administrators"],
    requiredShifts: { General: 1 },
  },
  storage: {
    aliases: ["storage", "storage administrator", "storage administrators"],
    requiredShifts: { General: 1 },
  },
  "help desk": {
    aliases: ["help desk", "helpdesk"],
    requiredShifts: { Morning: 1, General: 1, Evening: 1, Night: 1 },
    helpDesk: true,
    nightRotation: true,
  },
};

export const getTeamRule = (teamName) => {
  const normalized = normalize(teamName);
  return Object.values(TEAM_RULES).find((rule) =>
    rule.aliases.some((alias) => normalize(alias) === normalized)
  ) || null;
};

export const isConfiguredTeam = (teamName) => Boolean(getTeamRule(teamName));

export const isWeekend = (date) => {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
};

export const isSaturday = (date) => new Date(date).getDay() === 6;
export const isSunday = (date) => new Date(date).getDay() === 0;

export const getWeekendKey = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const saturday = new Date(d);
  saturday.setDate(d.getDate() - (day === 0 ? 1 : 0));
  saturday.setHours(0, 0, 0, 0);
  return saturday.toISOString().slice(0, 10);
};

export const isWorkingShift = (shift) => shift?.name !== "Off";

export const teamNeedsShift = (teamName, shiftName, date) => {
  const rule = getTeamRule(teamName);
  if (!rule) return false;
  if (isWeekend(date) && rule.weekendCoverage === false) return false;
  return Boolean(rule.requiredShifts?.[shiftName]);
};

export const requiredShiftCount = (teamName, shiftName, date) => {
  if (!teamNeedsShift(teamName, shiftName, date)) return 0;
  return getTeamRule(teamName)?.requiredShifts?.[shiftName] || 0;
};
