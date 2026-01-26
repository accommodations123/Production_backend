import React, { memo } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Share2, Heart, Globe, Video, Monitor, MapPin, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ShareMenu } from "./ShareMenu"

export const HeroSection = memo(({ event, isSaved, onSave, shareOpen, onShare, copied, onCopy }) => (
    <div className={`relative h-[70vh] overflow-hidden ${!event.image ? 'bg-slate-800' : ''}`}>
        <div className="absolute inset-0">
            {event.image && (
                <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
            )}
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
HeroSection.displayName = "HeroSection"
