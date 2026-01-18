import React, { useState } from "react"
import { MapPin, Briefcase, DollarSign, Clock, ChevronRight, Building, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"

// Function to generate a consistent color based on company name
const getCompanyColor = (companyName) => {
    const colors = [
        "bg-blue-500", "bg-green-500", "bg-red-500", "bg-purple-500",
        "bg-yellow-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500"
    ];

    let hash = 0;
    if (!companyName) return colors[0];
    for (let i = 0; i < companyName.length; i++) {
        hash = companyName.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
}

// Function to get company initial
const getCompanyInitial = (companyName) => {
    return companyName ? companyName.charAt(0).toUpperCase() : '';
}

// Function to get work style icon
const getWorkStyleIcon = (workStyle) => {
    switch (workStyle?.toLowerCase()) {
        case 'remote':
            return <Wifi className="h-4 w-4" />;
        case 'hybrid':
            return <Wifi className="h-4 w-4" />;
        case 'on-site':
        default:
            return <Building className="h-4 w-4" />;
    }
}

// Function to get work style label
const getWorkStyleLabel = (workStyle) => {
    switch (workStyle?.toLowerCase()) {
        case 'remote':
            return 'Remote';
        case 'hybrid':
            return 'Hybrid';
        case 'on-site':
            return 'On-site';
        default:
            return workStyle || 'Not specified';
    }
}

export function JobCard({ job, onViewDetails }) {
    // State to track if image has loaded successfully
    const [imageError, setImageError] = useState(false)

    return (
        <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-all group relative overflow-hidden">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Logo */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                    {job.logo && !imageError ? (
                        <img
                            src={job.logo}
                            alt={job.company}
                            className="w-full h-full object-cover"
                            onError={() => {
                                setImageError(true);
                            }}
                        />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center ${getCompanyColor(job.company)}`}>
                            <span className="text-white font-bold text-xl">
                                {getCompanyInitial(job.company)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {job.title}
                            </h3>
                            <p className="text-gray-500 font-medium">{job.company}</p>
                        </div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                            {job.posted}
                        </span>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Briefcase className="h-4 w-4" />
                            {job.experience}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <DollarSign className="h-4 w-4" />
                            {job.salary}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            {job.type}
                        </div>
                        <div className="flex items-center gap-1.5">
                            {getWorkStyleIcon(job.workStyle)}
                            <span>{getWorkStyleLabel(job.workStyle)}</span>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {job.description}
                    </p>

                    {/* Technologies */}
                    {job.technologies && Array.isArray(job.technologies) && job.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {job.technologies.slice(0, 4).map((tech, index) => (
                                <span
                                    key={index}
                                    className="px-2 py-1 rounded-md bg-gray-50 text-gray-600 text-xs font-medium"
                                >
                                    {tech}
                                </span>
                            ))}
                            {job.technologies.length > 4 && (
                                <span className="px-2 py-1 rounded-md bg-gray-50 text-gray-600 text-xs font-medium">
                                    +{job.technologies.length - 4} more
                                </span>
                            )}
                        </div>
                    )}

                    {/* Skills & Action */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-50">
                        <div className="flex flex-wrap gap-2">
                            {job.skills && Array.isArray(job.skills) && job.skills.map((skill, index) => (
                                <span
                                    key={index}
                                    className="px-2 py-1 rounded-md bg-gray-50 text-gray-600 text-xs font-medium"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                        <Button
                            onClick={() => onViewDetails(job)}
                            className="w-full md:w-auto bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
                        >
                            View Details
                            <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}