import React, { memo } from "react"
import { Link } from "react-router-dom"
import { Globe, Search, Plus, Calendar, Users, MapPin, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HeroEventSlider } from "@/components/events/HeroEventSlider"
import { getHostPath } from "@/lib/navigationUtils"

export const EventsHero = memo(({ totalEvents, searchQuery, setSearchQuery, featuredEvents, isLoading }) => {
    const isAuthenticated = !!localStorage.getItem("user")
    const hostPath = getHostPath('event', isAuthenticated)

    return (
        <div className="relative bg-[#00152d] pt-28 pb-20 px-4 overflow-hidden">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-full h-full">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full bg-[#ff0000] animate-pulse"
                            style={{
                                width: Math.random() * 100 + 50 + 'px',
                                height: Math.random() * 100 + 50 + 'px',
                                left: Math.random() * 100 + '%',
                                top: Math.random() * 100 + '%',
                                animationDelay: Math.random() * 5 + 's',
                                animationDuration: Math.random() * 10 + 10 + 's'
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="container mx-auto max-w-7xl relative z-10">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="text-center lg:text-left max-w-2xl animate-fade-in">


                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                            Discover Amazing <span className="text-[#ff0000]">Events</span>
                        </h1>

                        <p className="text-gray-300 text-base md:text-lg max-w-xl mb-8">
                            Explore concerts, workshops, meetups, and more happening around the world. Join millions of people creating memorable experiences.
                        </p>

                        {/* Search Bar */}
                        <div className="relative mb-8 max-w-lg mx-auto lg:mx-0 group">
                            <input
                                type="text"
                                placeholder="Search events by name, location, or category..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-5 py-3 pl-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:border-[#ff0000] transition-all duration-300 group-hover:bg-white/15"
                            />
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-300 group-hover:text-white transition-colors duration-300" />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                            <Link to={hostPath}>
                                <Button className="h-12 px-6 sm:px-8 bg-[#ff0000] hover:bg-[#cc0000] text-white rounded-xl font-medium shadow-lg shadow-[#ff0000]/25 flex items-center gap-2 transform hover:scale-105 transition-all duration-300 text-sm sm:text-base">
                                    <Plus className="h-5 w-5" />
                                    Host an Event
                                </Button>
                            </Link>
                        </div>


                    </div>

                    {/* Hero Slider */}
                    <div className="w-full lg:w-1/2 animate-slide-in-right">
                        <HeroEventSlider events={isLoading ? [] : featuredEvents} />
                    </div>
                </div>
            </div>
        </div>
    )
})
EventsHero.displayName = "EventsHero"
