import { apiSlice } from "./apiSlice";

export const employeeApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getEmployees: builder.query({
            query: ({ page = 1, limit = 10 } = {}) =>
                `/employees?page=${page}&limit=${limit}`,
            providesTags: ["Employee"],
        }),
    }),
});

export const {
    useGetEmployeesQuery,
} = employeeApi;