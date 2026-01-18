"use client"

import React from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { motion } from "framer-motion"
import { Shield, Lock, Eye, UserCheck, AlertTriangle, CheckCircle, HeartHandshake, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"

const TrustCard = ({ icon: Icon, title, description, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.5 }}
        className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-md group"
    >
        <div className="w-14 h-14 bg-gradient-to-br from- emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-900/20 group-hover:scale-110 transition-transform">
            <Icon className="text-white h-7 w-7" />
        </div>
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <p className="text-blue-100/70 leading-relaxed">
            {description}
        </p>
    </motion.div>
)

export default function TrustPage() {
    return (
        <main className="min-h-screen bg-[#0B0F19] font-sans selection:bg-emerald-500/30">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-[100px] animate-pulse animation-delay-2000" />
                </div>

                <div className="container mx-auto px-4 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8 backdrop-blur-sm">
                            <Shield className="h-4 w-4" />
                            <span>Your Safety is Our Priority</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight">
                            Trust Built specifically <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                                For You.
                            </span>
                        </h1>
                        <p className="text-xl text-blue-100/70 max-w-2xl mx-auto leading-relaxed mb-12">
                            We've built a multi-layered defense system to ensure every interaction, booking, and stay on NextKinLife is secure, verified, and worry-free.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Core Pillars */}
            <section className="py-20 relative">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <TrustCard
                            icon={UserCheck}
                            title="Verified Identities"
                            delay={0.1}
                            description="Every host and guest undergoes rigorous identity verification using government ID checks and biometric matching."
                        />
                        <TrustCard
                            icon={Lock}
                            title="Secure Payments"
                            delay={0.2}
                            description="Our military-grade encryption ensures your financial data is never exposed. Payments are held in escrow until check-in."
                        />
                        <TrustCard
                            icon={Eye}
                            title="Fraud Detection"
                            delay={0.3}
                            description="AI-powered algorithms monitor transactions 24/7 to detect and prevent suspicious activity before it happens."
                        />
                        <TrustCard
                            icon={AlertTriangle}
                            title="Crisis Support"
                            delay={0.4}
                            description="Our dedicated global safety team is available 24/7 to handle emergencies and urgent situations."
                        />
                        <TrustCard
                            icon={HeartHandshake}
                            title="Host Guarantee"
                            delay={0.5}
                            description="Hosts are protected against property damage with our comprehensive $1M protection program."
                        />
                        <TrustCard
                            icon={CheckCircle}
                            title="Quality Standards"
                            delay={0.6}
                            description="We enforce strict quality guidelines for listings. Properties that don't meet our standards are removed."
                        />
                    </div>
                </div>
            </section>

            {/* Commitment Section */}
            <section className="py-24 bg-white/[0.02] border-y border-white/5">
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <div className="space-y-8">
                            <h2 className="text-4xl font-bold text-white">
                                Our Community <br />
                                <span className="text-emerald-400">Commitment</span>
                            </h2>
                            <p className="text-blue-100/70 text-lg leading-relaxed">
                                Trust isn't just about technology; it's about people. We foster a community where respect and inclusion aren't just rules—they're our way of life.
                            </p>

                            <div className="space-y-6">
                                {[
                                    { title: "Zero Tolerance Policy", desc: "We have zero tolerance for discrimination, harassment, or hate speech." },
                                    { title: "Review Authenticity", desc: "Reviews are only from real stays. We strictly police fake reviews." },
                                    { title: "Data Privacy", desc: "We never sell your personal data. Your privacy is yours alone." }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="mt-1">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                <CheckCircle size={16} />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-lg">{item.title}</h4>
                                            <p className="text-blue-100/60">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 rounded-3xl blur-2xl" />
                            <div className="relative bg-[#131825] border border-white/10 rounded-3xl p-8 shadow-2xl">
                                <h3 className="text-2xl font-bold text-white mb-6">Need help with a safety issue?</h3>
                                <p className="text-blue-100/60 mb-8">
                                    Our Trust & Safety team is standing by to assist you.
                                </p>
                                <div className="space-y-4">
                                    <Button className="w-full h-14 bg-white text-[#0B0F19] hover:bg-gray-100 font-bold text-lg rounded-xl">
                                        Visit Safety Center
                                    </Button>
                                    <Button variant="outline" className="w-full h-14 border-white/10 text-white hover:bg-white/5 font-bold text-lg rounded-xl flex items-center gap-2">
                                        <Phone size={18} /> Emergency Contact
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    )
}
