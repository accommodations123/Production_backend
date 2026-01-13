"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Navbar } from "../../components/layout/Navbar";
import { useGetHostProfileQuery, useUpdateHostMutation } from "@/store/api/hostApi";
import { Sidebar } from "@/components/account-v2/Sidebar";
import { ProfileCard } from "@/components/account-v2/ProfileCard";
import { InfoCard } from "@/components/account-v2/InfoCard";
import { ContactsWidget, CommunitiesWidget } from "@/components/account-v2/Widgets";
import { FeedInput } from "@/components/account-v2/FeedInput";
import { MyListings } from "@/components/dashboard/MyListings";
import { Settings } from "@/components/dashboard/Settings";
import { PersonalInfo } from "@/components/dashboard/PersonalInfo";
import { Trips } from "@/components/dashboard/Trips";

export default function NewDashboard() {
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [updateMessage, setUpdateMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(Date.now());

  const [updateHost, { isLoading }] = useUpdateHostMutation();

  /* =========================
     Load user from localStorage
  ========================= */
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

  /* =========================
     Fetch host profile
  ========================= */
  const { data: hostProfile, refetch } = useGetHostProfileQuery(undefined, {
    skip: !userData
  });

  const currentUser = useMemo(() => {
    // Debugging: Check if backend is returning stale data
    if (hostProfile && userData) {
      console.log("🔍 Data Check:", {
        Local: userData.full_name,
        Backend: hostProfile.full_name,
        LocalImg: userData.profile_image,
        BackendImg: hostProfile.profile_image
      });
    }

    return {
      ...userData,
      ...hostProfile,
      profile_image: hostProfile?.profile_image
        ? `${hostProfile.profile_image}?v=${refreshKey}`
        : userData?.profile_image
    }
  }, [userData, hostProfile, refreshKey]);

  /* =========================
     Update handler
  ========================= */
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

      setRefreshKey(Date.now()); // Update image cache

      const updatedUser = {
        ...userData,
        ...host,
        profile_image: user?.profile_image ? `${user.profile_image}?v=${Date.now()}` : userData.profile_image,
        name: host.full_name || userData.name,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUserData(updatedUser);

      await refetch(); // ✅ THIS FIXES IT

    } catch (e) {
      console.error(e);
    }
  };


  /* =========================
     Render Tabs
  ========================= */
  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4 space-y-4">
              <ProfileCard
                user={currentUser}
                onUpdate={handleUpdatePersonalInfo}
                isLoading={isLoading}
              />
              <ContactsWidget />
              <CommunitiesWidget />
            </div>

            <div className="md:col-span-8 space-y-4">
              <InfoCard user={currentUser} />
              <FeedInput />
            </div>
          </div>
        );

      case "personal":
        return (
          <div className="bg-white rounded-lg border">
            {updateMessage && (
              <div className="p-4 text-sm text-blue-700 bg-blue-50">
                {updateMessage}
              </div>
            )}
            <PersonalInfo
              initialData={currentUser}
              onUpdate={handleUpdatePersonalInfo}
              isLoading={isLoading}
            />
          </div>
        );

      case "listings":
        return <MyListings />;

      case "trips":
        return <Trips />;

      case "settings":
        return <Settings />;

      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-[#edf0f5] font-inter">
      <Navbar />

      <div className="container mx-auto pt-24 px-4 pb-8">
        <div className="flex gap-4">
          <div className="w-64 hidden md:block">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
          <div className="flex-1">{renderContent()}</div>
        </div>
      </div>
    </main>
  );
}
