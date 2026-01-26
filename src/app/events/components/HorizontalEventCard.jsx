import React, { memo } from "react"
import { Calendar, MapPin, Users, Star, MessageCircle, Heart, Bookmark, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HostPhoto } from "./HostPhoto"

export const HorizontalEventCard = memo(({ event, onViewDetails, index }) => {
    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return "Date TBA";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    };

    // Format time for display
    const formatTime = (timeString) => {
        if (!timeString) return "";
        try {
            const [hours, minutes] = timeString.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : hour;
            return `${displayHour}:${minutes} ${ampm}`;
        } catch (e) {
            return timeString;
        }
    };

    // Get organizer name with fallback
    const getOrganizerName = () => {
        if (event.host?.full_name) return event.host.full_name;
        if (event.organizer) return event.organizer;
        return "Unknown Organizer";
    };

    // Get event image with fallback
    const getEventImage = () => {
        if (event.image) return event.image;
        if (event.banner_image) return event.banner_image;
        if (event.gallery_images && event.gallery_images.length > 0) return event.gallery_images[0];
        return null;
    };

    const eventImage = getEventImage();

    return (
        <div
            className="w-72 sm:w-80 flex-shrink-0"
            style={{ animationDelay: `${index * 30}ms` }}
        >
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm bg-white h-full transition-all duration-300 hover:shadow-md">
                {/* Event Image */}
                <div className={`relative h-40 sm:h-48 overflow-hidden ${!eventImage ? 'bg-gradient-to-br from-slate-700 to-slate-900' : ''}`}>
                    {eventImage ? (
                        <img
                            src={eventImage}
                            alt={event.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="w-10 h-10 text-white/20" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3">
                        <span className="px-2 sm:px-3 py-1 bg-[#ff0000] text-white text-xs font-bold rounded-full shadow-lg">
                            {event.type || "Event"}
                        </span>
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2">
                        <button className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors duration-200">
                            <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                        <button className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors duration-200">
                            <Bookmark className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                    </div>
                    {event.price && (
                        <div className="absolute bottom-3 left-3">
                            <span className="px-2 sm:px-3 py-1 bg-white/90 backdrop-blur-md text-gray-900 font-bold rounded-lg shadow-lg text-sm">
                                ${event.price}
                            </span>
                        </div>
                    )}
                </div>

                {/* Event Content */}
                <div className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                        <span className="text-xs sm:text-sm text-gray-600 truncate">
                            {event.city ? `${event.city}, ${event.country || ""}` : event.location || "Location TBA"}
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{event.title}</h3>
                    <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">{event.description}</p>

                    {/* Event Stats */}
                    <div className="flex items-center justify-between mb-3 sm:mb-4 border-t border-gray-50 pt-3">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                            <span className="text-xs text-gray-600">
                                {formatDate(event.date || event.start_date)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                            <span className="text-xs text-gray-600">
                                {event.attendees_count || 0} attending
                            </span>
                        </div>
                    </div>

                    {/* Organizer */}
                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                        <HostPhoto host={event.host} />
                        <div className="overflow-hidden">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Organizer</p>
                            <p className="text-sm font-medium text-gray-900 truncate">{getOrganizerName()}</p>
                        </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center justify-between mb-4 bg-gray-50/50 p-2 rounded-lg">
                        <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-bold text-gray-900">4.9</span>
                            <span className="text-[10px] text-gray-500">({event.reviews_count || 0})</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                            <MessageCircle className="h-3 w-3" />
                            <span className="text-[10px]">{event.comments_count || 0}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button
                            onClick={() => onViewDetails(event.id)}
                            className="flex-1 bg-[#ff0000] hover:bg-[#cc0000] text-white rounded-lg h-9 text-xs font-medium transition-all duration-200"
                        >
                            View Details
                        </Button>
                        <Button variant="outline" className="w-9 h-9 p-0 border-gray-200 text-gray-500 hover:bg-gray-50 rounded-lg shrink-0">
                            <Share2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
})
HorizontalEventCard.displayName = "HorizontalEventCard"
