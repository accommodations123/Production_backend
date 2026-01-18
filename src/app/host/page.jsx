"use client"
import React, { useState, useEffect, useCallback, useMemo, memo } from "react"
import { useParams, Link } from "react-router-dom"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import {
    Calendar, MapPin, Clock, Users, Shield, ArrowLeft, Share2, Heart, MessageCircle,
    Globe, Star, CheckCircle, TrendingUp, Award, Camera, Ticket, ExternalLink,
    UserPlus, Facebook, Twitter, Linkedin, Copy, Check, Navigation, Car,
    Wifi, Volume2, Video, Monitor, Play, Link2,
} from "lucide-react"
import { useGetEventByIdQuery } from "@/store/api/hostApi"

const TabButton = memo(({ tab, activeTab, onClick }) => (
    <button
        onClick={() => onClick(tab)}
        className={`flex-1 min-w-[100px] px-4 py-3 rounded-2xl font-medium capitalize transition-all duration-300 relative ${activeTab === tab
            ? 'text-white bg-accent shadow-lg transform scale-105'
            : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
    >
        {tab}
        {activeTab === tab && (
            <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-accent rounded-full"></span>
        )}
    </button>
))

const ShareMenu = memo(({ open, copied, onCopy }) =>
    !open ? null : (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl z-30 border border-gray-100">
            <div className="p-2">
                <a href="#" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-accent/10 transition-colors rounded-xl mx-2">
                    <Facebook className="h-4 w-4 text-blue-600" /> Facebook
                </a>
                <a href="#" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-accent/10 transition-colors rounded-xl mx-2">
                    <Twitter className="h-4 w-4 text-blue-400" /> Twitter
                </a>
                <a href="#" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-accent/10 transition-colors rounded-xl mx-2">
                    <Linkedin className="h-4 w-4 text-blue-700" /> LinkedIn
                </a>
                <button
                    onClick={onCopy}
                    className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-accent/10 transition-colors w-full text-left rounded-xl mx-2"
                >
                    {copied ? (
                        <>
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-green-600">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="h-4 w-4" /> Copy Link
                        </>
                    )}
                </button>
            </div>
        </div>
    )
)

const EventNotFound = memo(() => (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 transform transition-all duration-500 hover:scale-105">
                <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse shadow-lg">
                    <Calendar className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4 text-center">Event Not Found</h1>
                <p className="text-gray-600 mb-8 text-center">The event you are looking for does not exist or has been removed.</p>
                <Link to="/events" className="block">
                    <Button className="w-full bg-accent text-white hover:bg-accent/90 transition-all duration-300 shadow-xl transform hover:scale-105 rounded-2xl">
                        Back to Events
                    </Button>
                </Link>
            </div>
        </div>
        <Footer />
    </main>
))

const HeroSection = memo(({ event, isSaved, onSave, shareOpen, onShare, copied, onCopy }) => (
    <div className="relative h-[70vh] overflow-hidden">
        <div className="absolute inset-0">
            <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
        <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10">
            <Link
                to="/events"
                className="inline-flex items-center gap-2 text-white bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full transition-all duration-300 hover:bg-black hover:scale-105 shadow-lg"
            >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Events</span>
                <span className="sm:hidden">Back</span>
            </Link>
            <div className="flex gap-2">
                <div className="relative">
                    <Button
                        variant="outline"
                        className="bg-white/90 backdrop-blur-sm text-gray-800 hover:bg-white border-white/20 rounded-full transition-all duration-300 hover:scale-105 shadow-lg"
                        onClick={onShare}
                    >
                        <Share2 className="h-4 w-4" />
                    </Button>
                    <ShareMenu open={shareOpen} copied={copied} onCopy={onCopy} />
                </div>
                <Button
                    variant="outline"
                    className={`${isSaved ? 'bg-accent text-white' : 'bg-white/90 backdrop-blur-sm text-gray-800 hover:bg-white'} border-white/20 rounded-full transition-all duration-300 hover:scale-105 shadow-lg`}
                    onClick={onSave}
                >
                    <Heart className={`h-4 w-4 transition-all duration-300 ${isSaved ? 'fill-current scale-110' : ''}`} />
                </Button>
            </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-12">
            <div className="container mx-auto max-w-7xl">
                <div className="space-y-4 md:space-y-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-block px-4 py-2 bg-accent text-white text-sm font-bold rounded-full uppercase tracking-wider animate-pulse shadow-lg">
                            {event.type}
                        </span>
                        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full">
                            <Globe className="h-4 w-4 text-accent" />
                            <span className="text-sm text-accent font-medium">{event.country}</span>
                        </div>
                        <div className={`flex items-center gap-2 backdrop-blur-sm px-3 py-2 rounded-full ${event.event_mode === 'online' ? 'bg-blue-500/90' :
                            event.event_mode === 'hybrid' ? 'bg-purple-500/90' :
                                'bg-green-500/90'
                            }`}>
                            {event.event_mode === 'online' ? <Video className="h-4 w-4 text-white" /> :
                                event.event_mode === 'hybrid' ? <Monitor className="h-4 w-4 text-white" /> :
                                    <MapPin className="h-4 w-4 text-white" />}
                            <span className="text-sm text-white font-medium capitalize">
                                {event.event_mode === 'online' ? 'Online Event' :
                                    event.event_mode === 'hybrid' ? 'Hybrid Event' :
                                        'In-Person Event'}
                            </span>
                        </div>
                    </div>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight text-white drop-shadow-2xl">
                        {event.title}
                    </h1>
                    <div className="flex flex-wrap gap-4 md:gap-8 text-white drop-shadow-lg">
                        <div className="flex items-center gap-2 group bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
                            <Calendar className="h-5 w-5 text-accent" />
                            <span className="text-sm md:text-base font-medium">{event.date}</span>
                        </div>
                        <div className="flex items-center gap-2 group bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
                            <Clock className="h-5 w-5 text-accent" />
                            <span className="text-sm md:text-base font-medium">{event.time}</span>
                        </div>
                        {event.event_mode !== 'online' && (
                            <div className="flex items-center gap-2 group bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
                                <MapPin className="h-5 w-5 text-accent" />
                                <span className="text-sm md:text-base font-medium">{event.city}, {event.country}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
))

const RegistrationBar = memo(({ isRegistered, handleRegister, event }) => (
    <div className="sticky top-0 z-40 bg-accent/90 shadow-2xl backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-white">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-5 w-5 text-yellow-400" />
                        <span className="font-bold">Limited Time Offer</span>
                    </div>
                    <p className="text-sm">
                        Early bird price: ${event?.price || 'N/A'} (Regular price: ${event?.price ? Math.round(event.price * 1.7) : 'N/A'})
                    </p>
                </div>
                <Button
                    onClick={handleRegister}
                    className={`font-bold py-3 px-6 sm:px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-xl ${isRegistered
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-accent text-white hover:bg-accent/90'
                        }`}
                >
                    {isRegistered ? (
                        <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Registered
                        </>
                    ) : (
                        <>
                            <Ticket className="h-4 w-4 mr-2" />
                            Register Now
                        </>
                    )}
                </Button>
            </div>
        </div>
    </div>
))

const TabNavigation = memo(({ activeTab, handleTabClick }) => (
    <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl p-2 border border-white/20">
        <div className="flex flex-wrap">
            {['overview', 'schedule', 'venue', 'reviews'].map((tab) => (
                <TabButton key={tab} tab={tab} activeTab={activeTab} onClick={handleTabClick} />
            ))}
        </div>
    </div>
))

const EventModeSection = memo(({ event }) => {
    const isOnline = event.event_mode === 'online';
    const isHybrid = event.event_mode === 'hybrid';
    const isInPerson = event.event_mode === 'offline';
    const bgColor = isOnline ? 'from-blue-500 to-blue-600' :
        isHybrid ? 'from-purple-500 to-purple-600' :
            'from-green-500 to-green-600';
    const icon = isOnline ? <Video className="h-6 w-6 text-white" /> :
        isHybrid ? <Monitor className="h-6 w-6 text-white" /> :
            <MapPin className="h-6 w-6 text-white" />;
    const title = isOnline ? 'Online Event' :
        isHybrid ? 'Hybrid Event' :
            'In-Person Event';
    const description = isOnline
        ? 'This event will be held entirely online. Join from anywhere in the world!'
        : isHybrid
            ? 'This event has both in-person and online attendance options. Choose what works best for you!'
            : 'This event will be held in person at the venue location.';

    return (
        <section className="bg-gradient-to-b from-white to-gray-50 rounded-3xl shadow-xl p-6 md:p-8">
            <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 bg-gradient-to-br ${bgColor} rounded-2xl flex items-center justify-center shadow-lg`}>
                    {icon}
                </div>
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h2>
                    <p className="text-gray-500 text-sm mt-1">Event Format Details</p>
                </div>
            </div>
            <div className={`bg-gradient-to-b ${isOnline ? 'from-blue-50 to-blue-100' :
                isHybrid ? 'from-purple-50 to-purple-100' :
                    'from-green-50 to-green-100'
                } rounded-2xl p-6 border ${isOnline ? 'border-blue-200' :
                    isHybrid ? 'border-purple-200' :
                        'border-green-200'
                }`}>
                <p className="text-gray-700 mb-6">{description}</p>
                {(isOnline || isHybrid) && event.event_url && (
                    <div className="mb-6">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Link2 className="h-5 w-5 text-accent" />
                            Event Link
                        </h3>
                        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                            <a
                                href={event.event_url.trim()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 truncate flex-1 mr-4"
                            >
                                {event.event_url.trim()}
                            </a>
                            <Button
                                onClick={() => window.open(event.event_url.trim(), '_blank')}
                                className="bg-accent text-white hover:bg-accent/90 transition-all duration-300 transform hover:scale-105 shadow-lg rounded-xl px-4 py-2"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
                {(isOnline || isHybrid) && event.online_instructions && (
                    <div className="mb-6">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Volume2 className="h-5 w-5 text-accent" />
                            Online Instructions
                        </h3>
                        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                            <p className="text-gray-700 whitespace-pre-line">{event.online_instructions}</p>
                        </div>
                    </div>
                )}
                {(isHybrid || isInPerson) && (
                    <div className={`${isHybrid ? 'pt-6 border-t border-gray-200' : ''}`}>
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-accent" />
                            {isHybrid ? 'In-Person Location' : 'Event Location'}
                        </h3>
                        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                            <p className="text-gray-700">{event.venueName || event.location}</p>
                            <p className="text-gray-600 text-sm mt-1">{event.address}</p>
                            <Button
                                onClick={() => window.open(event.googleMapsUrl, '_blank')}
                                variant="link"
                                className="text-accent hover:text-accent/90 transition-colors font-medium mt-2"
                            >
                                Get Directions →
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
});

const OverviewTab = memo(({ event, visibleSections }) => {
    const images = event.galleryImages || []
    return (
        <div className="space-y-6 md:space-y-8">
            <section
                id="overview"
                className={`bg-gradient-to-b from-white to-gray-50 rounded-3xl shadow-xl p-6 md:p-8 animate-section transition-all duration-700 ${visibleSections.has('overview') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}
            >
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center shadow-lg">
                        <Calendar className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">About this Event</h2>
                        <p className="text-gray-500 text-sm mt-1">Discover what makes this event special</p>
                    </div>
                </div>
                <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-100">
                    <p className="text-gray-700 text-lg leading-relaxed">{event.description}</p>
                </div>
            </section>
            <EventModeSection event={event} />
            <section
                id="included"
                className={`bg-accent/10 rounded-3xl p-6 md:p-8 border border-accent/20 animate-section transition-all duration-700 ${visibleSections.has('included') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}
            >
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">What's Included</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {event.includedItems?.length > 0 ? (
                        event.includedItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                                <CheckCircle className="h-5 w-5 text-accent" />
                                <p className="text-gray-800 font-medium">{item}</p>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-8">
                            <p className="text-gray-500">No included items information available.</p>
                        </div>
                    )}
                </div>
            </section>
            <section
                id="gallery"
                className={`animate-section transition-all duration-700 ${visibleSections.has('gallery') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}
            >
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center shadow-lg">
                        <Camera className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Event Gallery</h2>
                        <p className="text-gray-500 text-sm mt-1">Get a glimpse of past events</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.length === 0 ? (
                        <p className="text-gray-500 col-span-full text-center">No gallery images available.</p>
                    ) : (
                        images.map((img, idx) => (
                            <div key={idx} className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition">
                                <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover aspect-square" />
                                <div className="absolute inset-0 bg-accent/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                    <ExternalLink className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    )
})

const ScheduleTab = memo(({ event, visibleSections }) => {
    const scheduleItems = useMemo(() => {
        if (!event?.schedule || !Array.isArray(event.schedule)) return []
        return event.schedule
    }, [event])
    if (scheduleItems.length === 0) {
        return <div id="schedule" className="text-center py-12 text-gray-500">No schedule published yet.</div>
    }
    return (
        <div id="schedule" className="space-y-6 md:space-y-8">
            <section
                className={`bg-gradient-to-b from-white to-gray-50 rounded-3xl shadow-xl p-6 md:p-8 animate-section transition-all duration-700 ${visibleSections.has('schedule') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center shadow-lg">
                        <Clock className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Event Schedule</h2>
                        <p className="text-gray-500 text-sm mt-1">Plan your day with our detailed timeline</p>
                    </div>
                </div>
                <div className="space-y-4">
                    {scheduleItems.map((item, idx) => (
                        <div
                            key={idx}
                            className={`group relative bg-white/70 backdrop-blur-sm rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-gray-100 ${idx !== 0 ? 'mt-6' : ''}`}
                        >
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="text-center">
                                    <div
                                        className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform"
                                        style={{ backgroundColor: item.color || 'var(--accent)' }}
                                    >
                                        <span className="text-xs font-bold">{item.time}</span>
                                        <span className="text-2xl mt-1">
                                            {item.icon === 'coffee' ? '☕' :
                                                item.icon === 'mic' ? '🎤' :
                                                    item.icon === 'rocket' ? '🚀' : '📚'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{item.title}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{item.duration}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
})

const VenueTab = memo(({ event, visibleSections }) => {
    if (event.event_mode === 'online') {
        return (
            <div id="venue" className="space-y-6 md:space-y-8">
                <section className={`bg-gradient-to-b from-white to-gray-50 rounded-3xl shadow-xl overflow-hidden animate-section transition-all duration-700 ${visibleSections.has('venue') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                    <div className="relative h-64 md:h-80">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-blue-300 flex items-center justify-center">
                            <Video className="h-20 w-20 text-blue-600" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-900/80 to-transparent h-32"></div>
                        <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">Online Event Platform</h3>
                        </div>
                    </div>
                    <div className="p-6 md:p-8">
                        <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                            This event will be hosted online. You can join from anywhere in the world using the link provided after registration.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="group bg-gradient-to-b from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Video className="h-6 w-6 text-white" />
                                </div>
                                <p className="font-semibold text-gray-900">Platform</p>
                                <p className="text-gray-600 text-sm">{event.event_url ? new URL(event.event_url).hostname : 'Online Platform'}</p>
                            </div>
                            <div className="group bg-gradient-to-b from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
                                <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Wifi className="h-6 w-6 text-white" />
                                </div>
                                <p className="font-semibold text-gray-900">Requirements</p>
                                <p className="text-gray-600 text-sm">Stable internet connection</p>
                            </div>
                        </div>
                        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-3">How to Join</h3>
                            <div className="text-gray-700 whitespace-pre-line">
                                {event.online_instructions || 'Register for the event and you will receive the event link via email.'}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }
    if (event.event_mode === 'hybrid') {
        return (
            <div id="venue" className="space-y-6 md:space-y-8">
                <section className={`bg-gradient-to-b from-white to-gray-50 rounded-3xl shadow-xl overflow-hidden animate-section transition-all duration-700 ${visibleSections.has('venue') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                    <div className="relative h-64 md:h-80">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-200 to-purple-300 flex items-center justify-center">
                            <Monitor className="h-20 w-20 text-purple-600" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-900/80 to-transparent h-32"></div>
                        <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">Hybrid Event</h3>
                        </div>
                    </div>
                    <div className="p-6 md:p-8">
                        <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                            This event offers both in-person and online attendance options. Choose what works best for you!
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-accent" />
                                    In-Person Location
                                </h3>
                                <p className="text-gray-700 mb-4">{event.venueName || event.location}</p>
                                <p className="text-gray-600 text-sm mb-4">{event.address}</p>
                                <Button
                                    onClick={() => window.open(event.googleMapsUrl, '_blank')}
                                    className="w-full bg-accent text-white hover:bg-accent/90 transition-all duration-300 transform hover:scale-105 shadow-xl rounded-2xl"
                                >
                                    Get Directions
                                </Button>
                            </div>
                            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Video className="h-5 w-5 text-blue-500" />
                                    Online Access
                                </h3>
                                <p className="text-gray-700 mb-4">Join from anywhere in the world</p>
                                {event.event_url && (
                                    <p className="text-gray-600 text-sm mb-4 truncate">{event.event_url}</p>
                                )}
                                <Button
                                    onClick={() => event.event_url && window.open(event.event_url.trim(), '_blank')}
                                    className="w-full bg-blue-500 text-white hover:bg-blue-600 transition-all duration-300 transform hover:scale-105 shadow-xl rounded-2xl"
                                >
                                    Join Online
                                </Button>
                            </div>
                        </div>
                        {event.online_instructions && (
                            <div className="mt-6 bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-3">Online Instructions</h3>
                                <div className="text-gray-700 whitespace-pre-line">
                                    {event.online_instructions}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        );
    }
    return (
        <div id="venue" className="space-y-6 md:space-y-8">
            <section className={`bg-gradient-to-b from-white to-gray-50 rounded-3xl shadow-xl overflow-hidden animate-section transition-all duration-700 ${visibleSections.has('venue') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="relative h-64 md:h-80">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <MapPin className="h-20 w-20 text-gray-400" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-accent/80 h-32"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">{event.venueName || event.location}</h3>
                    </div>
                </div>
                <div className="p-6 md:p-8">
                    <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                        {event.venueDescription || "Located in heart of city, this state-of-the-art venue offers modern facilities and easy accessibility via public transportation."}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="group bg-accent/10 rounded-2xl p-4 border border-accent/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
                            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <MapPin className="h-6 w-6 text-white" />
                            </div>
                            <p className="font-semibold text-gray-900">Address</p>
                            <p className="text-gray-600 text-sm">{event.address || "123 Event Street"}</p>
                        </div>
                        <div className="group bg-gradient-to-b from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Car className="h-6 w-6 text-white" />
                            </div>
                            <p className="font-semibold text-gray-900">Parking</p>
                            <p className="text-gray-600 text-sm">{event.parkingInfo || "Free on-site"}</p>
                        </div>
                        <div className="group bg-accent/10 rounded-2xl p-4 border border-accent/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
                            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Navigation className="h-6 w-6 text-white" />
                            </div>
                            <p className="font-semibold text-gray-900">Accessibility</p>
                            <p className="text-gray-600 text-sm">{event.accessibilityInfo || "Wheelchair accessible"}</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => window.open(event.googleMapsUrl, '_blank')}
                        className="w-full sm:w-auto bg-accent text-white hover:bg-accent/90 transition-all duration-300 transform hover:scale-105 shadow-xl rounded-2xl"
                    >
                        Get Directions
                    </Button>
                </div>
            </section>
            <section
                className={`bg-gradient-to-b from-white to-gray-50 rounded-3xl shadow-xl p-6 md:p-8 animate-section transition-all duration-700 delay-100 ${visibleSections.has('venue-features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}
                id="venue-features"
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center shadow-lg">
                        <Shield className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Venue Features</h2>
                        <p className="text-gray-500 text-sm mt-1">Everything you need for a successful event</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-300">
                        <h3 className="font-bold text-gray-900 mb-3">Facilities</h3>
                        <ul className="space-y-2">
                            {["High-speed WiFi", "Audio-visual equipment", "Catering services", "Climate control"].map((item, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                    <Wifi className="h-4 w-4 text-accent" />
                                    <span className="text-gray-700">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-300">
                        <h3 className="font-bold text-gray-900 mb-3">Accessibility</h3>
                        <ul className="space-y-2">
                            {["Wheelchair ramps", "Accessible restrooms", "Elevator access", "Reserved parking"].map((item, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span className="text-gray-700">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    )
})

const ReviewsTab = memo(({ event, visibleSections }) => {
    const reviews = useMemo(() => [
        { name: 'Alex Johnson', rating: 5, comment: 'Amazing event with great speakers and networking opportunities!', avatar: '👨‍💼', role: 'CEO' },
        { name: 'Maria Garcia', rating: 5, comment: 'Well organized and very informative. Looking forward to next one!', avatar: '👩‍💼', role: 'Designer' },
        { name: 'James Smith', rating: 4, comment: 'Great content and venue. Would have liked more interactive sessions.', avatar: '👨‍🎓', role: 'Student' },
        { name: 'Sarah Williams', rating: 5, comment: 'Exceeded my expectations! The workshops were particularly valuable.', avatar: '👩‍🔬', role: 'Researcher' },
        { name: 'Michael Brown', rating: 5, comment: 'Fantastic networking opportunities and insightful presentations.', avatar: '👨‍💻', role: 'Developer' }
    ], [])
    return (
        <div id="reviews" className="space-y-6 md:space-y-8">
            <section
                className={`bg-gradient-to-b from-white to-gray-50 rounded-3xl shadow-xl p-6 md:p-8 animate-section transition-all duration-700 ${visibleSections.has('reviews') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center shadow-lg">
                        <Star className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Reviews</h2>
                        <p className="text-gray-500 text-sm mt-1">See what our attendees are saying</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gradient-to-b from-yellow-50 to-yellow-100 rounded-2xl p-6 border border-yellow-200 text-center">
                        <div className="flex justify-center gap-1 mb-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className="h-8 w-8 fill-yellow-400 text-yellow-400" />
                            ))}
                        </div>
                        <p className="text-4xl font-bold text-gray-900">4.8</p>
                        <p className="text-gray-600">Based on 324 reviews</p>
                    </div>
                    <div className="bg-accent/10 rounded-2xl p-6 border border-accent/20 text-center">
                        <p className="text-4xl font-bold text-gray-900">{event.attendeesCount || 0}</p>
                        <p className="text-gray-600">Total Attendees</p>
                    </div>
                </div>
                <div className="space-y-6">
                    {reviews.map((review, idx) => (
                        <div key={idx} className="group bg-white/70 backdrop-blur-sm rounded-2xl p-6 hover:bg-white transition-all duration-300 hover:shadow-xl border border-gray-100">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-accent rounded-full flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                                        {review.avatar}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{review.name}</p>
                                        <p className="text-sm text-gray-500">{review.role}</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500">{idx + 1} week{idx > 0 ? 's' : ''} ago</p>
                            </div>
                            <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                        </div>
                    ))}
                </div>
            </section>
            <section
                className={`bg-gradient-to-b from-white to-gray-50 rounded-3xl shadow-xl p-6 md:p-8 animate-section transition-all duration-700 delay-100 ${visibleSections.has('review-form') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}
                id="review-form"
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center shadow-lg">
                        <MessageCircle className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Leave a Review</h2>
                        <p className="text-gray-500 text-sm mt-1">Share your experience with others</p>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-100">
                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2">Your Rating</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} className="p-1">
                                    <Star className="h-8 w-8 text-gray-300 hover:text-yellow-400 hover:fill-yellow-400 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2">Your Review</label>
                        <textarea
                            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                            rows="4"
                            placeholder="Share your experience with this event..."
                        ></textarea>
                    </div>
                    <Button className="bg-accent text-white hover:bg-accent/90 transition-all duration-300 transform hover:scale-105 shadow-xl rounded-2xl">
                        Submit Review
                    </Button>
                </div>
            </section>
        </div>
    )
})

const Sidebar = memo(({ event }) => {
    const [imageError, setImageError] = useState(false)
    const handleImageError = () => setImageError(true)
    const hostPhoto = useMemo(() => {
        if (!event?.host) return null
        return event.host.selfie_photo || event.host.profile_photo || event.host.avatar || event.host.photo || event.host.image || event.host.profileImage
    }, [event?.host])
    return (
        <aside className="space-y-6 sticky top-24">
            <div className="bg-white rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                        <div className="w-20 h-20 bg-accent rounded-full overflow-hidden shadow-lg">
                            {hostPhoto && !imageError ? (
                                <img
                                    src={hostPhoto}
                                    alt={event?.host?.full_name || "Host"}
                                    className="w-full h-full object-cover"
                                    onError={handleImageError}
                                    onLoad={() => setImageError(false)}
                                />
                            ) : (
                                <div className="w-full h-full bg-accent flex items-center justify-center">
                                    <span className="text-2xl font-bold text-white">
                                        {event?.host?.full_name?.charAt(0)?.toUpperCase() || 'H'}
                                    </span>
                                </div>
                            )}
                        </div>
                        {event?.host?.status === 'approved' && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 text-lg">{event?.host?.full_name || "Host"}</p>
                        <p className="text-sm text-gray-500">Event Organizer</p>
                        {event?.host?.phone && <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">📱 {event.host.phone}</p>}
                        {event?.host?.email && <p className="text-sm text-gray-600 truncate">✉️ {event.host.email}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />)}
                    <span className="text-sm text-gray-500 ml-2">4.9 Host Rating</span>
                </div>
                <Button
                    onClick={() => event?.host?.phone && window.open(`tel:${event.host.phone}`)}
                    className="w-full gap-2 bg-accent text-white hover:bg-accent/90 transition-all duration-300 transform hover:scale-105 shadow-lg rounded-2xl"
                >
                    <MessageCircle className="h-4 w-4" />
                    Contact Host
                </Button>
            </div>
            <div className="bg-white rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-accent" />
                    Who's Going
                </h3>
                <div className="flex -space-x-4 mb-6">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="w-12 h-12 bg-accent rounded-full border-3 border-white shadow-lg"></div>
                    ))}
                    <div className="w-12 h-12 bg-accent rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white font-bold">
                        +{Math.max(0, (event?.attendeesCount || 0) - 5)}
                    </div>
                </div>
                <p className="text-sm text-gray-600 mb-6 text-center">{event?.attendeesCount || 0} people attending</p>
                <Button className="w-full gap-2 bg-accent text-white hover:bg-accent/90 transition-all duration-300 transform hover:scale-105 shadow-lg rounded-2xl">
                    <UserPlus className="h-4 w-4" />
                    Invite Friends
                </Button>
            </div>
            {/* Event Mode Card */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-gray-100">
                <div className={`relative h-48 ${event.event_mode === 'online' ? 'bg-gradient-to-br from-blue-200 to-blue-300' :
                    event.event_mode === 'hybrid' ? 'bg-gradient-to-br from-purple-200 to-purple-300' :
                        'bg-gradient-to-br from-gray-200 to-gray-300'
                    } flex items-center justify-center`}>
                    {event.event_mode === 'online' ? <Video className="h-16 w-16 text-blue-600" /> :
                        event.event_mode === 'hybrid' ? <Monitor className="h-16 w-16 text-purple-600" /> :
                            <MapPin className="h-16 w-16 text-gray-600" />}
                </div>
                <div className="p-6">
                    <h3 className="font-bold text-gray-900 mb-2 capitalize">{event.event_mode} Event</h3>
                    <p className="text-gray-600 text-sm mb-4">
                        {event.event_mode === 'online' ? 'Join from anywhere in the world' :
                            event.event_mode === 'hybrid' ? 'In-person and online options available' :
                                'Held at the venue location'}
                    </p>
                    {event.event_mode === 'online' && event.event_url && (
                        <Button
                            onClick={() => window.open(event.event_url.trim(), '_blank')}
                            className="w-full bg-blue-500 text-white hover:bg-blue-600 transition-all duration-300 transform hover:scale-105 shadow-xl rounded-2xl"
                        >
                            Join Event
                        </Button>
                    )}
                    {event.event_mode === 'hybrid' && (
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                onClick={() => window.open(event.googleMapsUrl, '_blank')}
                                className="bg-accent text-white hover:bg-accent/90 transition-all duration-300 transform hover:scale-105 shadow-xl rounded-2xl"
                            >
                                In-Person
                            </Button>
                            <Button
                                onClick={() => event.event_url && window.open(event.event_url.trim(), '_blank')}
                                className="bg-blue-500 text-white hover:bg-blue-600 transition-all duration-300 transform hover:scale-105 shadow-xl rounded-2xl"
                            >
                                Online
                            </Button>
                        </div>
                    )}
                    {event.event_mode === 'offline' && (
                        <Button
                            onClick={() => window.open(event.googleMapsUrl, '_blank')}
                            className="w-full bg-accent text-white hover:bg-accent/90 transition-all duration-300 transform hover:scale-105 shadow-xl rounded-2xl"
                        >
                            Get Directions
                        </Button>
                    )}
                </div>
            </div>
        </aside>
    )
})

export default function EventDetailsPage() {
    const { id } = useParams()
    const { data: apiEvent, isLoading, error } = useGetEventByIdQuery(id)
    const [isSaved, setIsSaved] = useState(false)
    const [showShareMenu, setShowShareMenu] = useState(false)
    const [isRegistered, setIsRegistered] = useState(false)
    const [activeTab, setActiveTab] = useState("overview")
    const [visibleSections, setVisibleSections] = useState(new Set(['overview']))
    const [copiedLink, setCopiedLink] = useState(false)

    const event = useMemo(() => {
        if (!apiEvent) return null
        return {
            id: apiEvent.id,
            title: apiEvent.title,
            description: apiEvent.description,
            image: apiEvent.banner_image || (apiEvent.gallery_images?.[0]) || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30",
            date: apiEvent.start_date,
            time: apiEvent.start_time,
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
            online_instructions: apiEvent.online_instructions || ""
        }
    }, [apiEvent])

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
            setTimeout(() => setCopiedLink(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }, [])

    const handleSaveToggle = useCallback(() => setIsSaved(prev => !prev), [])
    const handleShareToggle = useCallback(() => setShowShareMenu(prev => !prev), [])
    const handleRegister = useCallback(() => setIsRegistered(true), [])
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
            <RegistrationBar isRegistered={isRegistered} handleRegister={handleRegister} event={event} />
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