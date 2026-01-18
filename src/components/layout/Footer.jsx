import { Link } from "react-router-dom";
import {
    Facebook,
    Twitter,
    Instagram,
    Linkedin,
    Mail,
    MapPin,
    Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCountry } from "@/context/CountryContext";

export function Footer() {
    const { activeCountry } = useCountry();

    return (
        <footer className="bg-navy-dark text-white font-sans pt-16 pb-8 border-t border-white/5">
            <div className="container mx-auto px-6">

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

                    {/* Column 1: Brand */}
                    <div className="space-y-6">
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-1">
                                <img
                                    src="/logo.jpeg"
                                    alt="Logo"
                                    className="object-cover w-full h-full rounded"
                                />
                            </div>
                            <span className="text-xl font-bold font-poppins tracking-tight">NextKinLife</span>
                        </Link>
                        <p className="text-white/70 text-sm leading-relaxed">
                            Connecting you with unique stays and vibrant communities. The world is yours to explore.
                        </p>
                        <div className="flex items-center gap-4">
                            {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                                <Link
                                    key={i}
                                    to="#"
                                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-accent hover:text-white transition-all text-white/70"
                                >
                                    <Icon size={16} />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Column 2: Company */}
                    <div>
                        <h4 className="font-bold font-poppins mb-6 text-white">Company</h4>
                        <ul className="space-y-3 text-sm text-white/70">
                            <li><Link to="/about" className="hover:text-accent transition-colors flex items-center gap-2">About Us</Link></li>
                            <li><Link to="/career" className="hover:text-accent transition-colors flex items-center gap-2">Careers</Link></li>
                            {/* <li><Link to="/media" className="hover:text-accent transition-colors flex items-center gap-2">Press & Media</Link></li> */}
                            <li><Link to="/contact" className="hover:text-accent transition-colors flex items-center gap-2">Contact Us</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Resources */}
                    <div>
                        <h4 className="font-bold font-poppins mb-6 text-white">Resources</h4>
                        <ul className="space-y-3 text-sm text-white/70">
                            <li><Link to="/marketplace" className="hover:text-accent transition-colors flex items-center gap-2">Marketplace</Link></li>
                            <li><Link to="/groups" className="hover:text-accent transition-colors flex items-center gap-2">Community Groups</Link></li>
                            <li><Link to="/trust" className="hover:text-accent transition-colors flex items-center gap-2">Trust & Safety</Link></li>
                            <li><Link to="/help" className="hover:text-accent transition-colors flex items-center gap-2">Help Center</Link></li>
                        </ul>
                    </div>

                    {/* Column 4: Newsletter */}
                    <div>
                        <h4 className="font-bold font-poppins mb-6 text-white">Stay in the loop</h4>
                        <p className="text-sm text-white/70 mb-4">
                            Join our active community newsletter.
                        </p>
                        <div className="space-y-3">
                            <Input
                                placeholder="Email address"
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-accent focus:ring-accent/20"
                            />
                            <Button className="w-full bg-accent hover:bg-red-700 text-white font-medium">
                                Subscribe
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/40">
                    <p>© {new Date().getFullYear()} NextKinLife Inc. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
                        <Link to="/cookies" className="hover:text-white transition-colors">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
