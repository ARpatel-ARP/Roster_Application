import { isSaturday, isSunday, getTeamRule } from "./teamRules.js";

const getDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getEmployeeMap = (assignments, employeeId) => assignments.get(employeeId.toString());
const isWorkingAssignment = (assignment) => assignment && assignment.shift?.name !== "Off" && !assignment.isWeeklyOff;

export const getPreviousWorkingDays = (employeeId, date, assignments) => {
  const map = getEmployeeMap(assignments, employeeId);
  if (!map) return 0;
  let count = 0;
  const cursor = new Date(date);
  cursor.setDate(cursor.getDate() - 1);
  while (count < 6) {
    const entry = map.get(getDateKey(cursor));
    if (!isWorkingAssignment(entry)) break;
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
};

export const getNightCount = (employeeId, assignments) => {
  const map = getEmployeeMap(assignments, employeeId);
  if (!map) return 0;
  return [...map.values()].filter((entry) => entry.shift?.name === "Night").length;
};

export const hasNightMorningConflict = (employeeId, date, assignments) => {
  const map = getEmployeeMap(assignments, employeeId);
  if (!map) return false;
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return map.get(getDateKey(previous))?.shift?.name === "Night";
};

export const hasWeekendConflict = (employeeId, date, assignments) => {
  if (!isSaturday(date) && !isSunday(date)) return false;
  const map = getEmployeeMap(assignments, employeeId);
  if (!map) return false;
  const other = new Date(date);
  other.setDate(other.getDate() + (isSaturday(date) ? 1 : -1));
  return isWorkingAssignment(map.get(getDateKey(other)));
};

export const hasHelpDeskNightRecoveryConflict = (employee, date, assignments) => {
  const teamName = employee.team?.name || employee.teamName || "";
  const rule = getTeamRule(teamName);
  if (!rule?.helpDesk) return false;

  const map = getEmployeeMap(assignments, employee._id);
  if (!map) return false;
  const one = new Date(date);
  const two = new Date(date);
  one.setDate(one.getDate() - 1);
  two.setDate(two.getDate() - 2);
  return map.get(getDateKey(one))?.shift?.name === "Night" && map.get(getDateKey(two))?.shift?.name === "Night";
};

export const getWeekendPairs = (dates) => {
  const pairs = [];
  const seen = new Set();
  for (const date of dates) {
    const d = new Date(date);
    const day = d.getDay();
    if (day !== 6 && day !== 0) continue;
    const saturday = new Date(d);
    if (day === 0) saturday.setDate(d.getDate() - 1);
    saturday.setHours(0, 0, 0, 0);
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    const key = getDateKey(saturday);
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push({ saturday, sunday, key });
    }
  }
  return pairs;
};

export const hasCompleteWeekendOff = (employeeId, weekendPair, assignments) => {
  const map = getEmployeeMap(assignments, employeeId);
  if (!map) return true;
  return !isWorkingAssignment(map.get(getDateKey(weekendPair.saturday))) &&
         !isWorkingAssignment(map.get(getDateKey(weekendPair.sunday)));
};

export const validateAssignmentConstraints = ({ employee, shift, date, assignments, maxNightPerMonth = employee.maxNightPerMonth ?? 0 }) => {
  const map = getEmployeeMap(assignments, employee._id);
  const key = getDateKey(date);
  if (map?.has(key)) return { allowed: false, reason: "Employee already has an assignment on this date" };
  if (hasWeekendConflict(employee._id, date, assignments)) return { allowed: false, reason: "An employee cannot work both Saturday and Sunday of the same weekend" };
  if (hasHelpDeskNightRecoveryConflict(employee, date, assignments)) return { allowed: false, reason: "Help Desk employee must receive a day off after two consecutive Night shifts" };
  if (shift.name === "Morning" && hasNightMorningConflict(employee._id, date, assignments)) return { allowed: false, reason: "Morning shift cannot immediately follow Night shift" };
  if (isWorkingAssignment({ shift }) && getPreviousWorkingDays(employee._id, date, assignments) >= 6) return { allowed: false, reason: "Employee has already worked 6 consecutive days" };
  if (shift.name === "Night" && getNightCount(employee._id, assignments) >= maxNightPerMonth) return { allowed: false, reason: "Maximum monthly Night shift limit reached" };
  return { allowed: true };
};
