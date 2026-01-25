"use client";

import React from "react";
import { useGetMyApplicationsQuery } from "@/store/api/hostApi";
import { Briefcase, MapPin, Clock, Building, Loader2, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// Status badge component
const StatusBadge = ({ status }) => {
    const statusStyles = {
        submitted: "bg-blue-100 text-blue-700 border-blue-200",
        viewed: "bg-yellow-100 text-yellow-700 border-yellow-200",
        shortlisted: "bg-green-100 text-green-700 border-green-200",
        interview: "bg-purple-100 text-purple-700 border-purple-200",
        offer: "bg-emerald-100 text-emerald-700 border-emerald-200",
        rejected: "bg-red-100 text-red-700 border-red-200",
        withdrawn: "bg-gray-100 text-gray-700 border-gray-200",
    };

    const statusLabels = {
        submitted: "Submitted",
        viewed: "Viewed",
        shortlisted: "Shortlisted",
        interview: "Interview",
        offer: "Offer Extended",
        rejected: "Not Selected",
        withdrawn: "Withdrawn",
    };

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[status] || statusStyles.submitted}`}>
            {statusLabels[status] || status}
        </span>
    );
};

// Format date
const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

export function MyApplications() {
    const { data, isLoading, error, refetch } = useGetMyApplicationsQuery({});

    const applications = data?.applications || [];

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-500">Loading your applications...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
                <FileText className="w-16 h-16 text-red-200 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to load applications</h3>
                <p className="text-gray-500 mb-4">Something went wrong. Please try again.</p>
                <Button onClick={() => refetch()} variant="outline">
                    Retry
                </Button>
            </div>
        );
    }

    if (applications.length === 0) {
        return (
            <div className="p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Briefcase className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Applications Yet</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                    You haven't applied to any jobs yet. Browse our career opportunities and find your next role!
                </p>
                <Link to="/career">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        Browse Jobs
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">My Applications</h2>
                    <p className="text-gray-500 mt-1">Track the status of your job applications</p>
                </div>
                <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    {applications.length} Application{applications.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Applications List */}
            <div className="space-y-4">
                {applications.map((app) => (
                    <div
                        key={app.id}
                        className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Job Info */}
                            <div className="flex-1">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg flex-shrink-0">
                                        {app.job?.company?.charAt(0) || "J"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 text-lg truncate">
                                            {app.job?.title || "Job Position"}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Building className="w-4 h-4" />
                                                {app.job?.company || "Company"}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-4 h-4" />
                                                {app.job?.location || "Remote"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Status and Date */}
                            <div className="flex items-center gap-4 md:gap-6">
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 mb-1">Applied</p>
                                    <p className="text-sm font-medium text-gray-700">
                                        {formatDate(app.createdAt)}
                                    </p>
                                </div>
                                <StatusBadge status={app.status} />
                            </div>
                        </div>

                        {/* Additional Info Bar */}
                        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {app.job?.type || "Full-time"}
                                </span>
                                <span className="hidden md:inline">•</span>
                                <span className="hidden md:inline">
                                    {app.job?.workStyle || "On-site"}
                                </span>
                            </div>
                            <Link to={`/career?job=${app.job?.id}`}>
                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                                    View Job <ExternalLink className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
