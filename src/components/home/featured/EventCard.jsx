import React from 'react';
import { MapPin, Calendar, Users, Star, MessageCircle, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCountry } from '@/context/CountryContext';

const HostPhoto = ({ host, name }) => {
    const photoUrl =
        host?.selfie_photo ||
        host?.photo ||
        host?.avatar_image ||
        host?.image;

    return (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
            {photoUrl ? (
                <img
                    src={photoUrl}
                    alt={name || "Organizer"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
            ) : (
                <span className="text-xs font-bold text-gray-500 uppercase">
                    {(name || "O").charAt(0)}
                </span>
            )}
        </div>
    );
};

export const EventCard = ({ event, viewMode = "grid", onViewDetails }) => {
    const { activeCountry } = useCountry();
    // Helper functions for formatting date and time
    const formatDate = (dateString) => {
        if (!dateString) return "Date TBA";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (timeString) => {
        if (!timeString) return "";
        if (timeString.includes(':') && (timeString.includes('AM') || timeString.includes('PM'))) {
            return timeString;
        }
        try {
            const [hours, minutes] = timeString.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const formattedHour = hour % 12 || 12;
            return `${formattedHour}:${minutes || '00'} ${ampm}`;
        } catch (e) {
            return timeString;
        }
    };

    const getOrganizerName = () => {
        const host = event.Host || event.host || event.creator || event.organizer;
        if (host?.full_name) return host.full_name;
        if (host?.name) return host.name;
        if (host?.User?.full_name) return host.User.full_name;
        if (typeof host === 'string') return host;
        if (event.host_name) return event.host_name;
        return "Organizer";
    };

    const getDateParts = (dateString) => {
        if (!dateString) return { month: "TBA", day: "" };
        const date = new Date(dateString);
        return {
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            day: date.toLocaleDateString('en-US', { day: 'numeric' })
        };
    };

    const { month, day } = getDateParts(event.date || event.start_date || event.event_date);

    return (
        <div className={`group bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 border border-neutral-100 overflow-hidden ${viewMode === "list" ? "flex" : "flex flex-col h-full"
            }`}>
            {/* Event Image */}
            {viewMode !== "list" && (
                <div className={`relative h-48 overflow-hidden ${!(event.banner_image || event.image) ? 'bg-gradient-to-br from-slate-700 to-slate-900' : ''}`}>
                    {(event.banner_image || event.image) ? (
                        <img
                            src={event.banner_image || event.image}
                            alt={event.title}
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="w-10 h-10 text-white/20" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#00142E]/80 via-transparent to-transparent"></div>

                    {/* Date Block Overlay */}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md rounded-xl p-1.5 text-center min-w-[3rem] shadow-lg border border-white/20">
                        <span className="block text-[10px] font-bold text-[#CB2A25] uppercase tracking-wider">{month}</span>
                        <span className="block text-lg font-black text-[#00142E] leading-none mt-0.5">{day}</span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                        <span className="inline-block bg-[#CB2A25] text-white text-[10px] font-bold px-2 py-0.5 rounded-md mb-1.5 shadow-sm uppercase tracking-wide">
                            {event.category || "Community"}
                        </span>
                        <h3 className="text-lg font-bold text-white leading-tight line-clamp-1 drop-shadow-md">
                            {event.title}
                        </h3>
                    </div>
                </div>
            )}

            <div className={`p-4 ${viewMode === "list" ? "flex-1 flex flex-col justify-between" : "flex-1 flex flex-col"}`}>
                <div className="flex-1">
                    {/* Location & Time */}
                    <div className="flex items-start gap-4 mb-3">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                            <MapPin className="h-3.5 w-3.5 text-[#CB2A25] shrink-0" />
                            <span className="font-medium line-clamp-1" title={event.city ? `${event.city}, ${event.country || ""}` : event.location}>
                                {event.city ? `${event.city}, ${event.country || ""}` : event.location || "Location TBA"}
                            </span>
                        </div>
                        {(event.time || event.start_time) && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 ml-auto">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{formatTime(event.time || event.start_time)}</span>
                            </div>
                        )}
                    </div>

                    <p className="text-gray-600 text-xs mb-4 line-clamp-2 leading-relaxed border-l-2 border-gray-100 pl-3">
                        {event.description}
                    </p>

                    {/* Organizer & Stats */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 bg-gray-50/50 -mx-4 px-4 pb-1">
                        <div className="flex items-center gap-2 mb-2">
                            <HostPhoto host={event.Host || event.host || event.creator} name={getOrganizerName()} />
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Hosted by</p>
                                <p className="text-xs font-bold text-[#00142E] truncate max-w-[100px]" title={getOrganizerName()}>
                                    {getOrganizerName()}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-gray-200 shadow-sm mb-2">
                            <Users className="h-3 w-3 text-[#CB2A25]" />
                            <span className="text-[10px] font-bold text-[#00142E]">{event.attendees_count || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Rating hidden for cleaner look, can be re-enabled if critical */}

                {/* Action Buttons */}
                <div className="mt-3 flex gap-2">
                    <Button
                        onClick={() => onViewDetails(event.id || event._id)}
                        className="flex-1 bg-[#00142E] hover:bg-[#CB2A25] text-white rounded-lg py-4 text-xs font-bold transition-all duration-300 shadow-md group-hover:shadow-lg flex items-center justify-center gap-2 h-9"
                    >
                        View Details
                    </Button>
                </div>
            </div>
        </div>
    );
};
