import Employee from "../../models/Employee.js";
import Shift from "../../models/Shift.js";
import Leave from "../../models/Leave.js";
import Holiday from "../../models/Holiday.js";
import { getTeamRule, isConfiguredTeam, isWeekend, getWeekendKey } from "./teamRules.js";
import {
  validateAssignmentConstraints,
  getNightCount,
  getWeekendPairs,
} from "./constraints.js";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const getDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const startOfDay = (date) => { const d = new Date(date); d.setHours(0,0,0,0); return d; };
const endOfDay = (date) => { const d = new Date(date); d.setHours(23,59,59,999); return d; };
const getDayName = (date) => DAY_NAMES[new Date(date).getDay()];
const isWorkingShift = (shift) => shift?.name !== "Off";

const employeeOnApprovedLeave = (employeeId, date, approvedLeaves) => approvedLeaves.some((leave) =>
  leave.employee.toString() === employeeId.toString() &&
  startOfDay(date) >= startOfDay(leave.startDate) &&
  startOfDay(date) <= endOfDay(leave.endDate)
);

const isHoliday = (date, holidays) => holidays.some((holiday) => getDateKey(holiday.date) === getDateKey(date));

const getEmployeeTeamName = (employee) => employee.team?.name || employee.teamName || "";

const getWeekNumber = (date) => {
  const d = new Date(date);
  const first = new Date(d.getFullYear(), 0, 1);
  return Math.floor((((d - first) / 86400000) + first.getDay()) / 7) + 1;
};

const getLinuxRotationOffEmployee = (linuxEmployees, date) => {
  if (!linuxEmployees.length) return null;
  return linuxEmployees[getWeekNumber(date) % linuxEmployees.length]?._id.toString() || null;
};

const getEmployeeAssignments = (assignments, employeeId) => assignments.get(employeeId.toString());

const register = ({ employee, shift, date, assignments, generatedEntries, isWeeklyOff=false, isLeave=false, isHoliday=false }) => {
  const id = employee._id.toString();
  const key = getDateKey(date);
  if (!assignments.has(id)) assignments.set(id, new Map());
  const assignment = { employee: employee._id, date: new Date(date), shift, isWeeklyOff, isLeave };
  assignments.get(id).set(key, assignment);
  generatedEntries.push({
    employee: employee._id,
    date: new Date(date),
    shift: shift._id,
    month: date.getMonth()+1,
    year: date.getFullYear(),
    isWeeklyOff,
    isHoliday,
    isLeave,
    manuallyEdited: false,
  });
};

const scoreCandidate = ({ employee, shift, date, assignments, weekendOffKey, weekendDutyCounts }) => {
  let score = 0;
  if (employee.preferredShift === shift.name) score += 50;
  if (employee.preferredWeeklyOff === getDayName(date)) score += 20;
  if (getWeekendKey(date) === weekendOffKey && isWeekend(date)) score -= 1000;
  if (shift.name === "Night") score -= getNightCount(employee._id, assignments) * 10;
  score -= (getEmployeeAssignments(assignments, employee._id)?.size || 0);
  score -= (weekendDutyCounts.get(employee._id.toString()) || 0) * 15;
  return score;
};

const sortCandidates = (employees, shift, date, assignments, weekendOffByEmployee, weekendDutyCounts) =>
  [...employees].sort((a,b) => scoreCandidate({employee:b,shift,date,assignments,weekendOffKey:weekendOffByEmployee.get(b._id.toString()),weekendDutyCounts}) - scoreCandidate({employee:a,shift,date,assignments,weekendOffKey:weekendOffByEmployee.get(a._id.toString()),weekendDutyCounts}));

const getOrCreateOffShift = async () => {
  let off = await Shift.findOne({ name: "Off" });
  if (!off) {
    off = await Shift.create({ name: "Off", startTime: "00:00", endTime: "00:01", minimumEmployees: 0, overnight: false, status: "active" });
  }
  return off;
};

const assignOne = ({ employee, shift, date, assignments, approvedLeaves, generatedEntries, holidays, weekendOffByEmployee, weekendDutyCounts }) => {
  if (employeeOnApprovedLeave(employee._id, date, approvedLeaves)) return { allowed:false, reason:"Employee is on approved leave" };
  const weekendOffKey = weekendOffByEmployee.get(employee._id.toString());
  if (isWeekend(date) && weekendOffKey === getWeekendKey(date)) return { allowed:false, reason:"Employee has a scheduled complete weekend off" };
  const validation = validateAssignmentConstraints({ employee, shift, date, assignments });
  if (!validation.allowed) return validation;
  register({ employee, shift, date, assignments, generatedEntries, isHoliday:isHoliday(date, holidays) });
  if (isWeekend(date)) weekendDutyCounts.set(employee._id.toString(), (weekendDutyCounts.get(employee._id.toString()) || 0) + 1);
  return { allowed:true };
};

export const generateRoster = async ({ dates, existingEntries=[] }) => {
  const employees = await Employee.find({ status:"Active" }).populate("team", "name status").lean();
  if (!employees.length) throw new Error("No active employees available");
  const shifts = await Shift.find({ status:"active", name:{ $ne:"Off" } }).lean();
  if (!shifts.length) throw new Error("No active working shifts available");
  const offShift = await getOrCreateOffShift();
  const approvedLeaves = await Leave.find({ status:"Approved" }).lean();
  const holidays = dates.length ? await Holiday.find({ date:{ $gte:startOfDay(dates[0]), $lte:endOfDay(dates[dates.length-1]) } }).lean() : [];

  const assignments = new Map();
  for (const entry of existingEntries) {
    const id = entry.employee?._id ? entry.employee._id.toString() : entry.employee.toString();
    if (!assignments.has(id)) assignments.set(id,new Map());
    assignments.get(id).set(getDateKey(entry.date), { employee:entry.employee, date:entry.date, shift:entry.shift, isWeeklyOff:entry.isWeeklyOff, isLeave:entry.isLeave });
  }

  const weekendPairs = getWeekendPairs(dates);
  const weekendOffByEmployee = new Map();
  const sortedEmployees = [...employees].sort((a,b) => a._id.toString().localeCompare(b._id.toString()));
  sortedEmployees.forEach((employee,index) => {
    if (weekendPairs.length) weekendOffByEmployee.set(employee._id.toString(), weekendPairs[index % weekendPairs.length].key);
  });

  const generatedEntries = [];
  const warnings = [];
  const weekendDutyCounts = new Map();
  const configuredEmployees = employees.filter((e) => isConfiguredTeam(getEmployeeTeamName(e)));

  for (const date of dates) {
    // Approved leave is represented explicitly in the generated roster.
    for (const employee of employees) {
      if (employeeOnApprovedLeave(employee._id, date, approvedLeaves) && !getEmployeeAssignments(assignments, employee._id)?.has(getDateKey(date))) {
        register({ employee, shift:offShift, date, assignments, generatedEntries, isLeave:true, isHoliday:isHoliday(date, holidays) });
      }
    }

    const dayAssigned = new Set();
    const teams = [...new Set(employees.map(getEmployeeTeamName).filter(Boolean))];

    // First satisfy every mentor-defined team/shift requirement.
    for (const teamName of teams) {
      const rule = getTeamRule(teamName);
      if (!rule) continue;
      if (isWeekend(date) && !rule.weekendCoverage && teamName) continue;
      for (const [shiftName, required] of Object.entries(rule.requiredShifts || {})) {
        const shift = shifts.find((s) => s.name === shiftName);
        if (!shift) {
          warnings.push({ type:"MISSING_SHIFT_CONFIGURATION", team:teamName, shift:shiftName, date:getDateKey(date), message:`${shiftName} shift is required for ${teamName} but no active shift exists.` });
          continue;
        }
        const teamEmployees = employees.filter((e) => getEmployeeTeamName(e).toLowerCase() === teamName.toLowerCase() && !dayAssigned.has(e._id.toString()));
        const linuxRotationOff = rule.rotation ? getLinuxRotationOffEmployee(teamEmployees, date) : null;
        const candidates = sortCandidates(teamEmployees.filter((e) => !linuxRotationOff || e._id.toString() !== linuxRotationOff), shift, date, assignments, weekendOffByEmployee, weekendDutyCounts);
        let assigned = 0;
        for (const employee of candidates) {
          if (assigned >= required) break;
          const result = assignOne({employee,shift,date,assignments,approvedLeaves,generatedEntries,holidays,weekendOffByEmployee,weekendDutyCounts});
          if (result.allowed) { assigned++; dayAssigned.add(employee._id.toString()); }
        }
        if (assigned < required) warnings.push({ type:"TEAM_STAFFING_SHORTAGE", team:teamName, date:getDateKey(date), day:getDayName(date), shift:shiftName, required, assigned, shortage:required-assigned, message:`${teamName} ${shiftName} requires ${required} employee(s) but only ${assigned} could be assigned.` });
      }
    }

    // Generic fallback for employees belonging to teams not covered by the mentor rules.
    for (const shift of shifts) {
      if (!shift.minimumEmployees) continue;
      const configuredRequired = teams.some((teamName) => getTeamRule(teamName)?.requiredShifts?.[shift.name]);
      if (configuredRequired) continue;
      const candidates = sortCandidates(employees.filter((e) => !dayAssigned.has(e._id.toString()) && !isConfiguredTeam(getEmployeeTeamName(e))), shift, date, assignments, weekendOffByEmployee, weekendDutyCounts);
      let assigned = 0;
      for (const employee of candidates) {
        if (assigned >= shift.minimumEmployees) break;
        const result = assignOne({employee,shift,date,assignments,approvedLeaves,generatedEntries,holidays,weekendOffByEmployee,weekendDutyCounts});
        if (result.allowed) { assigned++; dayAssigned.add(employee._id.toString()); }
      }
      if (assigned < shift.minimumEmployees) warnings.push({ type:"STAFFING_SHORTAGE", date:getDateKey(date), day:getDayName(date), shift:shift.name, required:shift.minimumEmployees, assigned, shortage:shift.minimumEmployees-assigned, message:`${shift.name} shift requires ${shift.minimumEmployees} employee(s) but only ${assigned} could be assigned.` });
    }

    // Every active employee gets an explicit Off entry when they are not working/leave.
    for (const employee of employees) {
      const map = getEmployeeAssignments(assignments, employee._id);
      if (map?.has(getDateKey(date))) continue;
      register({ employee, shift:offShift, date, assignments, generatedEntries, isWeeklyOff:true, isHoliday:isHoliday(date, holidays) });
    }
  }

  // Verify that every employee received a complete weekend off.
  for (const employee of employees) {
    const map = getEmployeeAssignments(assignments, employee._id) || new Map();
    const complete = weekendPairs.some((pair) => {
      const sat = map.get(getDateKey(pair.saturday));
      const sun = map.get(getDateKey(pair.sunday));
      return (!sat || sat.isWeeklyOff || sat.isLeave || sat.shift?.name === "Off") && (!sun || sun.isWeeklyOff || sun.isLeave || sun.shift?.name === "Off");
    });
    if (!complete && weekendPairs.length) warnings.push({ type:"WEEKEND_OFF_SHORTAGE", employee:employee._id, employeeName:employee.name, message:"Employee did not receive a complete Saturday + Sunday weekend off in the generated month." });
  }

  return {
    generatedEntries,
    warnings,
    summary:{ employees:employees.length, shifts:shifts.length, assignments:generatedEntries.length, workingAssignments:generatedEntries.filter((e)=>!e.isWeeklyOff&&!e.isLeave).length, weeklyOffs:generatedEntries.filter((e)=>e.isWeeklyOff).length, leaveDays:generatedEntries.filter((e)=>e.isLeave).length, holidays:holidays.length, warnings:warnings.length },
  };
};
