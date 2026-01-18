"use client"

import React from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { motion, useScroll, useTransform } from "framer-motion"
import { Users, Globe, Shield, Zap, Heart, Target, Sparkles, Map, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.5 }}
        className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-sm group"
    >
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Icon className="text-white h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-blue-100/70 leading-relaxed">
            {description}
        </p>
    </motion.div>
)

const StatItem = ({ value, label }) => (
    <div className="text-center">
        <div className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            {value}
        </div>
        <div className="text-sm text-blue-200/60 uppercase tracking-widest font-medium">{label}</div>
    </div>
)

export default function AboutPage() {
    const { scrollYProgress } = useScroll()
    const y = useTransform(scrollYProgress, [0, 1], [0, -50])

    return (
        <main className="min-h-screen bg-[#0B0F19] font-sans selection:bg-blue-500/30">
            <Navbar />

            {/* Immersive Hero */}
            <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20">
                {/* Dynamic Background */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
                    <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse animation-delay-2000" />
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay" />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F19]/0 via-[#0B0F19]/50 to-[#0B0F19]" />
                </div>

                <div className="container mx-auto px-4 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-sm font-medium tracking-wider uppercase mb-6 backdrop-blur-md">
                            Welcome to the Future of Living
                        </span>
                        <h1 className="text-5xl md:text-8xl font-bold text-white mb-8 tracking-tight">
                            Beyond <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                                Boundaries.
                            </span>
                        </h1>
                        <p className="text-xl text-blue-100/70 max-w-2xl mx-auto leading-relaxed mb-10">
                            NextKinLife is reimagining how the world connects. We are building a borderless ecosystem for travelers, creators, and dreamers to call home, anywhere.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button className="h-14 px-8 rounded-full bg-white text-[#0B0F19] hover:bg-gray-100 font-bold text-lg transition-transform hover:scale-105">
                                Explore Our World
                            </Button>
                            <Button variant="outline" className="h-14 px-8 rounded-full border-white/20 text-white hover:bg-white/10 font-bold text-lg backdrop-blur-sm">
                                Read Our Manifesto
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Global Impact Stats */}
            <section className="py-20 border-y border-white/5 bg-white/[0.02]">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                        <StatItem value="50+" label="Countries" />
                        <StatItem value="10k+" label="Community Hosts" />
                        <StatItem value="1M+" label="Stories Shared" />
                        <StatItem value="∞" label="Possibilities" />
                    </div>
                </div>
            </section>

            {/* The Vision Section */}
            <section className="py-32 relative">
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="relative"
                        >
                            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 aspect-[4/3]">
                                <img
                                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1951&q=80"
                                    alt="Community"
                                    className="object-cover w-full h-full hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-blue-900/20 mix-blend-multiply" />
                            </div>
                            {/* Floating Card */}
                            <div className="absolute -bottom-10 -right-10 bg-[#161B28] p-6 rounded-2xl border border-white/10 shadow-xl max-w-xs hidden md:block">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                        <Zap size={20} />
                                    </div>
                                    <div>
                                        <div className="text-white font-bold">Rapid Growth</div>
                                        <div className="text-xs text-white/50">Joined by 500+ today</div>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full w-3/4 bg-green-500 rounded-full" />
                                </div>
                            </div>
                        </motion.div>

                        <div className="space-y-8">
                            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                                We Are The <br />
                                <span className="text-blue-500">Global Citizens.</span>
                            </h2>
                            <p className="text-blue-100/70 text-lg leading-relaxed">
                                Traditional boundaries are dissolving. The future belongs to those who seek connection over separation. At NextKinLife, we provide the infrastructure for a life without borders—merging technology with the warmth of human hospitality.
                            </p>
                            <ul className="space-y-4">
                                {['Curated Experiences', 'Verified Safety Standards', 'Seamless Digital Nomad Living'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-white/90">
                                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                            <Sparkles size={14} />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <div className="pt-4">
                                <Button variant="link" className="text-blue-400 p-0 text-lg hover:text-blue-300 gap-2">
                                    Learn about our culture <ArrowRight size={18} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values Grid */}
            <section className="py-32 bg-[#0F1420]">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Built on Principles</h2>
                        <p className="text-blue-100/60 text-lg">
                            Our core values are the compass that guides every decision we make, ensuring we build a future that is inclusive, sustainable, and exciting.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard
                            icon={Globe}
                            title="Borderless Thinking"
                            delay={0.1}
                            description="We see the world as one interconnected home. Our platform removes friction from cultural exchange and travel."
                        />
                        <FeatureCard
                            icon={Heart}
                            title="Radical Empathy"
                            delay={0.2}
                            description="Understanding the diverse needs of our global community is at the heart of our design and service."
                        />
                        <FeatureCard
                            icon={Shield}
                            title="Uncompromising Trust"
                            delay={0.3}
                            description="Safety is not a feature, it's our foundation. We employ state-of-the-art verification to ensure peace of mind."
                        />
                        <FeatureCard
                            icon={Target}
                            title="Impact Driven"
                            delay={0.4}
                            description="We measure success not just by growth, but by the positive footprint we leave on local communities."
                        />
                        <FeatureCard
                            icon={Users}
                            title="Community First"
                            delay={0.5}
                            description="Technology connects us, but people define us. We empower hosts and guests to build lasting relationships."
                        />
                        <FeatureCard
                            icon={Zap}
                            title="Continuous Innovation"
                            delay={0.6}
                            description="We are constantly challenging the status quo to deliver magical experiences that surprise and delight."
                        />
                    </div>
                </div>
            </section>

            {/* CTA / Final Section */}
            <section className="py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 to-transparent pointer-events-none" />

                <div className="container mx-auto px-4 text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-5xl md:text-7xl font-bold text-white mb-8">
                            Ready to go <span className="text-blue-500">Anywhere?</span>
                        </h2>
                        <p className="text-xl text-blue-100/60 max-w-2xl mx-auto mb-12">
                            Join millions of others who have found their place in the world with NextKinLife. Your journey starts here.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                            <Button className="h-16 px-10 text-lg font-bold rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg hover:shadow-blue-500/25 transition-all">
                                Start Your Journey
                            </Button>
                            <span className="text-white/40 font-medium">or</span>
                            <Button href="/contact" variant="ghost" className="text-white hover:text-white hover:bg-white/10 text-lg font-medium">
                                Contact Sales
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </main>
    )
}
