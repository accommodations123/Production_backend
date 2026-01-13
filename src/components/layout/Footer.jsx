import { Link } from "react-router-dom"
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCountry } from "@/context/CountryContext"

export function Footer() {
    const { activeCountry } = useCountry();
    return (
        <footer className="bg-primary text-white pt-16 pb-8">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                    {/* Brand */}
                    <div className="space-y-4">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                                <img
                                    src="/logo.jpeg"
                                    alt="NextKinLife Logo"
                                    className="object-cover w-full h-full"
                                />
                            </div>
                        </Link>
                        <p className="text-gray-400 text-sm">
                            Find your perfect stay with NextKinLife. From cozy apartments to luxury villas, we have it all.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h3 className="font-bold mb-4">Company</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                            <li><Link to="/career" className="hover:text-white transition-colors">Career</Link></li>
                            <li><Link to="/groups" className="hover:text-white transition-colors">Groups</Link></li>
                            <li><Link to="/events" className="hover:text-white transition-colors">Events</Link></li>
                            <li><Link to="/support" className="hover:text-white transition-colors">Support</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold mb-4">Support</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                            <li><Link to="/trust" className="hover:text-white transition-colors">Trust & Safety for {activeCountry?.code === 'IN' ? 'Indians' : activeCountry?.name || 'Indians'}</Link></li>
                            <li><Link to="/safety" className="hover:text-white transition-colors">Safety Information</Link></li>
                            <li><Link to="/cancellation" className="hover:text-white transition-colors">Cancellation Options</Link></li>
                            <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                            <li><Link to="/Career" className="hover:text-white transition-colors">Career</Link></li>
                            <li><Link to="/Support" className="hover:text-white transition-colors">Support</Link></li>
                        </ul>
                        
                    </div>

                    {/* Newsletter */}
                    <div>
                        <h3 className="font-bold mb-4">Subscribe</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Subscribe to our newsletter for the latest updates and offers.
                        </p>
                        <div className="flex gap-2">
                            <Input placeholder="Email address" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                            <Button className="bg-accent hover:bg-accent/90">Subscribe</Button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-400">
                        © {new Date().getFullYear()} NextKinLife. All rights reserved.
                    </p>
                    <div className="flex gap-4">
                        <Link to="#" className="text-gray-400 hover:text-white transition-colors"><Facebook className="h-5 w-5" /></Link>
                        <Link to="#" className="text-gray-400 hover:text-white transition-colors"><Twitter className="h-5 w-5" /></Link>
                        <Link to="#" className="text-gray-400 hover:text-white transition-colors"><Instagram className="h-5 w-5" /></Link>
                        <Link to="#" className="text-gray-400 hover:text-white transition-colors"><Linkedin className="h-5 w-5" /></Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
