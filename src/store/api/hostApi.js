import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const API_BASE_URL = import.meta.env.PROD
    ? "https://accomodation.api.test.nextkinlife.live"
    : "/api";

const rawBase = fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: 'include',
    prepareHeaders: (headers) => {
        const countryData = localStorage.getItem("selectedCountry");

        // If the query already provided a specific X-Country header (e.g. for events which prefer code), do not override it.
        if (headers.has("X-Country")) {
            return headers;
        }

        if (countryData) {
            try {
                const country = JSON.parse(countryData);
                if (country?.name) {
                    headers.set("X-Country", country.name);
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

        // Log all errors for visibility in console
        if (result.error) {
            const status = result.error.status;
            const url = args.url || args;

            if (status === 401) {
                // Silently handle 401 - Do not throw, just warn
                console.warn(`🔐 Auth: Unauthorized (401) on ${url}`);
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

export const hostApi = createApi({
    reducerPath: "hostApi",
    baseQuery: baseQueryWithLogger,
    tagTypes: ["Property", "Host", "Event", "Community", "BuySell"],
    endpoints: (builder) => ({
        saveHost: builder.mutation({
            query: (hostData) => ({
                url: "host/save",
                method: "POST",
                body: hostData,
            }),
            invalidatesTags: ["Host"],
        }),

        getHostProfile: builder.query({
            query: () => "host/get",
            providesTags: ["Host"],
            transformResponse: (response) => response?.host || response?.data || response,
        }),

        getApprovedHostDetails: builder.query({
            query: () => "admin/approved/approved-host-details",
            transformResponse: (response) => response?.data || response?.hosts || response || [],
        }),

        getApprovedProperties: builder.query({
            query: () => "property/approved",
            providesTags: ["Property"],
            transformResponse: (response) => {
                const items = response?.properties || response?.data?.properties || response?.data || response || [];
                return Array.isArray(items) ? items : [];
            },
        }),

        getMyListings: builder.query({
            query: () => ({
                url: "property/my-listings",
                headers: { 'Cache-Control': 'no-cache' }
            }),
            providesTags: (result) =>
                result && Array.isArray(result)
                    ? [...result.map(({ id, _id }) => ({ type: "Property", id: _id || id })), { type: "Property", id: "LIST" }]
                    : [{ type: "Property", id: "LIST" }],
            transformResponse: (response) => {
                let results = response?.data?.properties || response?.properties || response?.listings || response?.data || response || [];
                return Array.isArray(results) ? results : [];
            },
        }),

        getPropertyById: builder.query({
            query: (id) => `property/${id}`,
            transformResponse: (response) => response?.property ? response : { property: response, host: {} },
        }),

        getApprovedEvents: builder.query({
            query: () => {
                // Events prefer country CODE (e.g. "IN")
                const countryData = localStorage.getItem("selectedCountry");
                let countryCode = "IN";
                if (countryData) {
                    try {
                        const c = JSON.parse(countryData);
                        if (c.code) countryCode = c.code;
                    } catch (e) { console.error(e); }
                }
                return {
                    url: "events/approved",
                    headers: { "X-Country": countryCode }
                };
            },
            providesTags: ["Event"],
            transformResponse: (response) => {
                console.log("Events API Response:", response);
                const items = response?.data?.events || response?.events || response?.data || response || [];
                return Array.isArray(items) ? items : [];
            }
        }),

        getEventById: builder.query({
            query: (id) => {
                const countryData = localStorage.getItem("selectedCountry");
                let countryCode = "IN";
                if (countryData) {
                    try {
                        const c = JSON.parse(countryData);
                        if (c.code) countryCode = c.code;
                    } catch (e) { }
                }
                return {
                    url: `events/${id}`,
                    headers: { "X-Country": countryCode }
                };
            },
            transformResponse: (response) => response?.event || response?.data || response,
        }),

        uploadFile: builder.mutation({
            query: (formData) => ({
                url: "upload",
                method: "POST",
                body: formData,
            }),
        }),

        createPropertyDraft: builder.mutation({
            query: (data) => ({
                url: "property/create-draft",
                method: "POST",
                body: data,
            }),
        }),

        updatePropertyBasic: builder.mutation({
            query: ({ id, data }) => ({
                url: `property/basic-info/${id}`,
                method: "PUT",
                body: data,
            }),
        }),

        updatePropertyAddress: builder.mutation({
            query: ({ id, data }) => ({
                url: `property/address/${id}`,
                method: "PUT",
                body: data,
            }),
        }),

        updatePropertyPricing: builder.mutation({
            query: ({ id, data }) => ({
                url: `property/pricing/${id}`,
                method: "PUT",
                body: data,
            }),
        }),

        updatePropertyAmenities: builder.mutation({
            query: ({ id, amenities }) => ({
                url: `property/amenities/${id}`,
                method: "PUT",
                body: { amenities },
            }),
        }),

        updatePropertyRules: builder.mutation({
            query: ({ id, rules }) => ({
                url: `property/rules/${id}`,
                method: "PUT",
                body: { rules },
            }),
        }),

        updatePropertyMedia: builder.mutation({
            query: ({ id, formData }) => ({
                url: `property/media/${id}`,
                method: "PUT",
                body: formData,
            }),
        }),

        updatePropertyVideo: builder.mutation({
            query: ({ id, formData }) => ({
                url: `property/media/video/${id}`,
                method: "PUT",
                body: formData,
            }),
        }),

        updatePropertyLegal: builder.mutation({
            query: ({ id, formData }) => ({
                url: `property/legal/${id}`,
                method: "PUT",
                body: formData,
            }),
        }),

        submitProperty: builder.mutation({
            query: (id) => ({ url: `property/submit/${id}`, method: "PUT" }),
            invalidatesTags: (result, error, id) => [{ type: "Property", id: "LIST" }, { type: "Property", id: id }, "Property"],
        }),

        deleteProperty: builder.mutation({
            query: ({ id, reason }) => ({
                url: `property/delete/${id}`,
                method: "DELETE",
                headers: { "Accept": "application/json", "Content-Type": "application/json" },
                body: { reason: reason || "User deleted from dashboard" }
            }),
            invalidatesTags: (result, error, { id }) => [{ type: "Property", id: "LIST" }, { type: "Property", id: id }, "Property"],
        }),

        createBuySell: builder.mutation({
            query: (data) => ({ url: "buy-sell/create", method: "POST", body: data }),
            invalidatesTags: ["BuySell"],
        }),

        getBuySellListings: builder.query({
            query: () => "buy-sell/get",
            providesTags: ["BuySell"],
            transformResponse: (response) => {
                const res = response?.listings || response?.data?.listings || response?.data || response;
                return Array.isArray(res) ? res : (res?.listings || []);
            },
        }),

        getBuySellById: builder.query({
            query: (id) => `buy-sell/get/${id}`,
            transformResponse: (response) => response?.listing || response?.data?.listing || response?.data || response,
        }),

        getMyBuySellListings: builder.query({
            query: () => "buy-sell/my-buy-sell",
            providesTags: ["BuySell"],
            transformResponse: (response) => {
                const res = response?.listings || response?.data?.listings || response?.data || response;
                return Array.isArray(res) ? res : (res?.listings || []);
            },
        }),

        updateBuySell: builder.mutation({
            query: ({ id, data }) => ({ url: `buy-sell/update/${id}`, method: "PUT", body: data }),
            invalidatesTags: (result, error, { id }) => [{ type: "BuySell", id }],
        }),

        markBuySellAsSold: builder.mutation({
            query: (id) => ({ url: `buy-sell/buy-sell/${id}/sold`, method: "PATCH" }),
            invalidatesTags: (result, error, id) => [{ type: "BuySell", id }],
        }),

        deleteBuySell: builder.mutation({
            query: (id) => ({ url: `buy-sell/delete/${id}`, method: "DELETE" }),
            invalidatesTags: ["BuySell"],
        }),

        getCommunities: builder.query({
            query: () => "community",
            providesTags: ["Community"],
            transformResponse: (response) => {
                const items = response?.communities || response?.data?.communities || response?.data || response || [];
                return Array.isArray(items) ? items : [];
            },
        }),

        getCommunityById: builder.query({
            query: (id) => `community/${id}`,
            transformResponse: (response) => response?.community || response?.data || response,
        }),

        joinCommunity: builder.mutation({
            query: (id) => ({ url: `community/${id}/join`, method: "POST" }),
            invalidatesTags: (result, error, id) => [{ type: "Community", id }],
        }),

        leaveCommunity: builder.mutation({
            query: (id) => ({ url: `community/${id}/leave`, method: "POST" }),
            invalidatesTags: (result, error, id) => [{ type: "Community", id }],
        }),

        createCommunity: builder.mutation({
            query: (data) => ({ url: "community", method: "POST", body: data }),
            invalidatesTags: ["Community"],
        }),

        updateCommunity: builder.mutation({
            query: ({ id, data }) => ({ url: `community/${id}/update`, method: "PUT", body: data }),
            invalidatesTags: (result, error, { id }) => [{ type: "Community", id }],
        }),
        getMyEvents: builder.query({
            query: () => {
                const countryData = localStorage.getItem("selectedCountry");
                let countryCode = "IN";
                if (countryData) {
                    try {
                        const c = JSON.parse(countryData);
                        if (c.code) countryCode = c.code;
                    } catch (e) { }
                }
                return {
                    url: "events/host/my-events",
                    headers: { "X-Country": countryCode }
                }
            },
            providesTags: ["Event"],
            transformResponse: (response) => {
                const results = response?.data?.events || response?.events || response || [];
                return Array.isArray(results) ? results : [];
            },
        }),
        deleteEvent: builder.mutation({
            query: (id) => ({
                url: `events/delete/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Event"],
        }),
    }),
});

export const {
    useSaveHostMutation,
    useSendOtpMutation,
    useVerifyOtpMutation,
    useGetHostProfileQuery,
    useGetApprovedHostDetailsQuery,
    useGetApprovedPropertiesQuery,
    useGetMyListingsQuery,
    useGetPropertyByIdQuery,
    useGetApprovedEventsQuery,
    useGetEventByIdQuery,
    useUploadFileMutation,
    useCreatePropertyDraftMutation,
    useUpdatePropertyBasicMutation,
    useUpdatePropertyAddressMutation,
    useUpdatePropertyPricingMutation,
    useUpdatePropertyAmenitiesMutation,
    useUpdatePropertyRulesMutation,
    useUpdatePropertyMediaMutation,
    useUpdatePropertyVideoMutation,
    useUpdatePropertyLegalMutation,
    useSubmitPropertyMutation,
    useDeletePropertyMutation,
    useCreateBuySellMutation,
    useGetBuySellListingsQuery,
    useGetBuySellByIdQuery,
    useGetMyBuySellListingsQuery,
    useUpdateBuySellMutation,
    useMarkBuySellAsSoldMutation,
    useDeleteBuySellMutation,
    useGetCommunitiesQuery,
    useGetCommunityByIdQuery,
    useJoinCommunityMutation,
    useLeaveCommunityMutation,
    useCreateCommunityMutation,
    useUpdateCommunityMutation,
    useGetMyEventsQuery,
    useDeleteEventMutation,
} = hostApi;
