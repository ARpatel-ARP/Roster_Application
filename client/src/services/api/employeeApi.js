import { apiSlice } from "./apiSlice";

export const employeeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getEmployees: builder.query({
      query: ({ page = 1, limit = 10 } = {}) =>
        `/employees?page=${page}&limit=${limit}`,
      providesTags: ["Employee"],
    }),

    getEmployeeById: builder.query({
      query: (id) => `/employees/${id}`,
      providesTags: ["Employee"],
    }),

    getDistinctTeams: builder.query({
      query: () => "/employees/teams",
      providesTags: ["Employee"],
    }),

    createEmployee: builder.mutation({
      query: (employeeData) => ({
        url: "/employees",
        method: "POST",
        body: employeeData,
      }),
      invalidatesTags: ["Employee"],
    }),

    updateEmployee: builder.mutation({
      query: ({ id, ...employeeData }) => ({
        url: `/employees/${id}`,
        method: "PUT",
        body: employeeData,
      }),
      invalidatesTags: ["Employee"],
    }),

    deleteEmployee: builder.mutation({
      query: (id) => ({
        url: `/employees/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Employee"],
    }),
  }),
});

export const {
  useGetEmployeesQuery,
  useGetEmployeeByIdQuery,
  useGetDistinctTeamsQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} = employeeApi;