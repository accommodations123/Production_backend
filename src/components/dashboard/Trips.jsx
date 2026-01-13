import React, { useState } from 'react';
import { useGetMyTripsQuery, useLazySearchTripsQuery, useTravelMatchActionMutation } from '@/store/api/authApi';
import { Calendar, Clock, Plane, ArrowRight, UserPlus, Check, X, Smartphone, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TravelCommunity } from './TravelCommunity';

const MatchFinder = ({ trip, onClose }) => {
    const [triggerSearch, { data: searchResults, isFetching }] = useLazySearchTripsQuery();
    const [sendAction, { isLoading: isActionLoading }] = useTravelMatchActionMutation();
    const [sentRequests, setSentRequests] = useState(new Set());

    React.useEffect(() => {
        if (trip) {
            triggerSearch({
                from_country: trip.from_country,
                to_country: trip.to_country,
                date: trip.travel_date
            });
        }
    }, [trip, triggerSearch]);

    const handleAction = async (matchedTripId, action) => {
        try {
            const res = await sendAction({
                trip_id: trip.id,
                matched_trip_id: matchedTripId,
                action
            }).unwrap();

            if (res.success) {
                if (action === 'request') {
                    setSentRequests(prev => new Set(prev).add(matchedTripId));
                    alert("Request sent successfully!");
                }
            }
        } catch (error) {
            console.error(error);
            alert(error?.data?.message || "Action failed");
        }
    };

    return (
        <div className="mt-4 border-t pt-4">
            <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-gray-800">Find Travel Partners</h4>
                <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
            </div>

            {isFetching ? (
                <div className="flex justify-center p-4">
                    <Loader2 className="animate-spin text-blue-500" />
                </div>
            ) : searchResults?.results?.length > 0 ? (
                <div className="space-y-3">
                    {searchResults.results
                        .filter(t => t.id !== trip.id) // Exclude self
                        .map(match => (
                            <div key={match.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                        {match.host?.full_name?.[0] || "U"}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-gray-900">{match.host?.full_name}</p>
                                        <p className="text-xs text-gray-500">{match.flight_number} • {match.airline}</p>
                                    </div>
                                </div>

                                {sentRequests.has(match.id) ? (
                                    <span className="text-xs px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                                        Requested
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => handleAction(match.id, 'request')}
                                        disabled={isActionLoading}
                                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        title="Send Request"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    {searchResults.results.filter(t => t.id !== trip.id).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-2">No other travelers found yet.</p>
                    )}
                </div>
            ) : (
                <p className="text-sm text-gray-500">No matches found for this route and date.</p>
            )}
        </div>
    );
};

export const Trips = () => {
    const { data, isLoading, isError } = useGetMyTripsQuery();
    const navigate = useNavigate();
    const [activeMatchTrip, setActiveMatchTrip] = useState(null);

    const tripList = data?.trips || [];

    const handleCommunityConnect = (communityMatch) => {
        // In a real scenario, we would ask the user WHICH of their trips they want to connect with.
        // For now, we'll just show an alert or open a modal.
        alert(`Request to connect with ${communityMatch.name} sent! (Mock Action)`);
    };

    if (isLoading) {
        return (
            <div className="p-8 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">
                <p>Failed to load trips. Please try again later.</p>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            {/* My Trips Section */}
            <div className="space-y-6">
                {/* ... (existing My Trips header and map loop) ... */}
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Your Trips</h2>
                        <p className="text-gray-500">Upcoming travel plans</p>
                    </div>
                </div>

                {!isLoading && !isError && tripList.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plane className="w-8 h-8 text-blue-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No trips planned yet</h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            You haven't added any travel plans. Create a trip to find travel partners!
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {tripList.map((trip) => (
                            <div
                                key={trip.id}
                                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                            >
                                {/* ... (Trip Card Content) ... */}
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                                <Plane className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg">
                                                    {trip.from_city} <span className="text-gray-400 mx-1">→</span> {trip.to_city}
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    {trip.airline} • {trip.flight_number}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-4 text-sm mt-4">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span>{new Date(trip.travel_date).toLocaleDateString(undefined, {
                                                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                                                })}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <span>{trip.departure_time.slice(0, 5)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex md:flex-col justify-between items-end gap-4 min-w-[120px]">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${trip.status === 'active' ? 'bg-green-100 text-green-700' :
                                            trip.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {trip.status}
                                        </span>

                                        {trip.status === 'active' && (
                                            <button
                                                onClick={() => setActiveMatchTrip(activeMatchTrip === trip.id ? null : trip.id)}
                                                className="text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                                            >
                                                {activeMatchTrip === trip.id ? 'Close' : 'Find Partner'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {activeMatchTrip === trip.id && (
                                    <MatchFinder trip={trip} onClose={() => setActiveMatchTrip(null)} />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Travel Community Section */}
            <TravelCommunity onConnect={handleCommunityConnect} />
        </div>
    );
};
