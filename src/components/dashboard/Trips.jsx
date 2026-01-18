import React, { useState } from 'react';
import { useGetMyTripsQuery, useLazySearchTripsQuery, useTravelMatchActionMutation } from '@/store/api/authApi';
import { useGetHostProfileQuery } from "@/store/api/hostApi";
import { Calendar, Clock, Plane, ArrowRight, UserPlus, Check, X, Smartphone, Loader2, MapPin, Users, Ticket, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";

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
                    // Toast notification would be better here
                }
            }
        } catch (error) {
            console.error(error);
            alert(error?.data?.message || "Action failed");
        }
    };

    return (
        <div className="mt-6 border-t border-neutral/20 pt-6 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h4 className="font-bold text-primary text-lg">Find Travel Partners</h4>
                    <p className="text-sm text-primary/50">Travelers on a similar route</p>
                </div>
                <button
                    onClick={onClose}
                    className="text-sm font-medium text-primary/60 hover:text-accent transition-colors bg-neutral/10 px-3 py-1.5 rounded-lg"
                >
                    Close
                </button>
            </div>

            {isFetching ? (
                <div className="flex flex-col items-center justify-center p-8 space-y-3">
                    <Loader2 className="animate-spin text-accent w-8 h-8" />
                    <p className="text-sm text-primary/50">Searching for travelers...</p>
                </div>
            ) : searchResults?.results?.length > 0 ? (
                <div className="space-y-3">
                    {searchResults.results
                        .filter(t => t.id !== trip.id) // Exclude self
                        .map(match => (
                            <div key={match.id} className="flex items-center justify-between p-4 rounded-xl border border-neutral/20 hover:border-accent/30 hover:shadow-md transition-all bg-white group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20">
                                        {match.host?.full_name?.[0] || "U"}
                                    </div>
                                    <div>
                                        <p className="font-bold text-primary group-hover:text-accent transition-colors">{match.host?.full_name}</p>
                                        <div className="flex items-center gap-2 text-xs text-primary/60 mt-0.5">
                                            <span className="font-medium">{match.airline}</span>
                                            <span className="w-1 h-1 bg-neutral rounded-full"></span>
                                            <span>{match.flight_number}</span>
                                        </div>
                                    </div>
                                </div>

                                {sentRequests.has(match.id) ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral/20 text-primary/70 rounded-full text-xs font-bold">
                                        <Check className="w-3.5 h-3.5" />
                                        Requested
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => handleAction(match.id, 'request')}
                                        disabled={isActionLoading}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-accent transition-colors shadow-lg shadow-primary/10 hover:shadow-accent/20"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Connect
                                    </button>
                                )}
                            </div>
                        ))}
                    {searchResults.results.filter(t => t.id !== trip.id).length === 0 && (
                        <div className="text-center py-8 bg-neutral/5 rounded-xl border border-dashed border-neutral/30">
                            <p className="text-primary/50 font-medium">No matches found right now.</p>
                            <p className="text-xs text-primary/40 mt-1">Try checking back closer to your travel date.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-8 bg-neutral/5 rounded-xl border border-dashed border-neutral/30">
                    <div className="w-12 h-12 bg-neutral/20 rounded-full flex items-center justify-center mx-auto mb-3 text-primary/40">
                        <Users className="w-6 h-6" />
                    </div>
                    <p className="text-primary/60 font-medium">No matches found for this route.</p>
                </div>
            )}
        </div>
    );
};

export const Trips = () => {
    const { data, isLoading, isError } = useGetMyTripsQuery();
    const { data: hostProfile } = useGetHostProfileQuery();
    const [sendAction] = useTravelMatchActionMutation();
    const navigate = useNavigate();
    const [activeMatchTrip, setActiveMatchTrip] = useState(null);

    const handlePlanTrip = () => {
        if (!hostProfile || (!hostProfile.id && !hostProfile._id)) {
            navigate('/hosts', { replace: true });
            return;
        }
        // Redirect to trip creation page or open modal
        // Since I don't know the exact route, I will alert for now or assume a route.
        // User hasn't specified the trip create route.
        // I will assume it DOES NOT exist or I should navigate to a placeholder.
        alert("Trip Creation Feature requires Host Profile. (Route not defined yet).");
    };

    const tripList = data?.trips || [];

    // Separate matches into Incoming (needs my action) and Sent (waiting for others)
    const incomingRequests = [];
    const sentRequests = [];

    tripList.forEach(trip => {
        (trip.matches || []).forEach(match => {
            console.log('Processing match:', match, 'for trip:', trip.id);
            if (match.status === 'pending' || match.status === 'requested') {
                // If the matched_trip_id is MINE, then someone requested ME -> Incoming
                // If the trip_id is MINE, then I requested someone -> Sent

                // Allow loose comparison for IDs in case of string/number mismatch
                if (match.matched_trip_id == trip.id) {
                    console.log('-> Classified as INCOMING');
                    incomingRequests.push({ ...match, tripDetails: trip });
                } else if (match.trip_id == trip.id) {
                    console.log('-> Classified as SENT');
                    sentRequests.push({ ...match, tripDetails: trip });
                } else {
                    console.log('-> Unclassified match:', match.trip_id, match.matched_trip_id, trip.id);
                }
            }
        });
    });

    console.log('Incoming:', incomingRequests);
    console.log('Sent:', sentRequests);

    const handleRequestAction = async (match, action) => {
        try {
            const res = await sendAction({
                trip_id: match.trip_id,
                matched_trip_id: match.matched_trip_id,
                action
            }).unwrap();

            if (res.success) {
                const msgMap = {
                    accept: 'Request accepted!',
                    reject: 'Request rejected.',
                    cancel: 'Match cancelled.'
                };
                alert(msgMap[action] || 'Success!');
            }
        } catch (error) {
            console.error(error);
            alert(error?.data?.message || `Failed to ${action} request`);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-neutral/20 rounded-full"></div>
                    <div className="absolute inset-0 w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="mt-4 text-primary/60 font-medium">Loading your journeys...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full mb-4">
                    <AlertCircle className="w-4 h-4" />
                    <span>Failed to load trips</span>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="text-sm font-medium text-primary underline hover:text-accent"
                >
                    Try refreshing the page
                </button>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen">
            {/* Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/5 to-accent/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-neutral/20 to-accent/5 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 p-4 md:p-8 space-y-8 max-w-5xl">

                {/* Header Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-navy-dark p-8 md:p-10 text-white shadow-2xl shadow-primary/20">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.05) 0%, transparent 40%)' }}></div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mr-[15px]">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-xs font-medium text-white/80 mb-4 border border-white/10">
                                <Plane className="w-3.5 h-3.5 rotate-45" />
                                Travel Dashboard
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">Your Journeys</h1>
                            <p className="text-white/60 max-w-md text-lg">Manage your trips and find travel companions for your upcoming adventures.</p>
                        </div>
                        <button
                            className="bg-white text-primary hover:bg-neutral/20 rounded-xl px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2 whitespace-nowrap"
                            onClick={handlePlanTrip}
                        >
                            <Ticket className="w-5 h-5" />
                            Plan New Trip
                        </button>
                    </div>
                </div>

                {/* Pending Requests Section */}
                {(incomingRequests.length > 0 || sentRequests.length > 0) && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">

                        {/* Incoming Requests (To Accept/Reject) */}
                        {incomingRequests.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold text-primary">Incoming Requests</h2>
                                    <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-bold rounded-full">{incomingRequests.length}</span>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {incomingRequests.map(match => (
                                        <div key={match.id} className="bg-white p-5 rounded-2xl shadow-lg shadow-neutral/10 border border-accent/20 flex items-center justify-between group hover:border-accent/40 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-gradient-to-br from-accent to-red-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-accent/20">
                                                    {(match.sender_host?.full_name?.[0] || match.user?.full_name?.[0] || "U")}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-primary text-lg">{match.sender_host?.full_name || match.user?.full_name || "Unknown Traveler"}</h4>
                                                    <div className="flex items-center gap-1.5 text-xs text-primary/60 mt-1">
                                                        <span className="font-medium bg-neutral/10 px-2 py-0.5 rounded text-primary/80">
                                                            Trip Match
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-primary/40 mt-1">
                                                        For your trip to {match.tripDetails.to_city}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => handleRequestAction(match, 'accept')}
                                                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors border border-green-100 flex items-center gap-2 justify-center"
                                                    title="Accept"
                                                >
                                                    <Check size={20} />
                                                    <span className="text-xs font-bold md:hidden">Accept</span>
                                                </button>
                                                <button
                                                    onClick={() => handleRequestAction(match, 'reject')}
                                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-100 flex items-center gap-2 justify-center"
                                                    title="Reject"
                                                >
                                                    <X size={20} />
                                                    <span className="text-xs font-bold md:hidden">Reject</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sent Requests (Pending Approval) */}
                        {sentRequests.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold text-primary">Sent Requests</h2>
                                    <span className="px-2 py-0.5 bg-neutral/10 text-primary/60 text-xs font-bold rounded-full">{sentRequests.length}</span>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {sentRequests.map(match => (
                                        <div key={match.id} className="bg-white/60 p-5 rounded-2xl border border-neutral/20 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-neutral/20 rounded-xl flex items-center justify-center text-primary/40 font-bold text-xl">
                                                    {(match.receiver_host?.full_name?.[0] || match.host?.full_name?.[0] || "U")}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-primary/80 text-lg">{match.receiver_host?.full_name || match.host?.full_name || "Traveler"}</h4>
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded text-xs font-bold mt-1">
                                                        <Clock size={12} />
                                                        Pending
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRequestAction(match, 'cancel')}
                                                className="text-xs font-medium text-red-500 hover:text-red-700 hover:underline px-3 py-1.5"
                                            >
                                                Cancel Request
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Trip List */}
                <div className="space-y-6">
                    {!isLoading && !isError && tripList.length === 0 ? (
                        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-neutral/5 to-neutral/10 border border-neutral/20 p-16 text-center shadow-xl">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"></div>
                            <div className="relative z-10">
                                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-neutral/20 to-neutral/40 rounded-3xl flex items-center justify-center mb-6 shadow-lg rotate-12 group-hover:rotate-0 transition-transform duration-500">
                                    <Plane className="w-12 h-12 text-primary/60" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3 text-primary">No trips planned yet</h3>
                                <p className="text-primary/60 max-w-md mx-auto mb-8">
                                    Start your next adventure! Add a trip to track your journey and connect with fellow travelers.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {tripList.map((trip) => (
                                <div
                                    key={trip.id}
                                    className="group relative bg-white rounded-2xl shadow-xl shadow-neutral/5 border border-neutral/20 overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300"
                                >
                                    {/* Gradient Accent Bar */}
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary via-secondary to-accent"></div>

                                    <div className="p-6 md:p-8">
                                        <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-0">
                                            {/* Left: Trip Info */}
                                            <div className="flex-1 space-y-6">
                                                <div className="flex items-start gap-4">
                                                    <div className="p-3 bg-gradient-to-br from-primary/5 to-neutral/10 rounded-2xl text-primary">
                                                        <Plane className="w-6 h-6 rotate-45" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-1">
                                                            <h3 className="font-black text-2xl text-primary">
                                                                {trip.from_city}
                                                            </h3>
                                                            <ArrowRight className="w-5 h-5 text-accent/60" />
                                                            <h3 className="font-black text-2xl text-primary">
                                                                {trip.to_city}
                                                            </h3>
                                                        </div>
                                                        <p className="text-sm font-medium text-primary/50 flex items-center gap-2">
                                                            <span className="b">{trip.airline}</span>
                                                            <span className="w-1 h-1 bg-primary/30 rounded-full"></span>
                                                            <span className="font-mono bg-neutral/10 px-1.5 rounded text-primary/70">{trip.flight_number}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-4">
                                                    <div className="flex items-center gap-2.5 px-4 py-2 bg-neutral/5 rounded-xl border border-neutral/10">
                                                        <Calendar className="w-4 h-4 text-accent" />
                                                        <span className="text-sm font-semibold text-primary/80">
                                                            {new Date(trip.travel_date).toLocaleDateString(undefined, {
                                                                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2.5 px-4 py-2 bg-neutral/5 rounded-xl border border-neutral/10">
                                                        <Clock className="w-4 h-4 text-accent" />
                                                        <span className="text-sm font-semibold text-primary/80">
                                                            {trip.departure_time.slice(0, 5)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Actions & Status */}
                                            <div className="flex md:flex-col justify-between items-end gap-4 min-w-[140px]">
                                                <span className={cn(
                                                    "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider",
                                                    trip.status === 'active' ? 'bg-green-100 text-green-700' :
                                                        trip.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                            'bg-neutral/20 text-primary/60'
                                                )}>
                                                    {trip.status}
                                                </span>

                                                {trip.status === 'active' && (
                                                    <button
                                                        onClick={() => setActiveMatchTrip(activeMatchTrip === trip.id ? null : trip.id)}
                                                        className={cn(
                                                            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 border",
                                                            activeMatchTrip === trip.id
                                                                ? "bg-neutral/20 text-primary border-transparent"
                                                                : "border-primary text-primary hover:bg-primary hover:text-white"
                                                        )}
                                                    >
                                                        {activeMatchTrip === trip.id ? (
                                                            <>Close Matcher <X className="w-4 h-4" /></>
                                                        ) : (
                                                            <>Find Partner <Users className="w-4 h-4" /></>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Match Finder Section */}
                                        {activeMatchTrip === trip.id && (
                                            <MatchFinder trip={trip} onClose={() => setActiveMatchTrip(null)} />
                                        )}

                                        {/* Matches Section */}
                                        {trip.matches?.length > 0 && (
                                            <div className="mt-8 grid md:grid-cols-2 gap-6 pt-6 border-t border-dashed border-neutral/30">

                                                {/* Pending Matches */}
                                                {trip.matches.filter(m => m.status === 'pending' || m.status === 'requested').length > 0 && (
                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-bold text-primary/40 uppercase tracking-widest pl-1">Incoming Requests</h4>
                                                        {trip.matches
                                                            .filter(m => m.status === 'pending' || m.status === 'requested')
                                                            .map(match => (
                                                                <div key={match.id} className="flex items-center justify-between bg-neutral/5 p-3 rounded-xl border border-neutral/10">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                                                                            {match.user?.full_name?.[0] || "U"}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-sm text-primary">{match.user?.full_name || "Traveler"}</p>
                                                                            <p className="text-xs text-primary/50">Requested to join</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => handleRequestAction(match, 'accept')}
                                                                            className="p-2 bg-white text-green-600 rounded-lg shadow-sm hover:text-green-700 transition-colors"
                                                                        >
                                                                            <Check size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleRequestAction(match, 'reject')}
                                                                            className="p-2 bg-white text-red-600 rounded-lg shadow-sm hover:text-red-700 transition-colors"
                                                                        >
                                                                            <X size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                )}

                                                {/* Confirmed Matches */}
                                                {trip.matches.filter(m => m.status === 'accepted').length > 0 && (
                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-bold text-green-600/80 uppercase tracking-widest pl-1">Confirmed Partners</h4>
                                                        {trip.matches
                                                            .filter(m => m.status === 'accepted')
                                                            .map(match => (
                                                                <div key={match.id} className="flex items-center justify-between bg-green-50/50 p-3 rounded-xl border border-green-100">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm">
                                                                            {match.user?.full_name?.[0] || "P"}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-sm text-primary">{match.user?.full_name || "Partner"}</p>
                                                                            <p className="text-xs text-green-700 flex items-center gap-1 font-medium">
                                                                                <Smartphone size={12} /> Contact Shared
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleRequestAction(match, 'cancel')}
                                                                        className="px-3 py-1.5 bg-white text-red-500 text-xs font-bold border border-red-50 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* DEBUG SECTION - REMOVE BEFORE PRODUCTION */}
            <div className="fixed bottom-4 left-4 p-4 bg-black/80 text-white text-xs rounded-lg max-w-lg z-50 overflow-auto max-h-[300px]">
                <h3 className="font-bold border-b border-white/20 mb-2">Debug Info</h3>
                <div>Total Trips: {tripList.length}</div>
                <div>Incoming Requests: {incomingRequests.length}</div>
                <div>Sent Requests: {sentRequests.length}</div>
                <div className="mt-2">
                    <strong>Matches Found:</strong>
                    <pre>{JSON.stringify(tripList.map(t => ({
                        id: t.id,
                        matchesCount: t.matches?.length || 0,
                        matchIds: t.matches?.map(m => ({
                            id: m.id,
                            trip_id: m.trip_id,
                            matched_trip_id: m.matched_trip_id,
                            status: m.status
                        }))
                    })), null, 2)}</pre>
                </div>
            </div>
        </div>
    );
};
