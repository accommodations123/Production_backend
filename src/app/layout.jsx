import "./globals.css";
import { useState } from "react";
import { MobileHomeHeader } from "@/components/home/MobileHomeHeader";
import { MobileFooterNav } from "@/components/layout/MobileFooterNav";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { Toaster } from "sonner";

export default function RootLayout({ children }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="antialiased font-sans min-h-screen bg-background text-foreground pb-20 md:pb-0">
      <div className="md:hidden sticky top-0 z-50">
        <MobileHomeHeader onSearchClick={() => setIsSearchOpen(true)} />
      </div>
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      {children}
      <MobileFooterNav />
      <Toaster position="top-center" richColors />
    </div>
  )
}
