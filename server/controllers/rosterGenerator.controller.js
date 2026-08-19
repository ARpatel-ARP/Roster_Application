import mongoose from "mongoose";
import Leave from "../models/Leave.js";
import Team from "../models/Team.js";
import { RosterEntry, RosterMonth } from "../models/Roster.js";
import { generateRoster } from "../services/roster/generator.service.js";
import { getPreviousWorkingDays } from "../services/roster/constraints.js";
import { validateTeamShiftCompatibility, validateWeekendAssignment, validateHelpDeskNightRecovery } from "../services/roster/assignmentRules.service.js";

const getDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const parseDateOnly = (dateString) => {
  if (typeof dateString !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
};

const startOfDay = (date) => { const d = new Date(date); d.setHours(0,0,0,0); return d; };
const endOfDay = (date) => { const d = new Date(date); d.setHours(23,59,59,999); return d; };
const getDatesBetween = (start, end) => {
  const dates = [];
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (current <= last) { dates.push(new Date(current)); current.setDate(current.getDate() + 1); }
  return dates;
};

// ============================================================
// MONTHLY ROSTER GENERATOR
// ============================================================

export const generateMonthlyRoster =
    async (req, res) => {
        const session =
            await mongoose.startSession();

        try {
            const {
                month,
                year,
            } = req.body;

            if (
                !Number.isInteger(month) ||
                month < 1 ||
                month > 12
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Month must be an integer between 1 and 12",
                });
            }

            if (
                !Number.isInteger(year) ||
                year < 2000
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Valid year is required",
                });
            }

            const monthStart =
                new Date(
                    year,
                    month - 1,
                    1
                );

            const monthEnd =
                new Date(
                    year,
                    month,
                    0
                );

            const dates =
                getDatesBetween(
                    monthStart,
                    monthEnd
                );

            session.startTransaction();

            /**
             * Check month tracker.
             */
            const rosterMonth =
                await RosterMonth.findOne({
                    month,
                    year,
                }).session(session);

            if (
                rosterMonth?.published
            ) {
                await session.abortTransaction();

                return res.status(409).json({
                    success: false,
                    message:
                        "Roster for this month is already published",
                });
            }

            /**
             * Don't silently duplicate a roster.
             */
            const existingEntries =
                await RosterEntry.find({
                    month,
                    year,
                })
                    .populate(
                        "employee",
                        "_id name"
                    )
                    .populate(
                        "shift",
                        "name"
                    )
                    .session(session)
                    .lean();

            if (
                existingEntries.length
            ) {
                await session.abortTransaction();

                return res.status(409).json({
                    success: false,
                    message:
                        "Roster entries already exist for this month. Review or remove them before generating again.",
                });
            }

            const result =
                await generateRoster({
                    dates,
                    month,
                    year,
                    existingEntries,
                });

            if (
                !result.generatedEntries.length
            ) {
                throw new Error(
                    "No roster assignments could be generated"
                );
            }

            await RosterEntry.insertMany(
                result.generatedEntries,
                {
                    session,
                }
            );

            let savedMonth;

            if (rosterMonth) {
                rosterMonth.generatedAt =
                    new Date();

                savedMonth =
                    await rosterMonth.save({
                        session,
                    });
            } else {
                const created =
                    await RosterMonth.create(
                        [
                            {
                                month,
                                year,
                                published: false,
                                generatedAt:
                                    new Date(),
                            },
                        ],
                        {
                            session,
                        }
                    );

                savedMonth =
                    created[0];
            }

            await session.commitTransaction();

            return res.status(201).json({
                success: true,
                message:
                    "Monthly roster generated successfully",

                data: {
                    rosterMonth:
                        savedMonth,

                    month,
                    year,

                    summary:
                        result.summary,

                    warnings:
                        result.warnings,
                },
            });
        } catch (error) {
            await session.abortTransaction();

            console.error(
                "Monthly roster generation error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to generate monthly roster",
                error:
                    error.message,
            });
        } finally {
            await session.endSession();
        }
    };


    // ============================================================
// GET GENERATED MONTHLY ROSTER
// ============================================================

export const getGeneratedMonthlyRoster = async (req, res) => {
  try {
    const { month, year } = req.query;

    const parsedMonth = Number(month);
    const parsedYear = Number(year);

    // Validate month
    if (
      !Number.isInteger(parsedMonth) ||
      parsedMonth < 1 ||
      parsedMonth > 12
    ) {
      return res.status(400).json({
        success: false,
        message: "Month must be an integer between 1 and 12",
      });
    }

    // Validate year
    if (
      !Number.isInteger(parsedYear) ||
      parsedYear < 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid year is required",
      });
    }

    // Find the roster month
    const rosterMonth = await RosterMonth.findOne({
      month: parsedMonth,
      year: parsedYear,
    }).populate("publishedBy", "name email");

    if (!rosterMonth) {
      return res.status(404).json({
        success: false,
        message: "No generated roster found for this month",
      });
    }

    // Get all entries belonging to this month
    const entries = await RosterEntry.find({
      month: parsedMonth,
      year: parsedYear,
    })
      .populate(
        "employee",
        "employeeId name designation team"
      )
      .populate(
        "shift",
        "name startTime endTime minimumEmployees overnight"
      )
      .sort({
        date: 1,
        employee: 1,
      });

    return res.status(200).json({
      success: true,
      message: "Monthly roster fetched successfully",
      data: {
        month: parsedMonth,
        year: parsedYear,
        published: rosterMonth.published,
        generatedAt: rosterMonth.generatedAt,
        publishedAt: rosterMonth.publishedAt,
        entries,
      },
    });
  } catch (error) {
    console.error(
      "Get generated monthly roster error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch monthly roster",
      error: error.message,
    });
  }
};

// ============================================================
// WEEKLY ROSTER GENERATOR
// ============================================================

export const generateWeeklyRoster =
    async (req, res) => {
        const session =
            await mongoose.startSession();

        try {
            const {
                startDate,
            } = req.body;

            if (!startDate) {
                return res.status(400).json({
                    success: false,
                    message:
                        "startDate is required",
                });
            }

          
            const parsedDate =
                parseDateOnly(startDate);

            if (!parsedDate) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid startDate. Use YYYY-MM-DD format.",
                });
            }

            const weekStart =
                startOfDay(parsedDate);

            const weekEnd =
                new Date(weekStart);

            weekEnd.setDate(
                weekEnd.getDate() + 6
            );

            const dates =
                getDatesBetween(
                    weekStart,
                    weekEnd
                );

            const month =
                weekStart.getMonth() + 1;

            const year =
                weekStart.getFullYear();

            session.startTransaction();

            /**
             * Check whether month is published.
             */
            const rosterMonth =
                await RosterMonth.findOne({
                    month,
                    year,
                }).session(session);

            if (
                rosterMonth?.published
            ) {
                await session.abortTransaction();

                return res.status(409).json({
                    success: false,
                    message:
                        "This month's roster is already published",
                });
            }

            /**
             * Get existing assignments.
             */
            const historyStart = new Date(weekStart);
            historyStart.setDate(historyStart.getDate() - 6);

            const existingEntries =
                await RosterEntry.find({
                    date: {
                        $gte: historyStart,
                        $lte:
                            endOfDay(weekEnd),
                    },
                })
                    .populate(
                        "employee",
                        "_id name"
                    )
                    .populate(
                        "shift",
                        "name"
                    )
                    .session(session)
                    .lean();

            const weekEntries = existingEntries.filter((entry) => {
                const date = new Date(entry.date);
                return date >= weekStart && date <= endOfDay(weekEnd);
            });

            if (
                weekEntries.length
            ) {
                await session.abortTransaction();

                return res.status(409).json({
                    success: false,
                    message:
                        "Roster entries already exist for part or all of this week. Review them before generating again.",
                });
            }

            const result =
                await generateRoster({
                    dates,
                    month,
                    year,
                    existingEntries,
                });

            if (
                !result.generatedEntries.length
            ) {
                throw new Error(
                    "No roster assignments could be generated"
                );
            }

            await RosterEntry.insertMany(
                result.generatedEntries,
                {
                    session,
                }
            );

            /**
             * Create month tracker if necessary.
             *
             * Weekly generation does NOT mark the
             * whole month as generated.
             */
            if (!rosterMonth) {
                await RosterMonth.create(
                    [
                        {
                            month,
                            year,
                            published: false,
                            generatedAt: null,
                        },
                    ],
                    {
                        session,
                    }
                );
            }

            await session.commitTransaction();

            return res.status(201).json({
                success: true,
                message:
                    "Weekly roster generated successfully",

                data: {
                    week: {
                        startDate:
                            getDateKey(
                                weekStart
                            ),

                        endDate:
                            getDateKey(
                                weekEnd
                            ),
                    },

                    summary:
                        result.summary,

                    warnings:
                        result.warnings,
                },
            });
        } catch (error) {
            await session.abortTransaction();

            console.error(
                "Weekly roster generation error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to generate weekly roster",
                error:
                    error.message,
            });
        } finally {
            await session.endSession();
        }
    };

    // ============================================================
// GET GENERATED WEEKLY ROSTER
// ============================================================

export const getGeneratedWeeklyRoster = async (req, res) => {
  try {
    const { startDate } = req.query;

    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: "startDate is required in YYYY-MM-DD format",
      });
    }

    // Use the same date parser that fixes the timezone bug
    const parsedStartDate = parseDateOnly(startDate);

    if (!parsedStartDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid startDate. Use YYYY-MM-DD format.",
      });
    }

    const start = startOfDay(parsedStartDate);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const entries = await RosterEntry.find({
      date: {
        $gte: start,
        $lte: end,
      },
    })
      .populate(
        "employee",
        "employeeId name designation team"
      )
      .populate(
        "shift",
        "name startTime endTime minimumEmployees overnight"
      )
      .sort({
        date: 1,
        employee: 1,
      });

    if (!entries.length) {
      return res.status(404).json({
        success: false,
        message: "No generated roster found for this week",
      });
    }

    // Get publication status of the roster month(s)
    const months = [
      ...new Set(
        entries.map(
          (entry) =>
            `${entry.year}-${entry.month}`
        )
      ),
    ];

    const rosterMonths = await RosterMonth.find({
      $or: months.map((value) => {
        const [year, month] = value
          .split("-")
          .map(Number);

        return {
          year,
          month,
        };
      }),
    });

    return res.status(200).json({
      success: true,
      message: "Weekly roster fetched successfully",
      data: {
        startDate: getDateKey(start),
        endDate: getDateKey(end),
        entries,
        rosterMonths,
      },
    });
  } catch (error) {
    console.error(
      "Get generated weekly roster error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch weekly roster",
      error: error.message,
    });
  }
};

// ============================================================
// UPDATE GENERATED ROSTER ENTRY
// Draft and Published entries can both be updated.
// Minimum staffing is a SOFT rule.
// ============================================================

export const updateGeneratedRosterById = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            employee: employeeId,
            date: dateString,
            shift: shiftId,
        } = req.body;

        // --------------------------------------------------------
        // Validate roster entry ID
        // --------------------------------------------------------

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid roster entry ID",
            });
        }

        // --------------------------------------------------------
        // Find existing roster entry
        // --------------------------------------------------------

        const rosterEntry =
            await RosterEntry.findById(id);

        if (!rosterEntry) {
            return res.status(404).json({
                success: false,
                message: "Roster entry not found",
            });
        }

        // --------------------------------------------------------
        // Validate required fields
        // --------------------------------------------------------

        if (!employeeId) {
            return res.status(400).json({
                success: false,
                message: "Employee is required",
            });
        }

        if (!shiftId) {
            return res.status(400).json({
                success: false,
                message: "Shift is required",
            });
        }

        if (!dateString) {
            return res.status(400).json({
                success: false,
                message: "Date is required",
            });
        }

        // --------------------------------------------------------
        // Validate ObjectIds
        // --------------------------------------------------------

        if (!mongoose.Types.ObjectId.isValid(employeeId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee ID",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(shiftId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid shift ID",
            });
        }

        // --------------------------------------------------------
        // Parse date safely
        // --------------------------------------------------------

        const parsedDate =
            parseDateOnly(dateString);

        if (!parsedDate) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid date. Use YYYY-MM-DD format.",
            });
        }

        const newDate =
            startOfDay(parsedDate);

        // --------------------------------------------------------
        // Find employee
        // --------------------------------------------------------

        const employee =
            await Employee.findById(employeeId).lean();

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found",
            });
        }

        if (employee.status !== "Active") {
            return res.status(409).json({
                success: false,
                message:
                    "Inactive employees cannot be assigned to roster",
            });
        }

        const employeeTeam = employee.team
            ? await Team.findById(employee.team).lean()
            : null;

        if (!employeeTeam) {
            return res.status(409).json({
                success: false,
                message: "Employee must belong to an active team",
            });
        }

        // --------------------------------------------------------
        // Find shift
        // --------------------------------------------------------

        const shift =
            await Shift.findById(shiftId).lean();

        if (!shift) {
            return res.status(404).json({
                success: false,
                message: "Shift not found",
            });
        }

        if (shift.status !== "active") {
            return res.status(409).json({
                success: false,
                message:
                    "Inactive shifts cannot be assigned to roster",
            });
        }

        const teamShiftError = validateTeamShiftCompatibility({
            employee,
            team: employeeTeam,
            shift,
        });

        if (teamShiftError) {
            return res.status(400).json({
                success: false,
                message: teamShiftError,
            });
        }

        const weekendError = await validateWeekendAssignment({
            employeeId,
            date: newDate,
            shift,
            excludeRosterId: id,
        });

        if (weekendError) {
            return res.status(400).json({ success: false, message: weekendError });
        }

        employee.team = employeeTeam;
        const helpDeskNightError = await validateHelpDeskNightRecovery({
            employee,
            date: newDate,
            shift,
            excludeRosterId: id,
        });

        if (helpDeskNightError) {
            return res.status(400).json({ success: false, message: helpDeskNightError });
        }

        // --------------------------------------------------------
        // Duplicate / one shift per employee per day
        //
        // Exclude the current entry itself.
        // --------------------------------------------------------

        const duplicate =
            await RosterEntry.findOne({
                _id: { $ne: id },
                employee: employeeId,
                date: newDate,
            });

        if (duplicate) {
            return res.status(409).json({
                success: false,
                message:
                    "Employee already has a roster assignment on this date",
                data: {
                    conflictingRosterId:
                        duplicate._id,
                },
            });
        }

        // --------------------------------------------------------
        // Approved leave validation
        // --------------------------------------------------------

        const approvedLeave =
            await Leave.findOne({
                employee: employeeId,
                status: "Approved",
                startDate: {
                    $lte: endOfDay(newDate),
                },
                endDate: {
                    $gte: startOfDay(newDate),
                },
            }).lean();

        if (approvedLeave) {
            return res.status(409).json({
                success: false,
                message:
                    "Employee is on approved leave on this date",
                data: {
                    leaveId: approvedLeave._id,
                    startDate:
                        approvedLeave.startDate,
                    endDate:
                        approvedLeave.endDate,
                },
            });
        }

        // --------------------------------------------------------
        // Get assignments around this employee
        //
        // We need surrounding days for:
        // - Night -> Morning
        // - 6 consecutive working days
        // - Night balancing
        // --------------------------------------------------------

        const previousDate =
            new Date(newDate);

        previousDate.setDate(
            previousDate.getDate() - 1
        );

        const nextDate =
            new Date(newDate);

        nextDate.setDate(
            nextDate.getDate() + 1
        );

        const nearbyEntries =
            await RosterEntry.find({
                employee: employeeId,
                date: {
                    $gte: startOfDay(
                        previousDate
                    ),
                    $lte: endOfDay(
                        nextDate
                    ),
                },
                _id: {
                    $ne: id,
                },
            })
                .populate(
                    "shift",
                    "name startTime endTime overnight"
                )
                .lean();

        // --------------------------------------------------------
        // Night -> Morning conflict
        // --------------------------------------------------------

        if (shift.name === "Morning") {
            const previousEntry =
                nearbyEntries.find(
                    (entry) =>
                        getDateKey(entry.date) ===
                        getDateKey(previousDate)
                );

            if (
                previousEntry?.shift?.name ===
                "Night"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Morning shift cannot immediately follow a Night shift",
                    data: {
                        previousDate:
                            getDateKey(previousDate),
                        previousShift:
                            previousEntry.shift.name,
                    },
                });
            }
        }

        // --------------------------------------------------------
        // Build assignments map for consecutive-day checking
        // --------------------------------------------------------

        const assignments =
            new Map();

        assignments.set(
            employeeId.toString(),
            new Map()
        );

        // Current entry is intentionally excluded.
        for (
            const entry of nearbyEntries
        ) {
            assignments
                .get(employeeId.toString())
                .set(
                    getDateKey(entry.date),
                    {
                        employee:
                            employeeId,
                        date:
                            entry.date,
                        shift:
                            entry.shift,
                    }
                );
        }

        // --------------------------------------------------------
        // Maximum 6 consecutive working days
        // --------------------------------------------------------

        const previousWorkingDays =
            getPreviousWorkingDays(
                employeeId,
                newDate,
                assignments
            );

        if (
            previousWorkingDays >= 6
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Employee would exceed 6 consecutive working days",
            });
        }

        // --------------------------------------------------------
        // Maximum monthly Night shifts
        // --------------------------------------------------------

        let nightCount = 0;

        const month =
            newDate.getMonth() + 1;

        const year =
            newDate.getFullYear();

        const monthlyEntries =
            await RosterEntry.find({
                employee: employeeId,
                month,
                year,
                _id: {
                    $ne: id,
                },
            })
                .populate(
                    "shift",
                    "name"
                )
                .lean();

        for (
            const entry of monthlyEntries
        ) {
            if (
                entry.shift?.name ===
                "Night"
            ) {
                nightCount++;
            }
        }

        if (
            shift.name === "Night" &&
            nightCount >=
                (employee.maxNightPerMonth ?? 0)
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Maximum monthly Night shift limit reached",
                data: {
                    maxNightPerMonth:
                        employee.maxNightPerMonth ?? 0,
                    currentNightCount:
                        nightCount,
                },
            });
        }

        // --------------------------------------------------------
        // Holiday flag
        // --------------------------------------------------------

        const holiday =
            await Holiday.findOne({
                date: {
                    $gte: startOfDay(newDate),
                    $lte: endOfDay(newDate),
                },
            }).lean();

        // --------------------------------------------------------
        // Update roster entry
        //
        // Published status is NOT checked.
        // Mentor's rule: published entries remain editable.
        // --------------------------------------------------------

        rosterEntry.employee =
            employeeId;

        rosterEntry.date =
            newDate;

        rosterEntry.shift =
            shiftId;

        rosterEntry.month =
            month;

        rosterEntry.year =
            year;

        rosterEntry.isHoliday =
            Boolean(holiday);

        rosterEntry.isLeave =
            false;

        rosterEntry.isWeeklyOff =
            shift.name === "Off";

        rosterEntry.manuallyEdited =
            true;

        await rosterEntry.save();

        // --------------------------------------------------------
        // Populate response
        // --------------------------------------------------------

        const updatedEntry =
            await RosterEntry.findById(
                rosterEntry._id
            )
                .populate(
                    "employee",
                    "employeeId name designation team"
                )
                .populate(
                    "shift",
                    "name startTime endTime minimumEmployees overnight"
                );

        return res.status(200).json({
            success: true,
            message:
                "Generated roster entry updated successfully",
            data: updatedEntry,
        });
    } catch (error) {
        console.error(
            "Update generated roster entry error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to update generated roster entry",
            error: error.message,
        });
    }
};

    // ============================================================
// DELETE GENERATED ROSTER ENTRY BY ID
// Only draft/unpublished rosters can be deleted
// ============================================================

export const deleteGeneratedRosterById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid roster entry ID",
      });
    }

    // Find roster entry
    const rosterEntry = await RosterEntry.findById(id);

    if (!rosterEntry) {
      return res.status(404).json({
        success: false,
        message: "Roster entry not found",
      });
    }

    // Find the month to which this roster entry belongs
    const rosterMonth = await RosterMonth.findOne({
      month: rosterEntry.month,
      year: rosterEntry.year,
    });

    if (!rosterMonth) {
      return res.status(404).json({
        success: false,
        message: "Roster month record not found",
      });
    }

    // Published roster is locked
    if (rosterMonth.published) {
      return res.status(409).json({
        success: false,
        message:
          "Published roster cannot be deleted",
      });
    }

    // Delete only if draft/unpublished
    await RosterEntry.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message:
        "Generated roster entry deleted successfully",
      data: {
        deletedRosterId: id,
        month: rosterEntry.month,
        year: rosterEntry.year,
      },
    });
  } catch (error) {
    console.error(
      "Delete generated roster entry error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete generated roster entry",
      error: error.message,
    });
  }
};