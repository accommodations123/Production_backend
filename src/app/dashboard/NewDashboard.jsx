"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  User, Home, MapPin, Bell, LifeBuoy, Settings as SettingsIcon,
  Plane, Building2, Calendar, ArrowRight, Plus
} from 'lucide-react';
import { Navbar } from "../../components/layout/Navbar";
import { useGetHostProfileQuery, useUpdateHostMutation, useGetMyListingsQuery, useGetMyEventsQuery } from "@/store/api/hostApi";
import { useGetMyTripsQuery } from "@/store/api/authApi";
import { Sidebar } from "@/components/account-v2/Sidebar";
import { ProfileCard } from "@/components/account-v2/ProfileCard";
import { InfoCard } from "@/components/account-v2/InfoCard";
import { MyListings } from "@/components/dashboard/MyListings";
import { Settings } from "@/components/dashboard/Settings";
import { PersonalInfo } from "@/components/dashboard/PersonalInfo";
import { Trips } from "@/components/dashboard/Trips";
import { MyApplications } from "@/components/dashboard/MyApplications";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function NewDashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [updateMessage, setUpdateMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(Date.now());

  // Update activeTab if URL changes (e.g. navigation from navbar)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const [updateHost, { isLoading: isUpdating }] = useUpdateHostMutation();

  // Fetch real data from backend
  const { data: hostProfile, refetch } = useGetHostProfileQuery(undefined, { skip: !userData });
  const { data: listingsData } = useGetMyListingsQuery();
  const { data: eventsData } = useGetMyEventsQuery();
  const { data: tripsData } = useGetMyTripsQuery();

  // Derived counts from real data
  const propertiesCount = listingsData?.length || 0;
  const eventsCount = eventsData?.length || 0;
  const tripsCount = tripsData?.trips?.length || 0;
  const upcomingTrips = tripsData?.trips?.filter(t => new Date(t.travel_date) > new Date()) || [];

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return;

    try {
      const user = JSON.parse(stored);
      setUserData({
        ...user,
        name: user.full_name || user.name || "User",
        firstName: (user.full_name || user.name || "User").split(" ")[0]
      });
    } catch (err) {
      console.error("User parse error:", err);
    }
  }, []);

  const currentUser = useMemo(() => {
    const user = {
      ...userData,
      ...hostProfile,
      profile_image: hostProfile?.profile_image
        ? `${hostProfile.profile_image}?v=${refreshKey}`
        : userData?.profile_image
    };
    console.log("🔍 Dashboard: userData:", userData);
    console.log("🔍 Dashboard: hostProfile:", hostProfile);
    console.log("🔍 Dashboard: currentUser:", user);
    return user;
  }, [userData, hostProfile, refreshKey]);

  const handleUpdatePersonalInfo = async (payload) => {
    try {
      if (!hostProfile?.id) return;

      let fd;
      if (payload instanceof FormData) {
        fd = payload;
      } else {
        fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => v && fd.append(k, v));
      }

      const res = await updateHost({
        hostId: hostProfile.id,
        data: fd
      }).unwrap();

      if (!res?.success) return;

      const { host, user } = res.data;

      setRefreshKey(Date.now());

      const updatedUser = {
        ...userData,
        ...host,
        profile_image: user?.profile_image ? `${user.profile_image}?v=${Date.now()}` : userData.profile_image,
        name: host.full_name || userData.name,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUserData(updatedUser);

      await refetch();

    } catch (e) {
      console.error(e);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveTab('listings')}
                className="group cursor-pointer p-6 rounded-2xl bg-white border border-neutral/20 shadow-lg hover:shadow-xl hover:border-primary/20 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <Building2 className="w-6 h-6 text-primary group-hover:text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-4xl font-black text-primary">{propertiesCount}</p>
                <p className="text-sm text-primary/50 font-medium">Properties Listed</p>
              </div>

              <div
                onClick={() => setActiveTab('listings')}
                className="group cursor-pointer p-6 rounded-2xl bg-white border border-neutral/20 shadow-lg hover:shadow-xl hover:border-accent/20 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
                    <Calendar className="w-6 h-6 text-accent group-hover:text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary/30 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-4xl font-black text-primary">{eventsCount}</p>
                <p className="text-sm text-primary/50 font-medium">Experiences Hosted</p>
              </div>

              <div
                onClick={() => setActiveTab('trips')}
                className="group cursor-pointer p-6 rounded-2xl bg-white border border-neutral/20 shadow-lg hover:shadow-xl hover:border-secondary/20 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-colors">
                    <Plane className="w-6 h-6 text-secondary group-hover:text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary/30 group-hover:text-secondary group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-4xl font-black text-primary">{tripsCount}</p>
                <p className="text-sm text-primary/50 font-medium">Trips Planned</p>
              </div>
            </div>

            {/* Profile & Info Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-6">
                <ProfileCard
                  user={currentUser}
                  onUpdate={handleUpdatePersonalInfo}
                  isLoading={isUpdating}
                />
              </div>

              <div className="lg:col-span-7 space-y-6">
                <InfoCard user={currentUser} />

                {/* Upcoming Trips Preview */}
                {upcomingTrips.length > 0 && (
                  <div className="p-6 rounded-2xl bg-white border border-neutral/20 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-primary text-lg">Upcoming Trips</h3>
                      <button
                        onClick={() => setActiveTab('trips')}
                        className="text-sm text-accent font-semibold hover:underline"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-3">
                      {upcomingTrips.slice(0, 3).map((trip) => (
                        <div
                          key={trip.id}
                          className="flex items-center gap-4 p-4 rounded-xl bg-neutral/5 border border-neutral/10 hover:border-primary/20 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Plane className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-primary truncate">
                              {trip.from_city} → {trip.to_city}
                            </p>
                            <p className="text-xs text-primary/50">
                              {new Date(trip.travel_date).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                              })}
                            </p>
                          </div>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold uppercase",
                            trip.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-neutral/20 text-primary/60'
                          )}>
                            {trip.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => navigate('/host/create')}
                    className="group p-5 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-left hover:shadow-xl transition-all"
                  >
                    <Plus className="w-8 h-8 mb-3 opacity-80 group-hover:scale-110 transition-transform" />
                    <p className="font-bold">List a Property</p>
                    <p className="text-xs text-white/60">Share your space</p>
                  </button>
                  <button
                    onClick={() => navigate('/events/host')}
                    className="group p-5 rounded-2xl bg-gradient-to-br from-accent to-red-600 text-white text-left hover:shadow-xl transition-all"
                  >
                    <Plus className="w-8 h-8 mb-3 opacity-80 group-hover:scale-110 transition-transform" />
                    <p className="font-bold">Host Experience</p>
                    <p className="text-xs text-white/60">Create an event</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case "personal":
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            {updateMessage && (
              <div className="mb-6 p-4 text-sm text-accent bg-accent/10 rounded-xl border border-accent/20 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                {updateMessage}
              </div>
            )}
            <PersonalInfo
              initialData={currentUser}
              onUpdate={handleUpdatePersonalInfo}
              isUpdating={isUpdating}
              isHost={!!(hostProfile?.id || hostProfile?._id)}
            />
          </div>
        );

      case "listings":
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <MyListings />
          </div>
        );

      case "trips":
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <Trips />
          </div>
        );

      case "settings":
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <Settings />
          </div>
        );

      case "applications":
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <MyApplications />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FB] font-inter">
      <Navbar />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/[0.03] to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-accent/[0.03] to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto pt-24 px-4 pb-12 relative z-10">

        {/* Header */}
        {activeTab === 'overview' && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <p className="text-accent font-bold text-sm uppercase tracking-wider mb-1">Dashboard</p>
            <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight">
              Welcome, {currentUser?.firstName || 'User'}
            </h1>
            <p className="text-primary/50 mt-1">Manage your listings, trips, and profile.</p>
          </div>
        )}

        {/* Mobile Navigation - Sticky & Premium */}
        <div className="md:hidden sticky top-[60px] z-30 -mx-4 px-4 bg-[#F8F9FB]/95 backdrop-blur-xl border-b border-neutral/10 mb-6 py-3 transition-all">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'personal', label: 'Profile', icon: User },
              { id: 'listings', label: 'Listings', icon: Home },
              { id: 'applications', label: 'Applications', icon: MapPin },
              { id: 'trips', label: 'Trips', icon: MapPin },
              { id: 'settings', label: 'Settings', icon: SettingsIcon },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  // Scroll to top slightly to show context
                  window.scrollTo({ top: 100, behavior: 'smooth' });
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-bold transition-all shadow-sm",
                  activeTab === item.id
                    ? 'bg-[#00142E] text-white shadow-[#00142E]/20 ring-2 ring-[#00142E]/10'
                    : 'bg-white text-[#00142E]/60 border border-neutral/10 hover:bg-white/80'
                )}
              >
                <item.icon className={cn("w-4 h-4", activeTab === item.id ? "text-white" : "text-[#00142E]/40")} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 hidden md:block shrink-0">
            <div className="sticky top-24 space-y-6">
              <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

              {/* <div className="p-5 bg-gradient-to-br from-primary to-secondary rounded-2xl text-white">
                <LifeBuoy className="w-8 h-8 mb-3 opacity-80" />
                <h4 className="font-bold">Need Help?</h4>
                <p className="text-xs text-white/60 mb-3">Our team is here to assist you.</p>
                <button className="w-full py-2 bg-white text-primary text-sm font-bold rounded-lg hover:bg-neutral/90 transition-colors">
                  Contact Support
                </button>
              </div> */}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {renderContent()}
          </div>
        </div>
      </div>
    </main>
  );
}
