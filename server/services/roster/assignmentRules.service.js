import { RosterEntry } from "../../models/Roster.js";
import { getTeamRule, isSaturday, isSunday } from "./teamRules.js";

const getDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const dayRange = (date) => {
  const start = new Date(date);
  start.setHours(0,0,0,0);
  const end = new Date(start);
  end.setHours(23,59,59,999);
  return { start, end };
};

export const validateTeamShiftCompatibility = ({ employee, team, shift }) => {
  const rule = getTeamRule(team?.name);
  if (!rule || shift.name === "Off") return null;

  const required = rule.requiredShifts || {};
  if (!required[shift.name]) {
    return `${team.name} employees cannot be assigned to the ${shift.name} shift under the roster policy`;
  }
  return null;
};

export const validateWeekendAssignment = async ({ employeeId, date, shift, excludeRosterId = null }) => {
  if (shift.name === "Off") return null;
  if (!isSaturday(date) && !isSunday(date)) return null;

  const otherDate = new Date(date);
  otherDate.setDate(otherDate.getDate() + (isSaturday(date) ? 1 : -1));
  const { start, end } = dayRange(otherDate);

  const filter = { employee: employeeId, date: { $gte: start, $lte: end } };
  if (excludeRosterId) filter._id = { $ne: excludeRosterId };

  const otherEntry = await RosterEntry.findOne(filter).populate("shift", "name").lean();
  if (otherEntry?.shift?.name !== "Off") {
    return "An employee cannot work both Saturday and Sunday of the same weekend";
  }
  return null;
};

export const validateHelpDeskNightRecovery = async ({ employee, date, shift, excludeRosterId = null }) => {
  const rule = getTeamRule(employee.team?.name || employee.teamName);
  if (!rule?.helpDesk || shift.name === "Off") return null;

  const first = new Date(date); first.setDate(first.getDate() - 1);
  const second = new Date(date); second.setDate(second.getDate() - 2);
  const { start } = dayRange(second);
  const { end } = dayRange(first);
  const filter = { employee: employee._id, date: { $gte: start, $lte: end } };
  if (excludeRosterId) filter._id = { $ne: excludeRosterId };

  const entries = await RosterEntry.find(filter).populate("shift", "name").lean();
  const byDate = new Map(entries.map((entry) => [getDateKey(entry.date), entry]));
  const firstEntry = byDate.get(getDateKey(first));
  const secondEntry = byDate.get(getDateKey(second));

  if (firstEntry?.shift?.name === "Night" && secondEntry?.shift?.name === "Night") {
    return "Help Desk employee must receive a day off after two consecutive Night shifts";
  }
  return null;
};
