// File: app/(pages)/groups/page.jsx (or wherever your GroupsPage is located)

"use client"

import * as React from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { GroupsHeader } from "@/components/groups/GroupsHeader"
import { GroupsSection } from "@/components/groups/GroupsSection"
import { GroupCard } from "@/components/groups/GroupCard"
import { useNavigate } from "react-router-dom"
import {
  useGetCommunitiesQuery,
  useGetCommunityByIdQuery,
  useJoinCommunityMutation,
  useLeaveCommunityMutation
} from "@/store/api/hostApi"
import { Users, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function GroupsPage() {
  const navigate = useNavigate()
  const [joiningId, setJoiningId] = React.useState(null) // Tracks which card is loading

  // API hooks
  const { data: communities, isLoading, error, refetch: refetchList } = useGetCommunitiesQuery();


  // --- Handlers for joining/leaving from the LIST view ---
  const handleJoinFromList = async (communityId) => {
    setJoiningId(communityId);
    try {
      await joinCommunity(communityId).unwrap();
      toast.success("Successfully joined the community!");
      refetchList(); // Refresh the list to show updated status
    } catch (err) {
      toast.error(err.data?.message || "Failed to join community");
    } finally {
      setJoiningId(null);
    }
  };

  const handleLeaveFromList = async (communityId) => {
    setJoiningId(communityId);
    try {
      await leaveCommunity(communityId).unwrap();
      toast.success("Successfully left the community!");
      refetchList();
    } catch (err) {
      toast.error(err.data?.message || "Failed to leave community");
    } finally {
      setJoiningId(null);
    }
  };

  // --- Loading and Error States for the main page ---
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background pt-20">
        <Navbar />
        <div className="flex justify-center items-center h-96">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#C93A30] mb-4" />
            <p className="text-gray-500">Loading communities...</p>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background pt-20">
        <Navbar />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <p className="text-red-500 mb-4">Error loading communities: {error.error || error.data?.message || "Unknown error"}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#C93A30] text-white rounded-lg hover:bg-[#B82E28]">Try Again</button>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  // --- Categorize communities for display ---
  const cityGroups = communities?.filter(community => community.city) || [];
  const countryGroups = communities?.filter(community => community.country && !community.city) || [];
  const purposeGroups = communities?.filter(community => community.topics && community.topics.length > 0) || [];
  const trendingGroups = communities?.slice(0, 3) || [];
  const recommendedGroups = communities?.slice(0, 3) || [];

  return (
    <main className="min-h-screen bg-background pt-20">
      <Navbar />

      {/* Header Section */}
      <div className="bg-[#F1E7D6] pt-12 pb-8 border-b border-[#E6E6E6]">
        <div className="container mx-auto px-4">
          <GroupsHeader />
        </div>
      </div>

      {/* Banner Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="relative rounded-2xl overflow-hidden bg-[#07182A] text-white p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-lg">
          <div className="relative z-10 max-w-xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Find your community anywhere in the world</h2>
            <p className="text-lg text-gray-300 mb-6">Connect with people who share your interests, background, or destination.</p>
            <div className="flex -space-x-4">
              {[1, 2, 3, 4, 5].map((i) => (<div key={i} className="w-10 h-10 rounded-full border-2 border-[#07182A] bg-gray-200 flex items-center justify-center text-[#07182A] font-bold text-xs">U{i}</div>))}
              <div className="w-10 h-10 rounded-full border-2 border-[#07182A] bg-[#C93A30] flex items-center justify-center text-white font-bold text-xs">+2k</div>
            </div>
          </div>
          <div className="relative z-10"><Users className="h-32 w-32 text-white/20" /></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C93A30]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
      </section>

      {/* Community Sections */}
      <GroupsSection title="City-Based Groups" className="bg-white">
        {cityGroups.length > 0 ? (
          cityGroups.map((group) => (
            <GroupCard
              key={String(group.id || group._id)}
              type="city"
              data={group}
              onJoin={() => handleJoinFromList(group.id)}
              onLeave={() => handleLeaveFromList(group.id)}
              isJoining={joiningId === group.id}
              onCardClick={() => navigate(`/groups/${group.id}`)}
            />
          ))
        ) : <div className="w-full text-center py-8 text-gray-500">No city groups found</div>}
      </GroupsSection>

      <GroupsSection title="Topic-Based Groups" className="bg-[#F1E7D6]">
        {purposeGroups.length > 0 ? (
          purposeGroups.map((group) => (
            <GroupCard
              key={String(group.id || group._id)}
              type="purpose"
              data={group}
              onJoin={() => handleJoinFromList(group.id)}
              onLeave={() => handleLeaveFromList(group.id)}
              isJoining={joiningId === group.id}
              onCardClick={() => navigate(`/groups/${group.id}`)}
            />
          ))
        ) : <div className="w-full text-center py-8 text-gray-500">No topic-based groups found</div>}
      </GroupsSection>

      <GroupsSection title="Trending Now" className="bg-white">
        {trendingGroups.length > 0 ? (
          trendingGroups.map((group) => (
            <GroupCard
              key={String(group.id || group._id)}
              type="trending"
              data={group}
              onJoin={() => handleJoinFromList(group.id)}
              onLeave={() => handleLeaveFromList(group.id)}
              isJoining={joiningId === group.id}
              onCardClick={() => navigate(`/groups/${group.id}`)}
            />
          ))
        ) : <div className="w-full text-center py-8 text-gray-500">No trending groups found</div>}
      </GroupsSection>

      <GroupsSection title="Recommended for You" className="bg-[#F1E7D6] mb-12">
        {recommendedGroups.length > 0 ? (
          recommendedGroups.map((group) => (
            <GroupCard
              key={String(group.id || group._id)}
              type="recommended"
              data={group}
              onJoin={() => handleJoinFromList(group.id)}
              onLeave={() => handleLeaveFromList(group.id)}
              isJoining={joiningId === group.id}
              onCardClick={() => navigate(`/groups/${group.id}`)}
            />
          ))
        ) : <div className="w-full text-center py-8 text-gray-500">No recommended groups found</div>}
      </GroupsSection>

      <Footer />

      {/* The Modal receives the unwrapped data and loading/error states */}

    </main>
  )
}