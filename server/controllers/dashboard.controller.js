import Employee from '../models/Employee.js';
import Leave from '../models/Leave.js';
import Holiday from '../models/Holiday.js';

// @route  GET /api/dashboard
// @access Private (protected by verifyJWT)
export const getDashboard = async (req, res) => {
  try {
    // Get start and end of today for date-range comparisons
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Run all queries in parallel for speed
    const [totalEmployees, activeEmployees, todayLeaves, upcomingHolidays] =
      await Promise.all([
        // Total Employees — count of all employee documents
        Employee.countDocuments(),

        // Active Employees — count where status === 'Active'
        Employee.countDocuments({ status: 'Active' }),

        // Today's Leaves — approved leaves where today falls within [startDate, endDate]
        Leave.countDocuments({
          status: 'Approved',
          startDate: { $lte: endOfToday },
          endDate: { $gte: startOfToday },
        }),

        // Upcoming Holidays — holidays dated today or later
        Holiday.countDocuments({
          date: { $gte: startOfToday },
        }),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        todayLeaves,
        upcomingHolidays,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard data',
    });
  }
};