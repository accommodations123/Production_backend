"use client"
import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useParams } from "react-router-dom"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { useGetEventByIdQuery, useJoinEventMutation, useLeaveEventMutation } from "@/store/api/hostApi"
import { toast } from "sonner"

// Hooks & Services
import { useAuth } from "./hooks/useAuth"

// Components
import { HeroSection } from "./components/HeroSection"
import { RegistrationBar } from "./components/RegistrationBar"
import { TabNavigation } from "./components/TabNavigation"
import { OverviewTab } from "./components/OverviewTab"
import { ScheduleTab } from "./components/ScheduleTab"
import { VenueTab } from "./components/VenueTab"
import { ReviewsTab } from "./components/ReviewsTab"
import { Sidebar } from "./components/Sidebar"
import { EventNotFound } from "./components/EventNotFound"

export default function EventDetailsPage() {
    const { id } = useParams()
    const { data: apiEvent, isLoading, error } = useGetEventByIdQuery(id)
    const [isSaved, setIsSaved] = useState(false)
    const [showShareMenu, setShowShareMenu] = useState(false)
    const [isRegistered, setIsRegistered] = useState(false)
    const [activeTab, setActiveTab] = useState("overview")
    const [visibleSections, setVisibleSections] = useState(new Set(['overview']))
    const [copiedLink, setCopiedLink] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [registrationError, setRegistrationError] = useState('')
    const [registrationSuccess, setRegistrationSuccess] = useState('')
    const [isCheckingRegistration, setIsCheckingRegistration] = useState(true)

    const [joinEvent, { isLoading: isJoining }] = useJoinEventMutation()
    const [leaveEvent, { isLoading: isLeaving }] = useLeaveEventMutation()

    const { user } = useAuth()

    const event = useMemo(() => {
        if (!apiEvent) return null
        return {
            id: apiEvent.id || apiEvent._id,
            title: apiEvent.title,
            description: apiEvent.description,
            image: apiEvent.banner_image || (apiEvent.gallery_images?.[0]) || null,
            date: apiEvent.start_date,
            time: apiEvent.start_time,
            end_date: apiEvent.end_date,
            end_time: apiEvent.end_time,
            location: `${apiEvent.city}, ${apiEvent.country}`,
            city: apiEvent.city,
            country: apiEvent.country,
            address: apiEvent.address,
            type: apiEvent.type,
            price: apiEvent.price,
            venueName: apiEvent.venue_name,
            venueDescription: apiEvent.venue_description,
            parkingInfo: apiEvent.parking_info,
            accessibilityInfo: apiEvent.accessibility_info,
            googleMapsUrl: apiEvent.google_maps_url,
            attendeesCount: apiEvent.attendees_count || 0,
            galleryImages: apiEvent.gallery_images || [],
            includedItems: apiEvent.included_items || [],
            schedule: apiEvent.schedule || [],
            facilities: apiEvent.facilities || [],
            accessibilityFeatures: apiEvent.accessibility_features || [],
            host: apiEvent.Host
                ? {
                    full_name: apiEvent.Host.full_name,
                    selfie_photo: apiEvent.Host.selfie_photo,
                    phone: apiEvent.Host.phone,
                    email: apiEvent.Host.email,
                    status: apiEvent.Host.status
                }
                : null,
            event_mode: apiEvent.event_mode || "offline",
            event_url: apiEvent.event_url || "",
            online_instructions: apiEvent.online_instructions || "",
            is_registered: apiEvent.is_registered || false // Assuming backend returns this with event details
        }
    }, [apiEvent])

    // Update isRegistered state based on event data
    useEffect(() => {
        if (event) {
            setIsRegistered(!!event.is_registered)
        }
    }, [event])

    // Removed manual registration check effect since we rely on apiEvent data now

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => entries.forEach(entry => entry.isIntersecting && setVisibleSections(prev => new Set([...prev, entry.target.id]))),
            { threshold: 0.1 }
        )
        const sections = document.querySelectorAll('.animate-section')
        sections.forEach(section => observer.observe(section))
        return () => sections.forEach(section => observer.unobserve(section))
    }, [])

    useEffect(() => {
        setVisibleSections(prev => new Set([...prev, activeTab]))
        if (activeTab === 'overview') {
            setVisibleSections(prev => new Set([...prev, 'included', 'gallery']))
        }
    }, [activeTab])

    const handleCopyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(window.location.href)
            setCopiedLink(true)
            toast.success("Link copied to clipboard!")
            setTimeout(() => setCopiedLink(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
            toast.error("Failed to copy link")
        }
    }, [])

    const handleSaveToggle = useCallback(() => setIsSaved(prev => !prev), [])
    const handleShareToggle = useCallback(() => setShowShareMenu(prev => !prev), [])

    const handleRegister = useCallback(async () => {
        if (!user) {
            toast.error('You must be logged in to register for this event.')
            return
        }

        try {
            setRegistrationError('')
            setRegistrationSuccess('')

            await joinEvent(event.id).unwrap()

            setIsRegistered(true)
            setRegistrationSuccess('Successfully registered for event!')
            toast.success('Successfully registered for event!')
            setTimeout(() => setRegistrationSuccess(''), 5000)
        } catch (error) {
            console.error('Error joining event:', error)
            const msg = error?.data?.message || error.message || 'Failed to register for event.'

            if (msg.includes('already joined')) {
                setIsRegistered(true)
                setRegistrationSuccess('You are already registered for this event.')
                toast.info('You are already registered for this event.')
            } else {
                setRegistrationError(msg)
                toast.error(msg)
            }
            setTimeout(() => {
                setRegistrationError('')
                setRegistrationSuccess('')
            }, 5000)
        }
    }, [event?.id, user, joinEvent])

    const handleLeave = useCallback(async () => {
        if (!user) {
            toast.error('You must be logged in to leave this event.')
            return
        }

        try {
            setRegistrationError('')
            setRegistrationSuccess('')

            await leaveEvent(event.id).unwrap()

            setIsRegistered(false)
            setRegistrationSuccess('Successfully left the event.')
            toast.success('Successfully left the event.')
            setTimeout(() => setRegistrationSuccess(''), 5000)
        } catch (error) {
            console.error('Error leaving event:', error)
            const msg = error?.data?.message || error.message || 'Failed to leave event.'
            setRegistrationError(msg)
            toast.error(msg)
            setTimeout(() => setRegistrationError(''), 5000)
        }
    }, [event?.id, user, leaveEvent])

    const handleTabClick = useCallback((tab) => {
        setActiveTab(tab)
        setVisibleSections(prev => new Set([...prev, tab]))
    }, [])

    if (isLoading) {
        return (
            <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
                <Navbar />
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600 font-medium">Loading event details...</p>
                </div>
            </main>
        )
    }

    if (error || !event) return <EventNotFound />

    return (
        <main className="min-h-screen bg-white">
            <Navbar />
            <HeroSection
                event={event}
                isSaved={isSaved}
                onSave={handleSaveToggle}
                shareOpen={showShareMenu}
                onShare={handleShareToggle}
                copied={copiedLink}
                onCopy={handleCopyLink}
            />
            <RegistrationBar
                isRegistered={isRegistered}
                handleRegister={handleRegister}
                handleLeave={handleLeave}
                event={event}
                isLoading={isProcessing || isJoining || isLeaving}
                errorMessage={registrationError}
                successMessage={registrationSuccess}
            />
            <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    <div className="lg:col-span-2 space-y-6 md:space-y-8">
                        <TabNavigation activeTab={activeTab} handleTabClick={handleTabClick} />
                        <div className="min-h-[500px]">
                            {activeTab === 'overview' && <OverviewTab event={event} visibleSections={visibleSections} />}
                            {activeTab === 'schedule' && <ScheduleTab event={event} visibleSections={visibleSections} />}
                            {activeTab === 'venue' && <VenueTab event={event} visibleSections={visibleSections} />}
                            {activeTab === 'reviews' && <ReviewsTab event={event} visibleSections={visibleSections} />}
                        </div>
                    </div>
                    <Sidebar event={event} />
                </div>
            </div>
            <Footer />
        </main>
    )
}