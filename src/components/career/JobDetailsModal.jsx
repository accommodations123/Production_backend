import React, { useEffect, useState } from 'react'
import { X, MapPin, Clock, DollarSign, Briefcase, Building, Calendar, Heart, Share2, User, Mail, Phone, Award, TrendingUp, CheckCircle, Star, Wifi } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from 'framer-motion'

import { ApplicationForm } from './ApplicationForm'
import { toast } from "sonner"
import { useGetJobByIdQuery } from "@/store/api/hostApi"
import { Loader2 } from "lucide-react"

// Function to get work style icon
const getWorkStyleIcon = (workStyle) => {
    switch (workStyle?.toLowerCase()) {
        case 'remote':
            return <Wifi className="h-5 w-5" />;
        case 'hybrid':
            return <Wifi className="h-5 w-5" />;
        case 'on-site':
        default:
            return <Building className="h-5 w-5" />;
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

export function JobDetailsModal({ job: initialJob, isOpen, onClose }) {
    const [showApplicationForm, setShowApplicationForm] = React.useState(false)

    // Fetch full job details if we have an ID
    const jobId = initialJob?.id || initialJob?._id;
    const { data: apiJobDetails, isLoading, isError } = useGetJobByIdQuery(jobId, {
        skip: !isOpen || !jobId,
    });

    // Merge initial job data with API data (API takes precedence)
    const job = React.useMemo(() => {
        if (!apiJobDetails) return initialJob;
        // Re-transform API data if needed, or assume API returns same shape
        // For safety, we merge keys.
        return { ...initialJob, ...apiJobDetails };
    }, [initialJob, apiJobDetails]);

    // Reset state when modal opens/closes or job changes
    useEffect(() => {
        if (isOpen) {
            setShowApplicationForm(false);
        }
    }, [isOpen, initialJob]);

    // Prevent scrolling on body when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!job) return null


    // Format the posted date
    const postedDate = new Date(job.postedDate)
    const now = new Date()
    const diffTime = Math.abs(now - postedDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // (Moved body scroll lock effect up)

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
            />
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4 md:p-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
                >
                    {/* Header */}
                    <div className="relative bg-white border-b border-gray-100 flex-shrink-0">
                        {/* Banner/Pattern */}
                        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center opacity-10" />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full h-10 w-10"
                                onClick={onClose}
                            >
                                <X className="h-6 w-6" />
                            </Button>
                        </div>

                        <div className="px-8 pb-6 -mt-12 flex flex-col md:flex-row md:items-end gap-6">
                            <div className="w-24 h-24 rounded-xl bg-white p-2 shadow-lg border border-gray-100">
                                {job.logo ? (
                                    <img
                                        src={job.logo}
                                        alt={job.company}
                                        className="w-full h-full object-contain rounded-lg"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-3xl font-bold">
                                        {job.company.charAt(0)}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 pb-2">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h2>
                                        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-600">
                                            <span className="flex items-center gap-1.5">
                                                <Building className="h-4 w-4 text-gray-400" />
                                                {job.company}
                                            </span>
                                            <span className="hidden md:inline text-gray-300">•</span>
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="h-4 w-4 text-gray-400" />
                                                {job.location}
                                            </span>
                                            <span className="hidden md:inline text-gray-300">•</span>
                                            <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-0.5 rounded-full">
                                                {diffDays === 0 ? 'Posted Today' : `Posted ${diffDays}d ago`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto relative">
                        {isLoading && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                                <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                            </div>
                        )}
                        {/* Quick Stats Bar */}
                        <div className="bg-gray-50 border-b border-gray-100 px-8 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Salary</p>
                                    <p className="text-sm font-bold text-gray-900">{job.salary}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                                    <Briefcase className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Experience</p>
                                    <p className="text-sm font-bold text-gray-900">{job.experience}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Job Type</p>
                                    <p className="text-sm font-bold text-gray-900">{job.type}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    {getWorkStyleIcon(job.workStyle)}
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Work Style</p>
                                    <p className="text-sm font-bold text-gray-900">{getWorkStyleLabel(job.workStyle)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1">
                            {showApplicationForm ? (
                                <ApplicationForm
                                    jobId={job.id || job._id}
                                    jobTitle={job.title}
                                    onSuccess={() => {
                                        onClose();
                                    }}
                                    onCancel={() => setShowApplicationForm(false)}
                                />
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-8">
                                        <div>
                                            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                <Briefcase className="h-6 w-6 text-blue-600" />
                                                Job Description
                                            </h3>
                                            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{job.description}</p>
                                        </div>

                                        <div>
                                            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                <CheckCircle className="h-6 w-6 text-blue-600" />
                                                Responsibilities
                                            </h3>
                                            <ul className="space-y-3 text-gray-600">
                                                {job.responsibilities?.map((responsibility, index) => (
                                                    <li key={index} className="flex items-start gap-3">
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                            <CheckCircle className="h-4 w-4 text-blue-600" />
                                                        </div>
                                                        <span>{responsibility}</span>
                                                    </li>
                                                )) || (
                                                        <li>No specific responsibilities listed</li>
                                                    )}
                                            </ul>
                                        </div>

                                        <div>
                                            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                <Award className="h-6 w-6 text-blue-600" />
                                                Requirements
                                            </h3>
                                            <ul className="space-y-3 text-gray-600">
                                                {job.requirements?.map((requirement, index) => (
                                                    <li key={index} className="flex items-start gap-3">
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                            <CheckCircle className="h-4 w-4 text-blue-600" />
                                                        </div>
                                                        <span>{requirement}</span>
                                                    </li>
                                                )) || (
                                                        <li>No specific requirements listed</li>
                                                    )}
                                            </ul>
                                        </div>

                                        {job.benefits && (
                                            <div>
                                                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                    <TrendingUp className="h-6 w-6 text-blue-600" />
                                                    Benefits
                                                </h3>
                                                <ul className="space-y-3 text-gray-600">
                                                    {job.benefits.map((benefit, index) => (
                                                        <li key={index} className="flex items-start gap-3">
                                                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                                <CheckCircle className="h-4 w-4 text-blue-600" />
                                                            </div>
                                                            <span>{benefit}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-8">
                                        <div className="bg-gray-50 rounded-xl p-6">
                                            <h3 className="text-xl font-bold text-gray-900 mb-4">Job Summary</h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Experience</span>
                                                    <span className="font-medium text-gray-900">{job.experience}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Job Type</span>
                                                    <span className="font-medium text-gray-900">{job.type}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Work Style</span>
                                                    <span className="font-medium text-gray-900">{getWorkStyleLabel(job.workStyle)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Salary</span>
                                                    <span className="font-medium text-gray-900">{job.salary}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Location</span>
                                                    <span className="font-medium text-gray-900">{job.location}</span>
                                                </div>
                                                {job.applicants && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Applicants</span>
                                                        <span className="font-medium text-gray-900">{job.applicants}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 rounded-xl p-6">
                                            <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h3>
                                            <div className="space-y-3 text-gray-600">
                                                <div className="flex items-center gap-3">
                                                    <User className="h-5 w-5 text-gray-400" />
                                                    <span>{job.contactPerson || 'Hiring Manager'}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Mail className="h-5 w-5 text-gray-400" />
                                                    <span>{job.contactEmail || 'careers@nextkinlife.com'}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Phone className="h-5 w-5 text-gray-400" />
                                                    <span>{job.contactPhone || '+1 (555) 123-4567'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl p-6 border border-blue-200">
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">About {job.company}</h3>
                                            <p className="text-gray-600 text-sm leading-relaxed">{job.companyDescription}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {!showApplicationForm && (
                            <div className="p-8 border-t border-gray-100 bg-gray-50">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Button
                                        variant="outline"
                                        className="flex items-center justify-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-all h-12"
                                        onClick={() => {
                                            toast.success("Job saved to favorites");
                                        }}
                                    >
                                        <Heart className="h-5 w-5" />
                                        Save Job
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex items-center justify-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-all h-12"
                                        onClick={() => {
                                            navigator.clipboard.writeText(window.location.href);
                                            toast.success("Link copied to clipboard");
                                        }}
                                    >
                                        <Share2 className="h-5 w-5" />
                                        Share Job
                                    </Button>
                                    <Button
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white transition-all h-12 text-base font-medium"
                                        onClick={() => {
                                            setShowApplicationForm(true);
                                        }}
                                    >
                                        Apply Now
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </>
    )
}