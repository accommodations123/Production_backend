"use client"

import React, { useState } from "react"
import { Home, AlertCircle, ShieldCheck, Calendar, Sparkles, Plus, TrendingUp, Eye, Star, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PropertyCard } from "@/components/account/PropertyCard"
import { EventCard } from "@/components/account/EventCard"
import { useGetMyListingsQuery, useDeletePropertyMutation, useGetMyEventsQuery, useDeleteEventMutation } from "@/store/api/hostApi"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"

export const MyListings = () => {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState("spaces")

    const {
        data: propertyListings = [],
        isLoading: isPropertiesLoading,
        isError: isPropertiesError,
        error: propertiesError,
        refetch: refetchProperties,
    } = useGetMyListingsQuery(undefined, { refetchOnMountOrArgChange: true })

    const {
        data: eventListings = [],
        isLoading: isEventsLoading,
        isError: isEventsError,
        error: eventsError,
        refetch: refetchEvents,
    } = useGetMyEventsQuery(undefined, { refetchOnMountOrArgChange: true })

    const [deleteProperty] = useDeletePropertyMutation()
    const [deleteEvent] = useDeleteEventMutation()
    const [deletingIds, setDeletingIds] = useState(new Set())

    const visibleProperties = (propertyListings || []).filter(p => {
        const id = p._id || p.id
        if (deletingIds.has(id)) return false
        const isDeleted = p.is_deleted === true || (p.status || "").toLowerCase() === "deleted"
        // Check for expiration
        const isExpired = p.listing_expires_at && new Date(p.listing_expires_at) < new Date()

        // Hide if deleted OR expired
        return !isDeleted && !isExpired
    })

    const visibleEvents = (eventListings || []).filter(e => {
        const id = e._id || e.id
        if (deletingIds.has(id)) return false

        // Filter out expired events
        try {
            // Use end_date if available, otherwise start_date
            const dateStr = e.end_date || e.start_date
            if (!dateStr) return true // Keep if no date (draft?)

            const date = new Date(dateStr)

            // Parse time
            const timeStr = e.end_time || e.start_time || "23:59"
            const [hours, minutes] = timeStr.split(':').map(Number)

            if (!isNaN(hours) && !isNaN(minutes)) {
                date.setHours(hours, minutes, 0)
            } else {
                // Default to end of day if time is invalid/missing
                date.setHours(23, 59, 59)
            }

            // Exclude if now is after the event end time
            if (new Date() > date) return false

        } catch (err) {
            console.warn("Date parsing error for event:", e)
            return true // Keep on error to be safe
        }

        return true
    })

    const handlePropertyDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this listing?")) return
        setDeletingIds(prev => new Set([...prev, id]))
        try {
            await deleteProperty({ id, reason: "User deleted from dashboard" }).unwrap()
            toast.success("Listing deleted successfully")
        } catch (err) {
            setDeletingIds(prev => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
            toast.error(err?.data?.message || "Failed to delete listing")
        }
    }

    const handleEventDelete = async (id) => {
        setDeletingIds(prev => new Set([...prev, id]))
        try {
            await deleteEvent(id).unwrap()
            toast.success("Event deleted successfully")
        } catch (err) {
            setDeletingIds(prev => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
            toast.error(err?.data?.message || "Failed to delete event")
        }
    }

    const isLoading = activeTab === "spaces" ? isPropertiesLoading : isEventsLoading
    const isError = activeTab === "spaces" ? isPropertiesError : isEventsError
    const error = activeTab === "spaces" ? propertiesError : eventsError
    const currentListings = activeTab === "spaces" ? visibleProperties : visibleEvents

    return (
        <div className="relative min-h-screen">
            {/* Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/5 to-accent/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-neutral/10 to-accent/5 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 p-4 md:p-8 space-y-8">
                {/* Header Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-navy-dark p-8 text-white">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.05) 0%, transparent 40%)' }}></div>

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-xs font-medium text-white/80 mb-4">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                NextKin Verified Host
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2">My Listings Portfolio</h1>
                            <p className="text-white/60 max-w-md">Manage your spaces and experiences. Track performance and grow your hosting business.</p>
                        </div>

                        <Button
                            onClick={() => navigate(activeTab === "spaces" ? "/host/create" : "/events/host")}
                            className="bg-white text-primary hover:bg-neutral/20 rounded-xl h-12 px-6 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create New {activeTab === "spaces" ? "Space" : "Experience"}
                        </Button>
                    </div>

                    {/* Stats Row */}
                    <div className="relative z-10 mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-neutral/20 rounded-lg">
                                    <Home className="w-5 h-5 text-neutral" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{visibleProperties.length}</p>
                                    <p className="text-xs text-white/60">Active Spaces</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-accent/20 rounded-lg">
                                    <Sparkles className="w-5 h-5 text-accent" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{visibleEvents.length}</p>
                                    <p className="text-xs text-white/60">Experiences</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/20 rounded-lg">
                                    <TrendingUp className="w-5 h-5 text-green-300" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{visibleProperties.length + visibleEvents.length}</p>
                                    <p className="text-xs text-white/60">Total Listings</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Tabs Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="bg-white p-1.5 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-1 w-fit">
                        <button
                            onClick={() => setActiveTab("spaces")}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                                activeTab === "spaces"
                                    ? "bg-accent text-white shadow-md"
                                    : "text-primary/50 hover:text-primary hover:bg-neutral/10"
                            )}
                        >
                            <Home className="w-4 h-4" />
                            Spaces
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-bold",
                                activeTab === "spaces" ? "bg-white/20 text-white" : "bg-neutral/20 text-primary/60"
                            )}>
                                {visibleProperties.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab("experiences")}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                                activeTab === "experiences"
                                    ? "bg-accent text-white shadow-md"
                                    : "text-primary/50 hover:text-primary hover:bg-neutral/10"
                            )}
                        >
                            <Sparkles className="w-4 h-4" />
                            Experiences
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-bold",
                                activeTab === "experiences" ? "bg-white/20 text-white" : "bg-neutral/20 text-primary/60"
                            )}>
                                {visibleEvents.length}
                            </span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-primary/50">
                        <Eye className="w-4 h-4" />
                        Showing {currentListings.length} {activeTab}
                    </div>
                </div>

                {/* Content Section */}
                {isError ? (
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-50 to-red-50 border border-rose-100 p-12 text-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-400/5 to-red-400/10"></div>
                        <div className="relative z-10">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-rose-100 to-rose-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                                <AlertCircle className="w-10 h-10 text-rose-500" />
                            </div>
                            <h4 className="text-2xl font-bold mb-3 text-rose-700">Failed to load {activeTab}</h4>
                            <p className="text-rose-600/70 max-w-md mx-auto mb-6">{error?.message || "An unexpected error occurred. Please try again."}</p>
                            <Button
                                onClick={() => window.location.reload()}
                                className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl px-6 py-3"
                            >
                                Try Again
                            </Button>
                        </div>
                    </div>
                ) : isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-neutral/30 rounded-full"></div>
                            <div className="absolute inset-0 w-20 h-20 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="mt-6 text-primary/70 font-medium">Fetching your {activeTab}...</p>
                        <p className="text-sm text-primary/40">This won't take long</p>
                    </div>
                ) : currentListings.length === 0 ? (
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral/10 via-white to-neutral/20 border border-neutral/30 p-12 text-center shadow-xl">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"></div>
                        <div className="relative z-10">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-neutral/30 to-neutral/50 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
                                {activeTab === "spaces" ? (
                                    <Home className="w-12 h-12 text-primary" />
                                ) : (
                                    <Calendar className="w-12 h-12 text-accent" />
                                )}
                            </div>
                            <h4 className="text-2xl font-bold mb-3 text-primary">No {activeTab} yet</h4>
                            <p className="text-primary/50 max-w-md mx-auto mb-8">
                                {activeTab === "spaces"
                                    ? "Start your hosting journey. Share your space with the NextKin community and earn."
                                    : "Create memorable experiences for travelers and locals. Share your passion with the world."}
                            </p>
                            <Button
                                onClick={() => navigate(activeTab === "spaces" ? "/host/create" : "/events/host")}
                                className="bg-accent hover:bg-accent/90 text-white rounded-xl px-8 py-4 h-auto font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                Create Your First {activeTab === "spaces" ? "Space" : "Experience"}
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {activeTab === "spaces" ? (
                            currentListings.map(p => (
                                <div key={p._id || p.id} className="transform hover:-translate-y-1 transition-all duration-200">
                                    <PropertyCard property={p} onDelete={handlePropertyDelete} />
                                </div>
                            ))
                        ) : (
                            currentListings.map(e => (
                                <div key={e._id || e.id} className="transform hover:-translate-y-1 transition-all duration-200">
                                    <EventCard event={e} onDelete={handleEventDelete} />
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div >
    )
}
