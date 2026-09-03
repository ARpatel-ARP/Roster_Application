import { apiSlice } from "./apiSlice.js";

export const teamApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTeams: builder.query({
      query: () => "/teams",
      providesTags: ["Team"],
    }),
  }),
});

export const {
  useGetTeamsQuery,
} = teamApi;