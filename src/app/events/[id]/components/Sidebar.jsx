import React, { useState, useMemo, memo } from "react"
import { Users, Check, Star, MessageCircle, UserPlus, MapPin, Video, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"

export const Sidebar = memo(({ event }) => {
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
                {(event?.attendeesCount || 0) > 0 && (
                    <div className="flex -space-x-4 mb-6 justify-center">
                        <div className="w-12 h-12 bg-accent rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white font-bold">
                            {event.attendeesCount}
                        </div>
                    </div>
                )}
                <p className="text-sm text-gray-600 mb-6 text-center">{event?.attendeesCount || 0} people attending</p>
                <Button className="w-full gap-2 bg-accent text-white hover:bg-accent/90 transition-all duration-300 transform hover:scale-105 shadow-lg rounded-2xl">
                    <UserPlus className="h-4 w-4" />
                    Invite Friends
                </Button>
            </div>
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
Sidebar.displayName = "Sidebar"
