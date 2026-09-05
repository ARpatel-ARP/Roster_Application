import { apiSlice } from "./apiSlice.js";

export const rosterApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // =========================
        // MANUAL ROSTER
        // =========================
        getShifts: builder.query({
            query: () => "/shifts",
            providesTags: ["Shift"],
        }),

        getRosters: builder.query({
            query: ({
                date = "",
                startDate = "",
                endDate = "",
                employee = "",
                team = "",
                shift = "",
                month = "",
                year = "",
                page = 1,
                limit = 20,
            } = {}) => {
                const params = new URLSearchParams();

                if (date) params.append("date", date);
                if (startDate) params.append("startDate", startDate);
                if (endDate) params.append("endDate", endDate);
                if (employee) params.append("employee", employee);
                if (team) params.append("team", team);
                if (shift) params.append("shift", shift);
                if (month) params.append("month", month);
                if (year) params.append("year", year);

                params.append("page", page);
                params.append("limit", limit);

                return `/rosters?${params.toString()}`;
            },
            providesTags: ["Roster"],
        }),

        getRosterById: builder.query({
            query: (id) => `/rosters/${id}`,
            providesTags: ["Roster"],
        }),

        createRoster: builder.mutation({
            query: (rosterData) => ({
                url: "/rosters",
                method: "POST",
                body: rosterData,
            }),
            invalidatesTags: ["Roster"],
        }),

        updateRoster: builder.mutation({
            query: ({ id, ...rosterData }) => ({
                url: `/rosters/${id}`,
                method: "PUT",
                body: rosterData,
            }),
            invalidatesTags: ["Roster"],
        }),

        deleteRoster: builder.mutation({
            query: (id) => ({
                url: `/rosters/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Roster"],
        }),

        // =========================
        // AUTOMATIC MONTHLY ROSTER
        // =========================

        generateMonthlyRoster: builder.mutation({
            query: ({ month, year }) => ({
                url: "/rosters/generate/monthly",
                method: "POST",
                body: { month, year },
            }),
            invalidatesTags: ["Roster"],
        }),

        getGeneratedMonthlyRoster: builder.query({
            query: ({ month, year }) =>
                `/rosters/generate/monthly?month=${month}&year=${year}`,
            providesTags: ["Roster"],
        }),

        // =========================
        // AUTOMATIC WEEKLY ROSTER
        // =========================

        generateWeeklyRoster: builder.mutation({
            query: ({ startDate }) => ({
                url: "/rosters/generate/weekly",
                method: "POST",
                body: { startDate },
            }),
            invalidatesTags: ["Roster"],
        }),

        getGeneratedWeeklyRoster: builder.query({
            query: ({ startDate }) =>
                `/rosters/generate/weekly?startDate=${startDate}`,
            providesTags: ["Roster"],
        }),

        // =========================
        // GENERATED ENTRY UPDATE
        // =========================

        updateGeneratedRoster: builder.mutation({
            query: ({ id, employee, date, shift }) => ({
                url: `/rosters/generate/${id}`,
                method: "PUT",
                body: {
                    employee,
                    date,
                    shift,
                },
            }),
            invalidatesTags: ["Roster"],
        }),

        // =========================
        // GENERATED ENTRY DELETE
        // =========================

        deleteGeneratedRoster: builder.mutation({
            query: (id) => ({
                url: `/rosters/generate/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Roster"],
        }),
    }),
});

export const {
    // Manual
    useGetShiftsQuery,
    useGetRostersQuery,
    useGetRosterByIdQuery,
    useCreateRosterMutation,
    useUpdateRosterMutation,
    useDeleteRosterMutation,

    // Automatic monthly
    useGenerateMonthlyRosterMutation,
    useGetGeneratedMonthlyRosterQuery,

    // Automatic weekly
    useGenerateWeeklyRosterMutation,
    useGetGeneratedWeeklyRosterQuery,

    // Generated entry
    useUpdateGeneratedRosterMutation,
    useDeleteGeneratedRosterMutation,
} = rosterApi;