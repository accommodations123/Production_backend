"use client"

import React, { useState } from 'react';
import {
  Plane, Globe, Shield, ShieldCheck, Sparkles, MessageCircle,
  MapPin, Users, Calendar, Star, UsersIcon, ShoppingBag,
  Clock, Package, Home, TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';

// API Hooks
import {
  useGetApprovedPropertiesQuery,
  useGetApprovedEventsQuery,
  useGetCommunitiesQuery,
  useGetBuySellListingsQuery
} from '@/store/api/hostApi';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Refactored Child Components
import { SectionHeader } from './featured/SectionHeader.jsx';
import { PropertyCard } from './featured/PropertyCard.jsx';
import { TravelPlanCard } from './featured/TravelPlanCard.jsx';
import { EventCard } from './featured/EventCard.jsx';
import { CommunityGroupCard } from './featured/CommunityGroupCard.jsx';
import { ProductCard } from '../marketplace/ProductCard.jsx';
import { TravelCommunity } from '../dashboard/TravelCommunity';
import {
  TRAVEL_PLANS, SAFETY_TIPS, FEATURE_CARDS, QUICK_STATS, COMMUNITY_SHARES
} from './featured/HomeFeaturedConstants.jsx';

// Simple inline Skeleton component
const Skeleton = ({ className = "", ...props }) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-md ${className}`}
      {...props}
    />
  );
};

const CardContainer = ({ children, linkTo, className = "" }) => (
  <Link to={linkTo} className="group block h-full" aria-label="View details">
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl hover:border-accent/30 transition-all duration-300 h-full flex flex-col ${className}`}>
      {children}
    </div>
  </Link>
);

const HomeFeatured = () => {
  const { data: approvedProperties, isLoading: propertiesLoading, error: propertiesError } = useGetApprovedPropertiesQuery();
  const { data: approvedEvents, isLoading: eventsLoading, error: eventsError } = useGetApprovedEventsQuery();
  const { data: communities, isLoading: communitiesLoading } = useGetCommunitiesQuery();
  const { data: marketplaceItems, isLoading: marketplaceLoading } = useGetBuySellListingsQuery();

  const [travelSearchTerm, setTravelSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  const handleViewDetails = (eventId) => {
    window.location.href = `/events/${eventId}`;
  };

  const filteredTravelPlans = TRAVEL_PLANS.filter(plan =>
    plan.destination.toLowerCase().includes(travelSearchTerm.toLowerCase()) ||
    plan.type.toLowerCase().includes(travelSearchTerm.toLowerCase()) ||
    plan.user.name.toLowerCase().includes(travelSearchTerm.toLowerCase())
  );

  // Removed top-level error blocking to allow partial content rendering

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-12">

        {/* Community Stays Section */}
        <section aria-labelledby="community-properties-title">
          <SectionHeader
            title="Community Stays"
            subtitle="Verified homes with Indian hosts and cultural amenities"
            linkText="View All Stays"
            linkTo="/search"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {propertiesLoading ? (
              [1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-[400px]" />)
            ) : propertiesError ? (
              <div className="col-span-full py-12 text-center bg-red-50 rounded-xl border border-red-100 text-red-600">
                <p className="font-semibold">Unable to load stays momentarily.</p>
                <p className="text-sm opacity-80 mt-1">Please try again later.</p>
              </div>
            ) : approvedProperties && approvedProperties.length > 0 ? (
              approvedProperties.filter(Boolean).slice(0, 4).map((property) => (
                <PropertyCard key={property.id || property._id} property={property} />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                No community stays available at the moment.
              </div>
            )}
          </div>
        </section>

        {/* Travel Community Section */}
        <section className="mt-16">
          {/* Using the modular TravelCommunity component as requested */}
          <TravelCommunity onConnect={() => window.location.href = '/search'} />
        </section>

        {/* Community Groups Section */}
        <section className="mt-16">
          <SectionHeader
            title="Community Groups"
            subtitle="Connect with fellow Indians based on interests, locations, and professions"
            linkText="Explore All Groups"
            linkTo="/groups"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {communitiesLoading ? (
              [1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-[360px]" />)
            ) : communities && communities.length > 0 ? (
              communities.filter(Boolean).slice(0, 4).map((group) => <CommunityGroupCard key={group.id || group._id} group={group} />)
            ) : (
              <div className="col-span-4 text-center py-16 text-gray-500">No community groups found.</div>
            )}
          </div>
        </section>

        {/* Community Events Section */}
        <section className="mt-16">
          <SectionHeader
            title="Community Events"
            subtitle="Cultural festivals, networking meetups, and community gatherings"
            linkText="View All Events"
            linkTo="/events"
          />
          {/* Debug Dump */}

          <div className="flex justify-end mb-4 gap-2">
            <Button onClick={() => setViewMode("grid")} variant={viewMode === "grid" ? "default" : "outline"} size="sm">Grid</Button>
            <Button onClick={() => setViewMode("list")} variant={viewMode === "list" ? "default" : "outline"} size="sm">List</Button>
          </div>
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" : "space-y-4"}>
            {eventsLoading ? (
              [1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-[400px]" />)
            ) : eventsError ? (
              <div className="col-span-full py-12 text-center bg-red-50 rounded-xl border border-red-100 text-red-600">
                <p className="font-semibold">Unable to load events momentarily.</p>
                <p className="text-sm opacity-80 mt-1">Please try again later.</p>
              </div>
            ) : approvedEvents && approvedEvents.length > 0 ? (
              approvedEvents.filter(Boolean).slice(0, 4).map((event) => (
                <EventCard
                  key={event.id || event._id}
                  event={event}
                  viewMode={viewMode}
                  onViewDetails={handleViewDetails}
                />
              ))
            ) : (
              <div className="col-span-4 text-center py-16 text-gray-500">No upcoming events found.</div>
            )}
          </div>
        </section>

        {/* Community Sharing Section */}
        <section className="mt-16">
          <SectionHeader
            title="Community Sharing"
            subtitle="Share and exchange trusted items within the community worldwide"
            linkText="Browse Community Shares"
            linkTo="/marketplace"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {marketplaceLoading ? (
              [1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-[300px]" />)
            ) : marketplaceItems && marketplaceItems.length > 0 ? (
              marketplaceItems.filter(Boolean).slice(0, 4).map((item) => (
                <ProductCard
                  key={item.id || item._id}
                  product={item}
                  onClick={(product) => window.location.href = `/marketplace/${product.id || product._id}`}
                />
              ))
            ) : (
              <div className="col-span-4 text-center py-16 text-gray-500">No items found in community sharing.</div>
            )}
          </div>
        </section>

        {/* Features & Safety Section */}
        <section className="mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-gradient-to-br from-[#01172d] to-[#02305d] rounded-2xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-8 text-center">Complete Community Platform</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {FEATURE_CARDS.map((card, idx) => (
                  <div key={idx} className="text-center">
                    <div className="w-12 h-12 mx-auto bg-white/10 rounded-xl flex items-center justify-center mb-3 text-accent">{card.icon}</div>
                    <div className="font-bold text-xl">{card.stats}</div>
                    <div className="text-sm font-semibold">{card.title}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border p-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="h-6 w-6 text-accent" />
                <h3 className="font-bold text-xl">Community Safety</h3>
              </div>
              <div className="space-y-4">
                {SAFETY_TIPS.map((tip) => (
                  <div key={tip.id}>
                    <h4 className="font-bold text-sm mb-1">{tip.title}</h4>
                    <p className="text-xs text-gray-600">{tip.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-20 text-center bg-blue-50 rounded-2xl p-10 py-16">
          <h2 className="text-3xl font-bold mb-4">Ready to Join Our Community?</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">Start your journey with thousands of community members worldwide.</p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="rounded-full px-8">Join Now</Button>
            <Button variant="outline" size="lg" className="rounded-full px-8">Learn More</Button>
          </div>
        </section>

      </div>
    </div>
  );
};

export default HomeFeatured;