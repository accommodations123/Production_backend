"use client"

import React, { useState } from 'react';
import {
  Shield, ShieldCheck, Sparkles, MapPin, Users, Calendar,
  ArrowRight, Heart, Globe, Star
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
    <div className="min-h-screen bg-white font-inter text-[#00142E]">

      {/* 1. Community Stays Section - Light Background */}
      <section className="py-12 md:py-24 relative overflow-hidden">
        {/* Decorative Blob */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#CB2A25]/5 to-transparent rounded-full blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <SectionHeader
            title="Community Stays"
            subtitle="Verified homes with Indian hosts and cultural amenities"
            linkText="View All Stays"
            linkTo="/search"
          />

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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

      {/* 2. Travel Community - Distinct Section */}
      <section className="py-20 bg-[#F8F9FA] border-y border-[#D1CBB7]/20">
        <div className="container mx-auto px-4 md:px-6">
          <TravelCommunity onConnect={() => window.location.href = '/search'} />
        </div>
      </section>

      {/* 3. Community Groups - Gradient Accent */}
      <section className="py-12 md:py-24 relative bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <SectionHeader
            title="Community Groups"
            subtitle="Connect with fellows based on interests, location, and profession"
            linkText="Explore Groups"
            linkTo="/groups"
          />

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* 4. Events Section - Dark High Contrast */}
      <section className="py-12 md:py-24 bg-[#00142E] text-white relative overflow-hidden">
        {/* Background Patterns */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-px w-8 bg-[#CB2A25]" />
                <span className="text-[#CB2A25] font-bold text-sm uppercase tracking-widest">Happening Now</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Upcoming Events</h2>
              <p className="text-white/60 max-w-xl text-lg">Festivals, networking, and local meetups curated for you.</p>
            </div>
            <Link to="/events" className="group flex items-center gap-2 text-white font-bold hover:text-[#CB2A25] transition-colors">
              View Calendar <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {eventsLoading ? (
              [1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-[400px] bg-white/5" />)
            ) : approvedEvents?.length > 0 ? (
              approvedEvents.slice(0, 4).filter(Boolean).map((event, idx) => (
                <motion.div
                  key={event.id || event._id}
                  {...fadeInUp}
                  transition={{ delay: idx * 0.1 }}
                >
                  <EventCard
                    event={event}
                    viewMode="grid"
                    onViewDetails={(id) => window.location.href = `/events/${id}`}
                    className="bg-white/5 border border-white/10 text-white hover:bg-white/10"
                    dark={true}
                  />
                </motion.div>
              ))
            ) : (
              <div className="col-span-full text-center py-20 bg-white/5 rounded-3xl border border-white/10">
                <Calendar className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/40">No upcoming events scheduled.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Marketplace - Light */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <SectionHeader
            title="Community Exchange"
            subtitle="Buy, sell, and trade with trusted members"
            linkText="Browse Marketplace"
            linkTo="/marketplace"
          />
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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

      {/* 6. Features & Value Prop - Premium Dark Card */}
      <section className="py-16 bg-[#F8F9FA]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

            {/* Left: Platform Stats */}
            <div className="lg:col-span-8 bg-[#00142E] rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden text-white flex flex-col justify-center">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#CB2A25]/20 rounded-full blur-[80px]" />
              <div className="relative z-10">
                <h3 className="text-3xl md:text-4xl font-black mb-12">More Than Just a Platform.<br /><span className="text-[#CB2A25]">It's Your Community.</span></h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {FEATURE_CARDS.map((card, idx) => (
                    <div key={idx} className="space-y-2 group">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-[#CB2A25] group-hover:bg-[#CB2A25] group-hover:text-white transition-all duration-300">
                        {card.icon}
                      </div>
                      <div className="text-3xl font-black">{card.stats}</div>
                      <div className="text-xs font-bold text-white/50 uppercase tracking-wider">{card.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Safety Info */}
            <div className="lg:col-span-4 bg-white rounded-[2.5rem] p-8 md:p-10 border border-[#D1CBB7]/20 shadow-xl shadow-[#D1CBB7]/10 flex flex-col">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-[#00142E]">Trust & Safety</h4>
                  <p className="text-xs text-[#00142E]/60 font-medium">Verified by NextKin</p>
                </div>
              </div>

              <div className="flex-1 space-y-6">
                {SAFETY_TIPS.map((tip) => (
                  <div key={tip.id} className="flex gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#CB2A25] mt-2 shrink-0" />
                    <div>
                      <h5 className="font-bold text-[#00142E] text-sm mb-1">{tip.title}</h5>
                      <p className="text-xs text-[#00142E]/60 leading-relaxed">{tip.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full mt-8 rounded-full border-[#D1CBB7] hover:bg-[#F8F9FA]">
                Read Safety Guidelines
              </Button>
            </div>

          </div>
        </div>
      </section>

      {/* 7. Final Call to Action */}
      <section className="py-24 relative overflow-hidden bg-white">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-6xl font-black text-[#00142E] tracking-tight">
              Ready to find your <span className="text-[#CB2A25]">home</span>?
            </h2>
            <p className="text-xl text-[#00142E]/60">
              Join thousands of Indians abroad who are already connecting, living, and celebrating together.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="h-14 px-10 rounded-full bg-[#00142E] text-white hover:bg-[#00142E]/90 text-lg font-bold shadow-xl">
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