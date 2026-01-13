
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Calendar,
  Plane,
  Phone,
  Mail,
  MessageCircle,
  Globe,
  Clock,
  X,
  User,
  Search,
  Filter,
  Star,
  Shield,
  ChevronRight,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import {
  useGetPublicTripsQuery,
  useGetPublicTripQuery,
  useLazyGetPublicSearchTripsQuery,
  useGetMyTripsQuery,
  useTravelMatchActionMutation,
  useCreateTripMutation
} from "@/store/api/authApi";

/* ===================== POST TRIP MODAL ===================== */
function PostTripModal({ onClose, onAdd }) {
  const [createTrip, { isLoading }] = useCreateTripMutation();
  const [formData, setFormData] = useState({
    from_country: "",
    from_state: "",
    from_city: "",
    to_country: "",
    to_city: "",
    travel_date: "",
    departure_time: "",
    arrival_date: "",
    arrival_time: "",
    airline: "",
    flight_number: ""
  });
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMsg) setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await createTrip(formData).unwrap();
      if (res.success) {
        alert("Trip posted successfully!");
        onAdd && onAdd(res.trip);
        onClose();
      }
    } catch (err) {
      console.error("Failed to create trip", err);
      // Backend returns 403 or 400 with a message
      setErrorMsg(err?.data?.message || "Error posting trip. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="bg-[#07182A] p-6 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">Post a Trip</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Origin */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 border-b pb-1">Origin</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Country *</label>
                <input name="from_country" required placeholder="e.g. India" className="w-full border p-2 rounded-lg" onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">City *</label>
                <input name="from_city" required placeholder="e.g. Bangalore" className="w-full border p-2 rounded-lg" onChange={handleChange} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase">State (Optional)</label>
              <input name="from_state" placeholder="e.g. Karnataka" className="w-full border p-2 rounded-lg" onChange={handleChange} />
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 border-b pb-1">Destination</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Country *</label>
                <input name="to_country" required placeholder="e.g. USA" className="w-full border p-2 rounded-lg" onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">City *</label>
                <input name="to_city" required placeholder="e.g. New York" className="w-full border p-2 rounded-lg" onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 border-b pb-1">Schedule</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Departure Date *</label>
                <input type="date" name="travel_date" required className="w-full border p-2 rounded-lg" onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Departure Time *</label>
                <input type="time" name="departure_time" required className="w-full border p-2 rounded-lg" onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Arrival Date</label>
                <input type="date" name="arrival_date" className="w-full border p-2 rounded-lg" onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Arrival Time</label>
                <input type="time" name="arrival_time" className="w-full border p-2 rounded-lg" onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Flight Info */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 border-b pb-1">Flight Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Airline</label>
                <input name="airline" placeholder="e.g. Delta" className="w-full border p-2 rounded-lg" onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Flight Number</label>
                <input name="flight_number" placeholder="e.g. DL123" className="w-full border p-2 rounded-lg" onChange={handleChange} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-[#C93A30] text-white py-3 rounded-lg font-bold hover:bg-[#a82f26] transition-colors mt-4">
            {isLoading ? "Posting..." : "Post Trip"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

/* ===================== TRIP DETAILS MODAL ===================== */
function TripDetailsModal({ tripId, onClose }) {
  const { data: tripData, isLoading, error } = useGetPublicTripQuery(tripId, {
    skip: !tripId
  });
  const { data: myTripsData } = useGetMyTripsQuery();
  const [sendAction, { isLoading: isActionLoading }] = useTravelMatchActionMutation();
  const [selectedMyTripId, setSelectedMyTripId] = useState("");

  const myActiveTrips = myTripsData?.trips?.filter(t => t.status === 'active') || [];

  // Auto-select first trip if available and not set
  useEffect(() => {
    if (myActiveTrips.length > 0 && !selectedMyTripId) {
      setSelectedMyTripId(myActiveTrips[0].id);
    }
  }, [myActiveTrips, selectedMyTripId]);

  const handleRequest = async () => {
    if (!selectedMyTripId) {
      alert("You need an active trip to send a request.");
      return;
    }

    try {
      const res = await sendAction({
        trip_id: selectedMyTripId,
        matched_trip_id: tripId,
        action: 'request'
      }).unwrap();

      if (res.success) {
        alert("Request sent successfully!");
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert(err?.data?.message || "Failed to send request.");
    }
  };

  if (!tripId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-10 flex justify-center text-primary">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : error ? (
            <div className="p-10 text-center text-red-500">
              <p>Failed to load trip details.</p>
              <button onClick={onClose} className="mt-4 text-primary underline">Close</button>
            </div>
          ) : tripData?.trip ? (
            <div>
              <div className="bg-linear-to-r from-[#07182A] to-[#0a2540] p-6 text-white flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    {tripData.trip.to_city}, {tripData.trip.to_country}
                  </h2>
                  <p className="text-gray-300 text-sm mt-1">
                    From {tripData.trip.from_city}, {tripData.trip.from_country}
                  </p>
                </div>
                <button onClick={onClose} className="text-white/80 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Host Info */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl">
                    {/* Placeholder generic avatar if no image returning from details API yet */}
                    {tripData.trip.host?.profile_image ? (
                      <img
                        src={tripData.trip.host.profile_image}
                        alt={tripData.trip.host.full_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : "👤"}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[#07182A]">{tripData.trip.host?.full_name || "Traveler"}</h3>
                    <p className="text-sm text-gray-500">{tripData.trip.host?.city}, {tripData.trip.host?.country}</p>
                  </div>
                </div>

                {/* Flight Details */}
                <div>
                  <h3 className="text-lg font-bold text-[#07182A] mb-3 flex items-center gap-2">
                    <Plane size={18} /> Flight Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 border rounded-lg">
                      <span className="block text-gray-500 text-xs">Airline</span>
                      <span className="font-medium text-[#07182A]">{tripData.trip.airline || "N/A"}</span>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <span className="block text-gray-500 text-xs">Flight No</span>
                      <span className="font-medium text-[#07182A]">{tripData.trip.flight_number || "N/A"}</span>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <span className="block text-gray-500 text-xs">Departure</span>
                      <span className="font-medium text-[#07182A]">
                        {new Date(tripData.trip.travel_date).toLocaleDateString()} at {tripData.trip.departure_time?.slice(0, 5)}
                      </span>
                    </div>
                    {tripData.trip.arrival_date && (
                      <div className="p-3 border rounded-lg">
                        <span className="block text-gray-500 text-xs">Arrival</span>
                        <span className="font-medium text-[#07182A]">
                          {new Date(tripData.trip.arrival_date).toLocaleDateString()} {tripData.trip.arrival_time ? `at ${tripData.trip.arrival_time?.slice(0, 5)}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Section */}
                <div className="pt-4 border-t">
                  {myActiveTrips.length > 0 ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Connect via your trip:</label>
                        <select
                          className="w-full p-2 border rounded-lg text-sm bg-white"
                          value={selectedMyTripId}
                          onChange={(e) => setSelectedMyTripId(e.target.value)}
                        >
                          {myActiveTrips.map(trip => (
                            <option key={trip.id} value={trip.id}>
                              {trip.to_city} ({new Date(trip.travel_date).toLocaleDateString()})
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleRequest}
                        disabled={isActionLoading}
                        className="w-full bg-[#07182A] text-white py-3 rounded-lg font-medium hover:bg-[#0a2540] transition-colors flex justify-center items-center gap-2"
                      >
                        {isActionLoading ? <div className="animate-spin w-4 h-4 border-2 border-white/50 border-t-white rounded-full"></div> : null}
                        Request
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 text-sm">
                      <p className="mb-2">You need an active trip to send requests.</p>
                      <button
                        onClick={() => { onClose(); /* Logic to open Create Modal could go here */ }}
                        className="text-[#07182A] font-medium underline"
                      >
                        Close & Create a Trip
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ===================== PAGE ===================== */
export default function TravelPage() {
  const { data: publicTrips, isLoading: isPublicLoading } = useGetPublicTripsQuery({});
  const [triggerSearch, { data: searchResults, isLoading: isSearchLoading }] = useLazyGetPublicSearchTripsQuery();

  const [plans, setPlans] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);

  // Search State
  const [searchParams, setSearchParams] = useState({
    from_country: "",
    to_country: "",
    date: ""
  });

  const isLoading = isPublicLoading || isSearchLoading;

  // Helper to map API trip data to UI plan format
  const mapTripToPlan = (trip) => ({
    id: trip.id,
    user: {
      fullName: trip.host?.full_name || "Traveler",
      age: trip.host?.age || "N/A",
      gender: trip.host?.gender || "N/A",
      country: trip.host?.country || "",
      state: "",
      city: trip.host?.city || "",
      languages: [],
      phone: "",
      email: "",
      whatsapp: "",
      image: trip.host?.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trip.host?.full_name || "Traveler"}`,
    },
    destination: `${trip.to_city}, ${trip.to_country}`,
    date: trip.travel_date,
    time: trip.departure_time || "00:00",
    flight: {
      airline: trip.airline || "Airline",
      flightName: "",
      flightNumber: trip.flight_number || "",
      from: `${trip.from_city} (${trip.from_country})`,
      to: `${trip.to_city} (${trip.to_country})`,
      departureDate: trip.travel_date,
      departureTime: trip.departure_time,
      arrivalDate: trip.arrival_date || "",
      arrivalTime: trip.arrival_time || "",
      stops: [],
    },
  });

  // Determine which data to show
  useEffect(() => {
    // If we have search results, use them. Otherwise use public trips.
    const sourceData = searchResults?.results || publicTrips?.results;

    if (sourceData) {
      const mappedPlans = sourceData.map(mapTripToPlan);
      setPlans(mappedPlans);
    }
  }, [publicTrips, searchResults]);

  const handleSearch = () => {
    if (searchParams.from_country && searchParams.to_country && searchParams.date) {
      triggerSearch(searchParams);
    } else {
      // Ideally show a toast or error, but for now we rely on required inputs
      alert("Please fill in all search fields: From Country, To Country, and Date.");
    }
  };

  const handleAddTrip = (newTrip) => {
    // We attempt to map the new trip. 
    // Note: newTrip from createTrip response might lack the 'host' object initially, 
    // so properties will fall back to defaults until a fresh fetch occurs.
    const mappedTrip = mapTripToPlan(newTrip);
    setPlans((prev) => [mappedTrip, ...prev]);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ================= HERO SECTION ================= */}
      <section
        className="relative min-h-[50vh] flex items-center bg-cover bg-center overflow-hidden"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80')",
        }}
      >
        <div className="absolute inset-0 bg-linear-to-r from-black/80 to-black/40"></div>

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-[#C93A30]/20 rounded-full filter blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full filter blur-3xl"
            animate={{
              x: [0, -100, 0],
              y: [0, 50, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
        </div>

        <div className="relative z-10 container mx-auto px-6 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl text-white"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Find Your <span className="text-[#C93A30]">Travel Buddy</span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-lg text-gray-200 mb-6"
            >
              Share flight details, connect with travelers, and explore the
              world together with confidence.
            </motion.p>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowModal(true)}
              className="bg-[#C93A30] hover:bg-[#a82f26] text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-xl"
            >
              <Plane size={18} /> Post a Trip
            </motion.button>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronRight className="rotate-90" size={24} />
        </motion.div>
      </section>

      {/* ================= SEARCH AND FILTER SECTION ================= */}
      <section className="sticky top-0 z-40 bg-white text-gray-900 shadow-md py-4 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row gap-4 items-end bg-white p-2 rounded-xl">
            {/* From Country */}
            <div className="w-full">
              <label className="text-xs font-semibold text-gray-500 mb-1 ml-1 block">From Country</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="e.g. India"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#07182A]/50 text-gray-800"
                  value={searchParams.from_country}
                  onChange={(e) => setSearchParams({ ...searchParams, from_country: e.target.value })}
                />
              </div>
            </div>

            {/* To Country */}
            <div className="w-full">
              <label className="text-xs font-semibold text-gray-500 mb-1 ml-1 block">To Country</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="e.g. USA"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#07182A]/50 text-gray-800"
                  value={searchParams.to_country}
                  onChange={(e) => setSearchParams({ ...searchParams, to_country: e.target.value })}
                />
              </div>
            </div>

            {/* Date */}
            <div className="w-full">
              <label className="text-xs font-semibold text-gray-500 mb-1 ml-1 block">Travel Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="date"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#07182A]/50 text-gray-800"
                  value={searchParams.date}
                  onChange={(e) => setSearchParams({ ...searchParams, date: e.target.value })}
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSearch}
              className="w-full lg:w-auto px-6 py-2.5 bg-[#07182A] text-white font-medium rounded-lg hover:bg-[#0a2540] transition-colors flex items-center justify-center gap-2"
            >
              <Search size={18} />
              Search
            </motion.button>
          </div>
        </div>
      </section>

      {/* ================= CONTENT ================= */}
      <section className="px-4 py-10" id="travel-cards">
        <div className="container mx-auto">
          {isLoading ? (
            <div className="text-center py-20">Loading trips...</div>
          ) : plans.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Plane size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No travel plans found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your search or post a new travel plan</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(true)}
                className="bg-[#C93A30] hover:bg-[#a82f26] text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto"
              >
                <Plane size={18} /> Post a Trip
              </motion.button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{ y: -5 }}
                  onClick={() => setSelectedTripId(plan.id)}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer"
                >
                  {/* Card Header with Image */}
                  <div className="relative h-48 bg-linear-to-br from-[#07182A] to-[#0a2540]">
                    <div className="absolute inset-0 bg-black/20"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-xl font-bold text-white">{plan.destination}</h3>
                      <p className="text-gray-200 text-sm">{plan.flight.from} → {plan.flight.to}</p>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="p-6">
                    <div className="flex items-center text-career-primary gap-4 mb-4">
                      <img
                        src={plan.user.image}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                        alt={plan.user.fullName}
                      />
                      <div>
                        <h3 className="font-bold text-lg">{plan.user.fullName}</h3>
                        <p className="text-sm text-gray-600">
                          {plan.user.age} years, {plan.user.gender}
                        </p>
                        <p className="text-sm text-gray-600">
                          {plan.user.city}, {plan.user.state}
                        </p>
                      </div>
                    </div>

                    {/* Trip Details */}
                    <div className="space-y-3 text-gray-900 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-[#C93A30]" />
                        <span>Departure: {new Date(plan.date).toLocaleDateString()} at {plan.time?.slice(0, 5)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Plane size={16} className="text-[#C93A30]" />
                        <span>{plan.flight.airline} ({plan.flight.flightNumber})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-[#C93A30]" />
                        <span>{plan.flight.from} → {plan.flight.to}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 pt-4 border-t flex justify-between gap-2">
                      <div className="text-center w-full text-sm text-gray-500 font-medium">
                        Click to view details
                      </div>
                    </div>

                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* MODAL - POST TRIP */}
      <AnimatePresence>
        {showModal && (
          <PostTripModal onClose={() => setShowModal(false)} onAdd={handleAddTrip} />
        )}
      </AnimatePresence>

      {/* MODAL - TRIP DETAILS */}
      <TripDetailsModal tripId={selectedTripId} onClose={() => setSelectedTripId(null)} />
    </main>
  );
}

/* ===================== TAILWIND HELPER ===================== */
/*
.form-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm
         focus:border-[#07182A] focus:ring-2 focus:ring-[#07182A]/30
         outline-none transition-all;
}
*/