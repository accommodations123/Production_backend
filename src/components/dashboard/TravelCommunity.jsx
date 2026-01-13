import React from 'react';
import { Link } from 'react-router-dom';
import { useGetPublicTripsQuery } from "@/store/api/authApi";
import { Loader2, ExternalLink, MapPin, Calendar, MessageCircle } from 'lucide-react';

const CommunityCard = ({ match, onConnect }) => (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full">
        <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <img
                        src={match.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${match.name}`}
                        alt={match.name}
                        className="w-12 h-12 rounded-full object-cover bg-gray-100"
                    />
                    <div>
                        <h3 className="font-bold text-gray-900">{match.name}</h3>
                        <p className="text-xs text-gray-500">{match.location || match.country}</p>
                    </div>
                </div>
            </div>

            {/* Trip Info */}
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span className="font-bold text-gray-900">{match.tripTitle}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 pl-6">
                    <Calendar className="w-3 h-3" />
                    <span>{match.date}</span>
                    <span className="mx-1">•</span>
                    <span>Travel</span>
                </div>
            </div>

            {/* Quote (Generic for now as API doesn't return bio) */}
            <div className="bg-gray-50 p-4 rounded-xl mb-6">
                <p className="text-sm text-gray-600 italic leading-relaxed">
                    "Looking forward to this trip! Connect with me if you're traveling the same way."
                </p>
            </div>
        </div>

        {/* Action */}
        <div>
            <button
                onClick={() => onConnect(match)}
                className="w-full py-3 bg-[#0F172A] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1E293B] transition-colors"
                title="Connect Request"
            >
                <MessageCircle className="w-4 h-4" />
                Connect
            </button>
        </div>
    </div>
);

export const TravelCommunity = ({ onConnect }) => {
    const { data, isLoading } = useGetPublicTripsQuery({
        page: 1,
        limit: 6
    });

    const communityMatches = data?.results?.map(trip => ({
        id: trip.id,
        name: trip.host?.full_name || "Traveler",
        location: trip.host?.city || trip.from_city,
        country: trip.host?.country || trip.from_country,
        image: trip.host?.profile_image || null,
        tripTitle: `${trip.to_city}, ${trip.to_country}`,
        date: new Date(trip.travel_date).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric'
        }),
    })) || [];

    if (isLoading) {
        return (
            <div className="py-8 flex justify-center">
                <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
            </div>
        );
    }

    if (communityMatches.length === 0) return null;

    return (
        <div className="py-8">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-1.5 h-8 bg-blue-900 rounded-full"></div>
                        <h2 className="text-3xl font-black text-blue-900">Find Travel Community</h2>
                    </div>
                    <p className="text-gray-500 font-medium">Connect with fellow travelers and explore the world together</p>
                </div>

                <Link to="/travel" className="px-4 py-2 bg-red-50 text-red-500 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-red-100 transition-colors">
                    View All Trips <ExternalLink className="w-4 h-4" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {communityMatches.map(match => (
                    <CommunityCard key={match.id} match={match} onConnect={onConnect} />
                ))}
            </div>
        </div>
    );
};
