import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const rawBase = fetchBaseQuery({
    baseUrl: import.meta.env.PROD
        ? "https://accomodation.api.test.nextkinlife.live"
        : "/api",
    credentials: 'include',
    prepareHeaders: (headers) => {
        const countryData = localStorage.getItem("selectedCountry");

        if (countryData) {
            try {
                const country = JSON.parse(countryData);
                if (country?.name) {
                    // Backend expects full name for primary filtering (e.g. "India")
                    headers.set("X-Country", country.name);

                    // Send code for future use
                    if (country.code) {
                        headers.set("X-Country-Code", country.code);
                    }
                } else if (country?.code) {
                    headers.set("X-Country", country.code);
                }
            } catch (e) {
                console.error("Error parsing selectedCountry for header", e);
            }
        }
        return headers;
    },
})

const baseQueryWithLogger = async (args, api, extraOptions) => {
    try {
        const result = await rawBase(args, api, extraOptions)

        if (result.error) {
            const status = result.error.status;
            const url = args.url || args;

            if (status === 401) {
                // console.log(`🔐 Auth: Unauthorized (401) on ${url} - User might not be logged in.`);
            } else if (status === 403) {
                console.warn(`🚫 Auth: Forbidden (403) on ${url}`);
            } else {
                console.error(`⬅️ RTK Request Error [${status}] on ${url}:`, result.error);
            }
        }
        return result
    } catch (err) {
        console.error("❌ RTK baseQuery fatal error", err)
        return { error: { status: 'CUSTOM_ERROR', error: err.message } }
    }
}

export const authApi = createApi({
    reducerPath: 'authApi',
    tagTypes: ['User'],
    baseQuery: baseQueryWithLogger,
    endpoints: (builder) => ({
        login: builder.mutation({
            query: (credentials) => ({
                url: 'login',
                method: 'POST',
                body: credentials,
            }),
        }),
        getMe: builder.query({
            query: () => "auth/me",
            providesTags: ["User"],
        }),
        logout: builder.mutation({
            query: () => ({
                url: 'logout',
                method: 'POST',
            }),
            invalidatesTags: ['User'],
        }),
        sendOtp: builder.mutation({
            query: ({ email, phone }) => ({
                url: "otp/send-otp",
                method: "POST",
                body: { email, phone },
            }),
        }),
        verifyOtp: builder.mutation({
            query: ({ email, phone, otp }) => ({
                url: "otp/verify-otp",
                method: "POST",
                body: { email, phone, otp },
            }),
            invalidatesTags: ['User'],
            transformResponse: (response) => {
                const user = response?.user || response?.data?.user;
                return { ...response, user };
            },
        }),
    }),
})

export const { useLoginMutation, useGetMeQuery, useLazyGetMeQuery, useLogoutMutation, useSendOtpMutation, useVerifyOtpMutation } = authApi
