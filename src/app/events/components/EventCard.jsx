import React, { memo } from "react"
import { Calendar, MapPin, Users, Star, MessageCircle, Heart, Bookmark, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HostPhoto } from "./HostPhoto"

export const EventCard = memo(({ event, viewMode, onViewDetails, index }) => {
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
            className={`${viewMode === "list" ? "flex flex-col sm:flex-row gap-4" : ""}`}
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm ${viewMode === "list" ? "flex-1 flex" : ""} bg-white transition-all duration-300`}>
                {/* Card Image */}
                <div className={`relative ${viewMode === "list" ? "w-full sm:w-1/3 h-48 sm:h-auto" : "w-full h-48 sm:h-56"} overflow-hidden ${!eventImage ? 'bg-gradient-to-br from-slate-700 to-slate-900' : ''}`}>
                    {eventImage ? (
                        <img
                            src={eventImage}
                            alt={event.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="w-12 h-12 text-white/20" />
                        </div>
                    )}
                    <div className="absolute inset-0 from-black/60 via-black/20 to-transparent" />
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

                {/* Card Content */}
                <div className={`p-4 sm:p-5 ${viewMode === "list" ? "flex-1 flex flex-col justify-between" : ""}`}>
                    <div>
                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                            <span className="text-xs sm:text-sm text-gray-600">
                                {event.city ? `${event.city}, ${event.country || ""}` : event.location || "Location TBA"}
                            </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 line-clamp-2">{event.title}</h3>
                        <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">{event.description}</p>

                        {/* Event Stats */}
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                                <span className="text-xs sm:text-sm text-gray-600">
                                    {formatDate(event.date || event.start_date)}
                                    {event.time && ` at ${formatTime(event.time)}`}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                                <span className="text-xs sm:text-sm text-gray-600">
                                    {event.attendees_count || 0} attending
                                </span>
                            </div>
                        </div>

                        {/* Organizer */}
                        <div className="flex items-center gap-3 mb-3 sm:mb-4">
                            <HostPhoto host={event.host} />
                            <div>
                                <p className="text-xs text-gray-500">Organized by</p>
                                <p className="text-sm font-medium text-gray-900">{getOrganizerName()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                            <span className="text-xs sm:text-sm text-gray-600 ml-1">
                                ({event.reviews_count || 0})
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                            <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="text-xs sm:text-sm">
                                {event.comments_count || 0}
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button
                            onClick={() => onViewDetails(event.id)}
                            className="flex-1 bg-[#ff0000] hover:bg-[#cc0000] text-white rounded-lg py-2 text-xs sm:text-sm font-medium transition-all duration-200"
                        >
                            View Details
                        </Button>
                        <Button variant="outline" className="px-3 sm:px-4 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200">
                            <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
})
EventCard.displayName = "EventCard"
