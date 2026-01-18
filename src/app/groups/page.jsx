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
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeFilter, setActiveFilter] = React.useState("All")

  // API hooks
  const { data: communities, isLoading, error, refetch: refetchList } = useGetCommunitiesQuery();

  // --- Filter Logic ---
  const filteredCommunities = React.useMemo(() => {
    if (!communities) return [];

    return communities.filter(community => {
      // 1. Search Query Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = community.name?.toLowerCase().includes(query);
        const matchCity = community.city?.toLowerCase().includes(query);
        const matchCountry = community.country?.toLowerCase().includes(query);
        const matchDesc = community.description?.toLowerCase().includes(query);

        if (!matchName && !matchCity && !matchCountry && !matchDesc) return false;
      }

      // 2. Category Filter (Simple mapping based on FILTERS in Header)
      if (activeFilter !== "All") {
        // This assumes 'topics' or other fields map to these filters.
        // Adjust logic based on actual data structure if needed.
        // For now, let's assume simple string matching or exact types if available.
        // If "Cities" -> has city
        if (activeFilter === "Cities" && !community.city) return false;
        if (activeFilter === "Countries" && !community.country) return false;
        // For others (Students, Workers etc), checking topics
        if (["Students", "Workers", "Visa & Immigration", "Accommodation Help", "Buy/Sell", "Women-only"].includes(activeFilter)) {
          return community.topics?.includes(activeFilter) || community.category === activeFilter;
        }
      }

      return true;
    });
  }, [communities, searchQuery, activeFilter]);

  // --- Categorize communities for display using FILTERED list ---
  const cityGroups = filteredCommunities.filter(community => community.city);
  // Country groups: has country but NOT city (to avoid duplication if that's the intent, or just has country)
  // Original logic was !community.city, keeping that.
  const countryGroups = filteredCommunities.filter(community => community.country && !community.city);
  const purposeGroups = filteredCommunities.filter(community => community.topics && community.topics.length > 0);

  // Trending/Recommended: Just slice the filtered list for now as we don't have explicit flags
  const trendingGroups = filteredCommunities.slice(0, 3);
  const recommendedGroups = filteredCommunities.slice(0, 3);


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
  // --- Filter Logic ---
  // --- Categorize communities for display ---
  // (Logic moved up due to Hooks rules)

  return (
    <main className="min-h-screen bg-background pt-20">
      <Navbar />

      {/* Header Section */}
      <div className="bg-[#F1E7D6] pt-12 pb-8 border-b border-[#E6E6E6]">
        <div className="container mx-auto px-4">
          <GroupsHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
          />
        </div>
      </div>



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