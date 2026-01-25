"use client"

import React, { useState, useMemo } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { JobCard } from "@/components/career/JobCard"
import { FilterSection } from "@/components/career/FilterSection"
import { JobDetailsModal } from "@/components/career/JobDetailsModal"
import { FILTERS } from "@/lib/mock-jobs"
import { useGetJobsQuery } from "@/store/api/hostApi"
import { Search, MapPin, Filter, X, Briefcase, Clock, DollarSign, Building, Calendar, Users, TrendingUp, Award, ChevronRight, Star, ArrowRight, Globe, Zap, Shield, Target, Sparkles, Coffee, Wifi, Heart, Home } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

export default function CareerPage() {
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedFilters, setSelectedFilters] = useState({
        locations: [],
        experience: [],
        salary: [],
        type: [],
        department: [],
        workStyle: []
    })
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
    const [selectedJob, setSelectedJob] = useState(null)
    const [hoveredJobId, setHoveredJobId] = useState(null)
    const [activeTab, setActiveTab] = useState("all")

    const { data: jobs = [], isLoading } = useGetJobsQuery()

    const handleViewDetails = (job) => {
        setSelectedJob(job)
    }

    // Toggle filter selection
    const toggleFilter = (category, value) => {
        setSelectedFilters(prev => {
            const current = prev[category]
            const updated = current.includes(value)
                ? current.filter(item => item !== value)
                : [...current, value]
            return { ...prev, [category]: updated }
        })
    }

    // Clear all filters
    const clearFilters = () => {
        setSelectedFilters({
            locations: [],
            experience: [],
            salary: [],
            type: [],
            department: [],
            workStyle: []
        })
        setSearchQuery("")
    }

    // Filter jobs
    const filteredJobs = useMemo(() => {
        return jobs.filter(job => {
            // Search query - safely handle undefined fields
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery ||
                (job.title?.toLowerCase() || '').includes(searchLower) ||
                (job.company?.toLowerCase() || '').includes(searchLower) ||
                (job.department?.toLowerCase() || '').includes(searchLower) ||
                (job.description?.toLowerCase() || '').includes(searchLower) ||
                job.skills?.some(skill => (skill?.toLowerCase() || '').includes(searchLower))

            // Filters - safely handle undefined fields
            const matchesLocation = selectedFilters.locations.length === 0 || selectedFilters.locations.includes(job.location)
            const matchesExperience = selectedFilters.experience.length === 0 || selectedFilters.experience.includes(job.experience)
            const matchesSalary = selectedFilters.salary.length === 0 || selectedFilters.salary.includes(job.salary)
            const matchesType = selectedFilters.type.length === 0 || selectedFilters.type.includes(job.type)
            const matchesDepartment = selectedFilters.department.length === 0 || selectedFilters.department.includes(job.department)
            const matchesWorkStyle = selectedFilters.workStyle.length === 0 || selectedFilters.workStyle.includes(job.workStyle)

            // Tab filter
            const matchesTab = activeTab === "all" ||
                (activeTab === "featured" && job.featured) ||
                (activeTab === "remote" && job.workStyle === "Remote") ||
                (activeTab === "new" && job.isNew)

            return matchesSearch && matchesLocation && matchesExperience && matchesType &&
                matchesDepartment && matchesWorkStyle && matchesTab
        })
    }, [searchQuery, selectedFilters, activeTab, jobs])

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                duration: 0.4
            }
        }
    }

    const tabs = [
        { id: "all", label: "All Jobs", icon: Briefcase },
        { id: "featured", label: "Featured", icon: Star },
        { id: "remote", label: "Remote", icon: Home },
        { id: "new", label: "New", icon: Sparkles }
    ]

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 font-sans">
            <Navbar />

            {/* Enhanced Hero Section with Logo Colors */}
            <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 pt-28 pb-20 px-4 relative overflow-hidden">
                {/* Animated background elements with logo colors */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse animation-delay-2000"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-700 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-4000"></div>
                </div>

                <div className="container mx-auto max-w-6xl relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-12"
                    >
                        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                            Find Your Dream Job at <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500">NextKinLife</span>
                        </h1>
                        <p className="text-white/90 max-w-3xl mx-auto text-xl leading-relaxed">
                            Join our team of innovators and change-makers. Discover opportunities that align with your passion and skills in a collaborative, inclusive environment.
                        </p>
                    </motion.div>

                    {/* Smaller Search Bar with Logo Colors */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-white/10 backdrop-blur-md p-3 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-3 max-w-4xl mx-auto border border-white/20"
                    >
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-3 h-4 w-4 text-white/70" />
                            <input
                                type="text"
                                placeholder="Search by title, skill, or keyword..."
                                className="w-full h-12 pl-12 pr-4 rounded-xl outline-none bg-white/90 text-gray-900 placeholder:text-gray-500 focus:ring-4 focus:ring-white/30 transition-all text-base"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="h-px md:h-12 w-full md:w-px bg-white/20" />
                        <div className="flex-1 relative hidden md:block">
                            <MapPin className="absolute left-4 top-3 h-4 w-4 text-white/70" />
                            <input
                                type="text"
                                placeholder="Location or Remote"
                                className="w-full h-12 pl-12 pr-4 rounded-xl outline-none bg-white/90 text-gray-900 placeholder:text-gray-500 focus:ring-4 focus:ring-white/30 transition-all text-base"
                            />
                        </div>
                        <Button className="h-12 px-8 bg-gradient-to-r from-red-500 to-yellow-500 hover:from-red-600 hover:to-yellow-600 text-white rounded-xl font-bold text-base shadow-xl transition-all hover:shadow-2xl flex items-center gap-2">
                            Search Jobs
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </motion.div>

                    {/* Enhanced Job stats with logo colors */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="flex flex-wrap justify-center gap-8 mt-12"
                    >
                        <div className="flex items-center gap-3 text-white/90 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
                            <Briefcase className="h-6 w-6" />
                            <span className="font-semibold text-lg">{jobs.length}+ Open Positions</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/90 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
                            <Building className="h-6 w-6" />
                            <span className="font-semibold text-lg">8 Departments</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/90 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
                            <Globe className="h-6 w-6" />
                            <span className="font-semibold text-lg">12 Locations</span>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Job Category Tabs with logo colors */}
            <div className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
                <div className="container mx-auto max-w-6xl px-4">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-2 overflow-x-auto">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                        ? "bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                        }`}
                                >
                                    <tab.icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                            <span>Showing {filteredJobs.length} of {jobs.length} jobs</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Company Benefits Section with logo colors */}
            <section className="py-16 px-4 bg-gradient-to-br from-gray-50 to-white">
                <div className="container mx-auto max-w-6xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Work With Us</h2>
                        <p className="text-gray-600 max-w-3xl mx-auto text-lg">
                            We offer competitive benefits, a supportive work environment, and opportunities for growth. Join us in making a difference.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
                    >
                        {[
                            { icon: TrendingUp, title: "Career Growth", desc: "Clear advancement paths and mentorship programs", color: "from-blue-500 to-blue-700" },
                            { icon: Users, title: "Great Team", desc: "Collaborative environment with talented professionals", color: "from-red-500 to-red-700" },
                            { icon: Coffee, title: "Work-Life Balance", desc: "Flexible schedules and remote work options", color: "from-yellow-500 to-yellow-600" },
                            { icon: Award, title: "Recognition", desc: "Your achievements get noticed and rewarded", color: "from-blue-600 to-blue-800" },
                            { icon: Shield, title: "Health & Wellness", desc: "Comprehensive health benefits and wellness programs", color: "from-red-600 to-red-800" },
                            { icon: Zap, title: "Innovation", desc: "Work on cutting-edge projects with latest tech", color: "from-yellow-600 to-yellow-700" },
                            { icon: Target, title: "Impact", desc: "Make a real difference in millions of lives", color: "from-blue-700 to-blue-900" },
                            { icon: Wifi, title: "Modern Office", desc: "State-of-the-art facilities and equipment", color: "from-red-700 to-red-900" }
                        ].map((benefit, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                className="group"
                            >
                                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-transparent h-full">
                                    <div className={`w-16 h-16 bg-gradient-to-br ${benefit.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                        <benefit.icon className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="font-bold text-xl text-gray-900 mb-3 text-center">{benefit.title}</h3>
                                    <p className="text-gray-600 text-center">{benefit.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            <div className="container mx-auto max-w-7xl px-4 py-12">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Enhanced LEFT SIDEBAR - FILTERS with logo colors */}
                    <aside className="hidden lg:block w-80 flex-shrink-0">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sticky top-24"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2">
                                    <Filter className="h-5 w-5" />
                                    Filters
                                </h3>
                                {(selectedFilters.locations.length > 0 || selectedFilters.experience.length > 0 || selectedFilters.type.length > 0 || selectedFilters.department.length > 0 || selectedFilters.workStyle.length > 0) && (
                                    <button
                                        onClick={clearFilters}
                                        className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4">
                                <FilterSection
                                    title="Department"
                                    options={FILTERS.department}
                                    selected={selectedFilters.department}
                                    onChange={(val) => toggleFilter('department', val)}
                                />
                                <FilterSection
                                    title="Location"
                                    options={FILTERS.locations}
                                    selected={selectedFilters.locations}
                                    onChange={(val) => toggleFilter('locations', val)}
                                />
                                <FilterSection
                                    title="Work Style"
                                    options={FILTERS.workStyle}
                                    selected={selectedFilters.workStyle}
                                    onChange={(val) => toggleFilter('workStyle', val)}
                                />
                                <FilterSection
                                    title="Experience"
                                    options={FILTERS.experience}
                                    selected={selectedFilters.experience}
                                    onChange={(val) => toggleFilter('experience', val)}
                                />
                                <FilterSection
                                    title="Job Type"
                                    options={FILTERS.type}
                                    selected={selectedFilters.type}
                                    onChange={(val) => toggleFilter('type', val)}
                                />
                                <FilterSection
                                    title="Salary Range"
                                    options={FILTERS.salary}
                                    selected={selectedFilters.salary}
                                    onChange={(val) => toggleFilter('salary', val)}
                                />
                            </div>
                        </motion.div>
                    </aside>

                    {/* Enhanced MOBILE FILTER TOGGLE with logo colors */}
                    <div className="lg:hidden mb-6">
                        <Button
                            onClick={() => setIsMobileFiltersOpen(true)}
                            variant="outline"
                            className="w-full flex items-center justify-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 transition-all h-14 text-base font-medium"
                        >
                            <Filter className="h-5 w-5" />
                            Filters
                            {Object.values(selectedFilters).filter(arr => arr.length > 0).length > 0 && (
                                <span className="ml-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-full">
                                    {Object.values(selectedFilters).filter(arr => arr.length > 0).length}
                                </span>
                            )}
                        </Button>
                    </div>

                    {/* Enhanced RIGHT CONTENT - JOB LIST */}
                    <div className="flex-1">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="flex items-center justify-between mb-8"
                        >
                            <h2 className="text-3xl font-bold text-gray-900">
                                {filteredJobs.length} {filteredJobs.length === 1 ? 'Job' : 'Jobs'} Available
                            </h2>
                            <div className="text-sm text-gray-500 flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors">
                                Sort by: <span className="font-medium text-gray-900">Most Relevant</span>
                                <ChevronRight className="h-4 w-4" />
                            </div>
                        </motion.div>

                        <div className="space-y-6">
                            {filteredJobs.length > 0 ? (
                                filteredJobs.map((job, index) => (
                                    <div key={job.id || index}>
                                        <JobCard
                                            job={job}
                                            onViewDetails={handleViewDetails}
                                            isHovered={hoveredJobId === job.id}
                                        />
                                    </div>
                                ))
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="text-center py-20 bg-white rounded-2xl border border-gray-100"
                                >
                                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
                                        <Search className="h-12 w-12 text-gray-400" />
                                    </div>
                                    <h3 className="text-2xl font-medium text-gray-900 mb-4">No jobs found</h3>
                                    <p className="text-gray-500 mb-8 max-w-md mx-auto text-lg">Try adjusting your search or filters to find what you're looking for.</p>
                                    <Button onClick={clearFilters} variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50 transition-all h-14 px-8 text-base font-medium">
                                        Clear Filters
                                    </Button>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced MOBILE FILTERS MODAL with logo colors */}
            <AnimatePresence>
                {isMobileFiltersOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-50 lg:hidden backdrop-blur-sm"
                            onClick={() => setIsMobileFiltersOpen(false)}
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-50 lg:hidden overflow-y-auto"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="font-bold text-xl text-gray-900">Filters</h3>
                                    <button onClick={() => setIsMobileFiltersOpen(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                                        <X className="h-6 w-6 text-gray-500" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <FilterSection
                                        title="Department"
                                        options={FILTERS.department}
                                        selected={selectedFilters.department}
                                        onChange={(val) => toggleFilter('department', val)}
                                    />
                                    <FilterSection
                                        title="Location"
                                        options={FILTERS.locations}
                                        selected={selectedFilters.locations}
                                        onChange={(val) => toggleFilter('locations', val)}
                                    />
                                    <FilterSection
                                        title="Work Style"
                                        options={FILTERS.workStyle}
                                        selected={selectedFilters.workStyle}
                                        onChange={(val) => toggleFilter('workStyle', val)}
                                    />
                                    <FilterSection
                                        title="Experience"
                                        options={FILTERS.experience}
                                        selected={selectedFilters.experience}
                                        onChange={(val) => toggleFilter('experience', val)}
                                    />
                                    <FilterSection
                                        title="Job Type"
                                        options={FILTERS.type}
                                        selected={selectedFilters.type}
                                        onChange={(val) => toggleFilter('type', val)}
                                    />
                                    <FilterSection
                                        title="Salary Range"
                                        options={FILTERS.salary}
                                        selected={selectedFilters.salary}
                                        onChange={(val) => toggleFilter('salary', val)}
                                    />
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
                                    <Button
                                        onClick={clearFilters}
                                        variant="outline"
                                        className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 transition-all h-12"
                                    >
                                        Clear All Filters
                                    </Button>
                                    <Button
                                        onClick={() => setIsMobileFiltersOpen(false)}
                                        className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white transition-all h-12"
                                    >
                                        Show {filteredJobs.length} Jobs
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <Footer />

            <JobDetailsModal
                job={selectedJob}
                isOpen={!!selectedJob}
                onClose={() => setSelectedJob(null)}
            />
        </main>
    )
}