"use client"

import React from "react"
import { ArrowRight, ShieldCheck, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <div className="relative bg-white overflow-hidden min-h-[auto] md:min-h-[70vh] flex items-center pt-24 pb-4">

      {/* 1. Dynamic Background Shape */}
      <div className="absolute top-0 right-0 w-full md:w-2/3 h-full bg-[#FFF5F5] skew-y-12 md:skew-y-0 md:skew-x-12 translate-y-32 md:translate-y-0 md:translate-x-32 z-0 opacity-50 md:opacity-100" />
      <div className="absolute top-0 right-0 w-full md:w-1/2 h-full bg-gradient-to-bl from-[#C93A30]/5 to-transparent z-0" />

      {/* 2. Content Container */}
      <div className="container mx-auto px-4 md:px-6 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* LEFT: Content */}
          <div className="space-y-6 md:space-y-8 max-w-2xl pt-4 lg:pt-0 animate-in fade-in slide-in-from-left-10 duration-1000">
            {/* Premium Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white border border-[#C93A30]/20 text-[#C93A30] text-xs md:text-sm font-bold shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C93A30] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C93A30]"></span>
              </span>
              India's Most Trusted Community
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-[#00142E] leading-[1.1] tracking-tight">
              Feels Like <br />
              <span className="text-[#C93A30] relative inline-block">
                Home
                {/* Hand-drawn underline effect */}
                <svg className="absolute w-full h-3 md:h-4 -bottom-1 md:-bottom-2 left-0 text-[#C93A30]/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 12 100 5" stroke="currentColor" strokeWidth="6" fill="none" />
                </svg>
              </span>
              , Everywhere.
            </h1>

            {/* Subtext */}
            <p className="text-lg md:text-xl text-[#00142E]/70 font-medium leading-relaxed">
              Join Indians abroad. Find verified accommodations, events, and a family away from home.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button size="lg" className="h-12 md:h-14 px-8 md:px-10 rounded-full bg-[#C93A30] hover:bg-[#b02e25] text-white text-base md:text-lg font-bold shadow-lg transition-all hover:-translate-y-1 w-full sm:w-auto">
                Join Community
              </Button>

            </div>

            {/* Trust Footer */}
            <div className="pt-4 md:pt-8 flex flex-wrap items-center gap-4 md:gap-6 text-sm font-medium text-slate-500">



            </div>
          </div>

          {/* RIGHT: Hero Image Collage (Responsive) */}
          <div className="relative h-[300px] md:h-[500px] lg:h-[650px] w-full perspective-1000 mt-8 lg:mt-0">
            {/* Background Blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-[#C93A30]/10 rounded-full blur-[60px] md:blur-[80px]" />

            {/* Main Image (Center) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 lg:top-10 lg:right-10 lg:left-auto lg:translate-x-0 w-[280px] md:w-[350px] lg:w-[400px] h-[300px] md:h-[450px] lg:h-[500px] rounded-[2rem] overflow-hidden shadow-2xl border-[4px] md:border-[6px] border-white transform rotate-3 lg:hover:rotate-0 transition-all duration-700 z-20">
              <img
                src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=1740&auto=format&fit=crop"
                alt="Indian Community"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 text-white">
                <p className="font-bold text-base md:text-lg">Community First</p>
                <p className="text-xs md:text-sm opacity-90">Events & Meetups</p>
              </div>
            </div>

            {/* Floating Card (Hidden on very small screens, shown on tablet+) */}
            <div className="hidden sm:block absolute top-[20%] left-0 lg:top-20 lg:left-0 w-48 md:w-64 h-36 md:h-48 rounded-2xl overflow-hidden shadow-xl border-[4px] border-white transform -rotate-6 z-10 animate-in fade-in slide-in-from-bottom-10 delay-300">
              <img
                src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop"
                alt="Cozy Room"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Floating Card 2 (Hidden on mobile) */}
            <div className="hidden lg:block absolute bottom-20 right-0 w-64 h-64 rounded-[2rem] overflow-hidden shadow-xl border-[4px] border-white transform -rotate-3 z-30">
              <img
                src="https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=1740&auto=format&fit=crop"
                alt="Friends"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}