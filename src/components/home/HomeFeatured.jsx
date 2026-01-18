"use client"

import React, { useState } from 'react';
import {
  Shield, ShieldCheck, Sparkles, MapPin, Users, Calendar,
  ArrowRight, Heart, Globe, Star
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

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

// Child Components
import { SectionHeader } from './featured/SectionHeader.jsx';
import { PropertyCard } from './featured/PropertyCard.jsx';
import { EventCard } from './featured/EventCard.jsx';
import { CommunityGroupCard } from './featured/CommunityGroupCard.jsx';
import { ProductCard } from '../marketplace/ProductCard.jsx';
import { TravelCommunity } from '../dashboard/TravelCommunity';
import {
  SAFETY_TIPS, FEATURE_CARDS
} from './featured/HomeFeaturedConstants.jsx';

// Inline Skeleton
const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-neutral/10 rounded-2xl ${className}`} />
);

const HomeFeatured = () => {
  const navigate = useNavigate();
  const { data: approvedProperties, isLoading: propertiesLoading } = useGetApprovedPropertiesQuery();
  const { data: approvedEvents, isLoading: eventsLoading } = useGetApprovedEventsQuery();
  const { data: communities, isLoading: communitiesLoading } = useGetCommunitiesQuery();
  const { data: marketplaceItems, isLoading: marketplaceLoading } = useGetBuySellListingsQuery();

  const [viewMode, setViewMode] = useState("grid");

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 }
  };

  return (
    <div className="bg-white font-inter text-[#00142E]">

      {/* 1. Community Stays Section */}
      <section className="py-8 relative overflow-hidden">
        {/* Decorative Blob */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#CB2A25]/5 to-transparent rounded-full blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <SectionHeader
            title="Accommodations"
            subtitle="Explore verified homes with Indian hosts and cultural amenities."
            linkText="View All Stays"
            linkTo="/search"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {propertiesLoading ? (
              [1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-[420px]" />)
            ) : approvedProperties?.length > 0 ? (
              approvedProperties.slice(0, 4).filter(Boolean).map((property, idx) => (
                <motion.div
                  key={property.id || property._id}
                  {...fadeInUp}
                  transition={{ delay: idx * 0.1 }}
                >
                  <PropertyCard property={property} />
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-[#F8F9FA] rounded-[2rem] border-2 border-dashed border-[#D1CBB7]/30">
                <MapPin className="w-12 h-12 text-[#D1CBB7] mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#00142E] mb-2">No Stays Found</h3>
                <p className="text-[#00142E]/60 text-sm">Be the first to list a property in our community.</p>
                <Button className="mt-6 bg-[#CB2A25] hover:bg-[#a0221e] text-white rounded-full">List Your Property</Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. Travel Community - Distinct Section (Collapses if empty) */}
      <TravelCommunity
        variant="featured"
        onConnect={() => window.location.href = '/search'}
      />

      {/* 3. Community Groups Section */}
      <section className="py-8 relative bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <SectionHeader
            title="Community Groups"
            subtitle="Connect with fellows based on interests, location, and profession."
            linkText="Explore Groups"
            linkTo="/groups"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {communitiesLoading ? (
              [1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-[380px]" />)
            ) : communities?.length > 0 ? (
              communities.slice(0, 4).filter(Boolean).map((group, idx) => (
                <motion.div
                  key={group.id || group._id}
                  {...fadeInUp}
                  transition={{ delay: idx * 0.1 }}
                >
                  <CommunityGroupCard group={group} />
                </motion.div>
              ))
            ) : (
              <div className="col-span-full text-center py-16 text-[#00142E]/50">No community groups found.</div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Community Events Section */}
      <section className="py-8 relative bg-[#F8F9FA] overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <SectionHeader
            title="Events"
            subtitle="Discover festivals, meetups, and cultural celebrations near you."
            linkText="View All Events"
            linkTo="/events"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {eventsLoading ? (
              [1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-[380px] bg-gray-100 rounded-2xl" />)
            ) : approvedEvents?.length > 0 ? (
              approvedEvents.slice(0, 4).filter(Boolean).map((event, idx) => (
                <motion.div
                  key={event.id || event._id}
                  {...fadeInUp}
                  transition={{ delay: idx * 0.1 }}
                  className="h-full"
                >
                  <EventCard
                    event={event}
                    viewMode="grid"
                    onViewDetails={(id) => navigate(`/events/${id}`, { state: { eventParam: event } })}
                  />
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-gray-100">
                <div className="w-20 h-20 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Calendar className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-[#00142E] mb-2">No Events Scheduled</h3>
                <p className="text-[#00142E]/60 mb-8">Be the first to create a community event!</p>
                <Link to="/events/host" className="inline-flex items-center justify-center px-8 py-3 bg-[#00142E] text-white rounded-full font-bold hover:bg-[#CB2A25] transition-all shadow-lg hover:shadow-xl">
                  Host an Event
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Marketplace */}
      <section className="py-8 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <SectionHeader
            title="Marketplace"
            subtitle="Buy, sell, and trade with trusted community members."
            linkText="Browse Marketplace"
            linkTo="/marketplace"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {marketplaceLoading ? (
              [1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-[340px]" />)
            ) : marketplaceItems?.length > 0 ? (
              marketplaceItems.slice(0, 4).filter(Boolean).map((item, idx) => (
                <motion.div key={item.id} {...fadeInUp} transition={{ delay: idx * 0.1 }}>
                  <ProductCard product={item} onClick={(p) => window.location.href = `/marketplace/${p.id}`} />
                </motion.div>
              ))
            ) : (
              <div className="col-span-full text-center py-16 text-[#00142E]/50">No active listings.</div>
            )}
          </div>
        </div>
      </section>



      {/* 7. Final Call to Action */}
      <section className="py-10 relative overflow-hidden bg-white">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-6xl font-black text-[#00142E] tracking-tight">
              Ready to find your <span className="text-[#CB2A25]">home</span>?
            </h2>
            <p className="text-xl text-[#00142E]/60">
              Join thousands of Indians abroad who are already connecting, living, and celebrating together.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                onClick={() => navigate('/search')}
                size="lg"
                className="h-14 px-10 rounded-full bg-[#00142E] text-white hover:bg-[#00142E]/90 text-lg font-bold shadow-xl"
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomeFeatured;