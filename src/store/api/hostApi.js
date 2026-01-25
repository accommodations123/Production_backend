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
            } else if (status === 400 && (String(url).includes('/join') || String(url).includes('/leave'))) {
                // Suppress 400 for join/leave as these are often "Already member" / "Not member" handled by UI
                console.warn(`⚠️ API: Handled 400 on ${url} - ${result.error.data?.message || 'Bad Request'}`);
            } else {
                console.error(`⬅️ RTK Request Error [${status}] on ${url}:`, result.error);
            }

            // Sync localStorage on auth errors
            if (status === 401 || status === 403) {
                localStorage.removeItem("user");
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
    tagTypes: ["Property", "Host", "Event", "Community", "BuySell", "Review", "Job", "Trips", "Match", "Notification"],
    endpoints: (builder) => ({
        saveHost: builder.mutation({
            query: (hostData) => ({
                url: "host/save",
                method: "POST",
                body: hostData,
                credentials: "include"
            }),
            invalidatesTags: ["Host"],
        }),
        updateHost: builder.mutation({
            query: ({ hostId, data }) => {
                const isFormData =
                    typeof FormData !== "undefined" && data instanceof FormData;

                return {
                    url: `host/update/${hostId}`,
                    method: "PUT",
                    body: data,
                    credentials: "include"
                };
            },
            // Force refetch after successful update
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                    // Refetch the host profile
                    dispatch(hostApi.util.invalidateTags(['Host']));
                } catch (error) {
                    console.error('Update failed:', error);
                }
            },
            invalidatesTags: ["Host"],
        }),



        getHostProfile: builder.query({
            query: () => "host/get",
            providesTags: ["Host"],
            transformResponse: (response) => response?.host || response?.data || response,
        }),

        getApprovedHostDetails: builder.query({
            query: (country) => ({
                url: "admin/approved/approved-host-details",
                params: country ? { country } : undefined
            }),
            transformResponse: (response) => response?.data || response?.hosts || response || [],
        }),

        getApprovedProperties: builder.query({
            query: (country) => ({
                url: "property/approved",
                params: country ? { country } : undefined
            }),
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
            query: (countryCode) => {
                // Events prefer country CODE (e.g. "IN")
                const code = countryCode || (() => {
                    const countryData = localStorage.getItem("selectedCountry");
                    if (countryData) {
                        try {
                            const c = JSON.parse(countryData);
                            return c.code || "IN";
                        } catch (e) { console.error(e); }
                    }
                    return "IN";
                })();

                return {
                    url: "events/approved",
                    headers: { "X-Country": code }
                };
            },
            providesTags: ["Event"],
            transformResponse: (response) => {
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
            transformResponse: (response) => {
                const event = response?.event || response?.data || response;
                // Merge is_registered if it exists at the root level but not in the event object
                if (response?.is_registered !== undefined && event && typeof event === 'object') {
                    return { ...event, is_registered: response.is_registered };
                }
                return event;
            },
            providesTags: (result, error, id) => [{ type: "Event", id }],
        }),

        uploadFile: builder.mutation({
            query: (formData) => ({
                url: "upload",
                method: "POST",
                body: formData,
                credentials: "include"
            }),
        }),

        createPropertyDraft: builder.mutation({
            query: (data) => ({
                url: "property/create-draft",
                method: "POST",
                body: data,
                credentials: "include"
            }),
        }),

        updatePropertyBasic: builder.mutation({
            query: ({ id, data }) => ({
                url: `property/basic-info/${id}`,
                method: "PUT",
                body: data,
                credentials: "include"
            }),
        }),

        updatePropertyAddress: builder.mutation({
            query: ({ id, data }) => ({
                url: `property/address/${id}`,
                method: "PUT",
                body: data,
                credentials: "include"
            }),
        }),

        updatePropertyPricing: builder.mutation({
            query: ({ id, data }) => ({
                url: `property/pricing/${id}`,
                method: "PUT",
                body: data,
                credentials: "include"
            }),
        }),

        updatePropertyAmenities: builder.mutation({
            query: ({ id, amenities }) => ({
                url: `property/amenities/${id}`,
                method: "PUT",
                body: { amenities },
                credentials: "include"
            }),
        }),

        updatePropertyRules: builder.mutation({
            query: ({ id, rules }) => ({
                url: `property/rules/${id}`,
                method: "PUT",
                body: { rules },
                credentials: "include"
            }),
        }),

        updatePropertyMedia: builder.mutation({
            query: ({ id, formData }) => ({
                url: `property/media/${id}`,
                method: "PUT",
                body: formData,
                credentials: "include"
            }),
        }),

        updatePropertyVideo: builder.mutation({
            query: ({ id, formData }) => ({
                url: `property/media/video/${id}`,
                method: "PUT",
                body: formData,
                credentials: "include"
            }),
        }),



        submitProperty: builder.mutation({
            query: (id) => ({
                url: `property/submit/${id}`,
                method: "PUT",
                credentials: "include"
            }),
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
            query: (country) => ({
                url: "buy-sell/get",
                params: country ? { country } : undefined
            }),
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
            query: (country) => ({
                url: "community",
                params: country ? { country } : undefined
            }),
            providesTags: ["Community"],
            transformResponse: (response) => {
                const items = response?.communities || response?.data?.communities || response?.data || response || [];
                return Array.isArray(items) ? items : [];
            },
        }),

        getCommunityById: builder.query({
            query: (id) => `community/${id}`,
            providesTags: (result, error, id) => [{ type: "Community", id }],
            transformResponse: (response) => {
                const community = response?.community || response?.data || response;
                // Merge is_member/isJoined if it exists at the root level but not in the community object
                if (community && typeof community === 'object') {
                    if (response?.is_member !== undefined && community.is_member === undefined) {
                        return { ...community, is_member: response.is_member };
                    }
                    if (response?.isJoined !== undefined && community.isJoined === undefined) {
                        return { ...community, isJoined: response.isJoined };
                    }
                }
                return community;
            },
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

        // Community Feed & Resources
        createCommunityPost: builder.mutation({
            query: ({ id, data }) => ({
                url: `community/communities/${id}/posts`,
                method: "POST",
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: "Community", id: `FEED-${id}` }],
        }),

        getCommunityFeed: builder.query({
            query: ({ id, page = 1 }) => `community/communities/${id}/posts?page=${page}`,
            providesTags: (result, error, { id }) => [{ type: "Community", id: `FEED-${id}` }],
            transformResponse: (response) => response?.posts || [],
        }),

        deleteCommunityPost: builder.mutation({
            query: (postId) => ({
                url: `community/communities/posts/${postId}`,
                method: "DELETE",
            }),
            invalidatesTags: (result, error, arg) => ["Community"], // Broad invalidation or specific if we knew community ID
        }),

        addCommunityResource: builder.mutation({
            query: ({ id, data }) => ({
                url: `community/communities/${id}/resources`,
                method: "POST",
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: "Community", id: `RESOURCES-${id}` }],
        }),

        getCommunityResources: builder.query({
            query: (id) => `community/communities/${id}/resources`,
            providesTags: (result, error, id) => [{ type: "Community", id: `RESOURCES-${id}` }],
            transformResponse: (response) => response?.resources || [],
        }),

        deleteCommunityResource: builder.mutation({
            query: (resourceId) => ({
                url: `community/communities/resources/${resourceId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Community"],
        }),
        // Reviews
        getEventReviews: builder.query({
            query: (id) => `events/reviews/${id}/reviews`,
            providesTags: (result, error, id) => [{ type: "Review", id }],
            transformResponse: (response) => {
                const results = response?.reviews || response?.data || response || [];
                return Array.isArray(results) ? results : [];
            }
        }),

        addEventReview: builder.mutation({
            query: ({ id, data }) => ({
                url: `events/reviews/${id}/reviews`,
                method: "POST",
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: "Review", id }, { type: "Event", id }],
        }),

        getEventRating: builder.query({
            query: (id) => `events/reviews/${id}/rating`,
            providesTags: (result, error, id) => [{ type: "Review", id }],
        }),

        hideEventReview: builder.mutation({
            query: (id) => ({
                url: `events/reviews/reviews/${id}/hide`,
                method: "PATCH",
            }),
            invalidatesTags: (result, error, id) => [{ type: "Review", id }, { type: "Event", id }],
        }),

        joinEvent: builder.mutation({
            query: (id) => ({
                url: `events/${id}/join`,
                method: "POST",
            }),
            invalidatesTags: (result, error, id) => [{ type: "Event", id }],
        }),

        leaveEvent: builder.mutation({
            query: (id) => ({
                url: `events/${id}/leave`,
                method: "POST",
            }),
            invalidatesTags: (result, error, id) => [{ type: "Event", id }],
        }),
        getJobs: builder.query({
            query: () => "carrer/jobs",
            providesTags: ["Job"],
            transformResponse: (response) => {
                const jobs = response?.jobs || response?.data || response || [];
                if (!Array.isArray(jobs)) return [];

                // Helper function defined BEFORE use
                const getTimeAgo = (date) => {
                    if (!date) return "Recently";
                    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
                    if (seconds < 60) return "Just now";
                    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
                    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
                    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
                    return new Date(date).toLocaleDateString();
                };

                // Helper to normalize work_style values
                const normalizeWorkStyle = (val) => {
                    if (!val) return "Not specified";
                    const map = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };
                    return map[val.toLowerCase()] || val;
                };

                // Helper to normalize employment_type values
                const normalizeType = (val) => {
                    if (!val) return "Full-time";
                    const map = { full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship" };
                    return map[val.toLowerCase()] || val;
                };

                // Helper to normalize experience_level values
                const normalizeExperience = (val) => {
                    if (!val) return "Not specified";
                    const map = { junior: "Entry Level", mid: "2-4 years", senior: "5+ years", lead: "7+ years" };
                    return map[val.toLowerCase()] || val;
                };

                return jobs.map(job => ({
                    ...job,
                    id: job.id || job._id,
                    title: job.title || "Untitled Position",
                    company: job.company || "Company",
                    description: job.description || "",
                    department: job.department || "General",
                    location: job.location || "Remote",
                    experience: normalizeExperience(job.experience_level),
                    type: normalizeType(job.employment_type),
                    workStyle: normalizeWorkStyle(job.work_style),
                    salary: job.salary_range || job.salary || "Competitive",
                    postedDate: job.createdAt || job.created_at || new Date().toISOString(),
                    posted: getTimeAgo(job.createdAt || job.created_at),
                    applicants: job.applications_count || job.applicants || 0,
                    responsibilities: job.responsibilities || [],
                    requirements: job.requirements || [],
                    benefits: job.benefits || [],
                    skills: job.skills || [],
                    featured: job.featured || false,
                    isNew: (new Date() - new Date(job.createdAt || job.created_at || 0)) < 7 * 24 * 60 * 60 * 1000,
                }));
            },
        }),
        getJobById: builder.query({
            query: (id) => `carrer/jobs/${id}`,
            providesTags: (result, error, id) => [{ type: "Job", id }],
            transformResponse: (response) => {
                const job = response?.job || response?.data || response;
                if (!job) return null;
                return {
                    ...job,
                    id: job.id || job._id,
                    experience: job.experience_level || job.experience,
                    type: job.employment_type || job.type,
                    workStyle: job.work_style || job.workStyle,
                    salary: job.salary_range || job.salary,
                    postedDate: job.createdAt || job.postedDate,
                    applicants: job.applications_count || job.applicants,
                    // Ensure arrays are present
                    responsibilities: job.responsibilities || [],
                    requirements: job.requirements || [],
                    benefits: job.benefits || [],
                };
            },
        }),
        applyForJob: builder.mutation({
            query: (formData) => ({
                url: "carrer/applications",
                method: "POST",
                body: formData,
            }),
            invalidatesTags: ["MyApplications", "Job"],
        }),
        getMyApplications: builder.query({
            query: ({ page = 1, limit = 10 } = {}) => `carrer/applications/me?page=${page}&limit=${limit}`,
            providesTags: ["MyApplications"],
            transformResponse: (response) => {
                const applications = response?.applications || response?.data || [];
                return {
                    applications: applications.map(app => ({
                        ...app,
                        id: app.id || app._id,
                        status: app.status,
                        createdAt: app.created_at || app.createdAt,
                        job: app.job ? {
                            id: app.job.id || app.job._id,
                            title: app.job.title,
                            company: app.job.company,
                            location: app.job.location,
                            type: app.job.employment_type,
                            workStyle: app.job.work_style,
                        } : null,
                    })),
                    page: response?.page || 1,
                    limit: response?.limit || 10,
                };
            },
        }),

        // Travel Endpoints
        getMyTrips: builder.query({
            query: () => "travel/trips/me",
            providesTags: ["Trips"],
        }),

        getPublicTrips: builder.query({
            query: (params) => ({
                url: "travel/trips",
                params
            }),
            providesTags: ["Trips"],
        }),

        searchTrips: builder.query({
            query: (params) => ({
                url: "travel/trips/search",
                params
            }),
        }),

        createTrip: builder.mutation({
            query: (data) => ({
                url: "travel/trips",
                method: "POST",
                body: data
            }),
            invalidatesTags: ["Trips"]
        }),

        getMatches: builder.query({
            query: () => "travel/matches/received",
            providesTags: ["Match"],
        }),

        travelMatchAction: builder.mutation({
            query: (data) => ({
                url: "travel/matches/action",
                method: "POST",
                body: data
            }),
            invalidatesTags: ["Match", "Trips"]
        }),

        // Notifications
        getNotifications: builder.query({
            query: () => "notification/",
            providesTags: ["Notification"],
            transformResponse: (response) => {
                const items = response?.notifications || response?.data || response || [];
                return Array.isArray(items) ? items : [];
            },
        }),

        markNotificationAsRead: builder.mutation({
            query: (id) => ({
                url: `notification/${id}/read`,
                method: "PATCH",
            }),
            invalidatesTags: ["Notification"],
        }),

        markAllNotificationsAsRead: builder.mutation({
            query: () => ({
                url: "notification/read-all",
                method: "PATCH",
            }),
            invalidatesTags: ["Notification"],
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
    useUpdateHostMutation,
    useCreateCommunityPostMutation,
    useGetCommunityFeedQuery,
    useDeleteCommunityPostMutation,
    useAddCommunityResourceMutation,
    useGetCommunityResourcesQuery,
    useDeleteCommunityResourceMutation,
    useGetEventReviewsQuery,
    useAddEventReviewMutation,
    useGetEventRatingQuery,
    useHideEventReviewMutation,
    useJoinEventMutation,
    useLeaveEventMutation,
    useApplyForJobMutation,
    useGetJobsQuery,
    useGetJobByIdQuery,
    useGetMyTripsQuery,
    useGetPublicTripsQuery,
    useSearchTripsQuery,
    useLazySearchTripsQuery,
    useCreateTripMutation,
    useGetMatchesQuery,
    useTravelMatchActionMutation,
    useGetNotificationsQuery,
    useMarkNotificationAsReadMutation,
    useMarkAllNotificationsAsReadMutation,
    useGetMyApplicationsQuery,
} = hostApi;