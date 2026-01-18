import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CountryProvider } from "@/context/CountryContext";
import ScrollToTop from "@/components/layout/ScrollToTop";
import RootLayout from "@/app/layout";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import HostGuard from "@/components/auth/HostGuard";
// import PropertiesListPage from "@/app/properties/page";
import HostOnboardingForm from "./components/host/Host";
import { TravelCommunity } from "./components/dashboard/TravelCommunity";
// import HostVerification from './components/host/wizard/HostVerification'
// Lazy load pages
const Home = lazy(() => import("@/app/page"));
// const BookConfirmation = lazy(() => import("@/app/book/confirmation/page"));
const Career = lazy(() => import("@/app/career/page"));
const About = lazy(() => import("@/app/about/page"));
const Trust = lazy(() => import("@/app/trust/page"));
const Help = lazy(() => import("@/app/help/page"));
const Contact = lazy(() => import("@/app/contact/page"));
const Dashboard = lazy(() => import("@/app/dashboard/page"));
const EventsPage = lazy(() => import("@/app/events/page"));
const EventDetailsPage = lazy(() => import("@/app/events/[id]/page"))
const HostEventPage = lazy(() => import("@/app/events/host/page"));
const Groups = lazy(() => import("@/app/groups/page"));
const CreateGroupPage = lazy(() => import("@/app/groups/create/page"));
const GroupDetailsPage = lazy(() => import("@/app/groups/[id]/page"));
const AddResource = lazy(() => import("@/app/groups/add-resource/page"));
// const HostOnboardingPage = lazy(() => import("@/app/host/onboarding/page"));
const RoomDetails = lazy(() => import("@/app/rooms/[id]/page"));
const Search = lazy(() => import("@/app/SearchPage"));
// const HostYourHouse = lazy(() => import("@/app/host/guidelines/page"));
// const HostVerificationPage = lazy(() => import("@/app/host/verify/page"));
const HostCreatePage = lazy(() => import("@/app/host/create/page"));
// const TrustPage = lazy(() => import("@/app/trust/page"));
// const OnboardingPage = lazy(() => import("@/app/onboarding/page"));
// const AccommodationPage = lazy(() => import("@/app/resources/accommodation/page"));
const TravelPage = lazy(() => import("@/app/resources/travel/page"));
const CommunityPage = lazy(() => import("@/app/resources/community/page"));
const LegalPage = lazy(() => import("@/app/resources/legal/page"));
const Signup = lazy(() => import("@/app/signup/page"));
const Signin = lazy(() => import("@/app/signin/page"));
const SupportPage = lazy(() => import("./components/mentorship/page"));
const MarketplacePage = lazy(() => import("@/app/marketplace/page"));
const ProductDetailsPage = lazy(() => import("@/app/marketplace/[id]/page"));
const ChatPage = lazy(() => import("@/app/ChatPage"));
const NewDashboard = lazy(() => import("@/app/dashboard/NewDashboard"));
// const PropertiesList = lazy(() => import("@/app/properties/page"));
// const HostPage = lazy(() => import("@/app/host/page")); 

export default function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />
            <CountryProvider>
                <RootLayout>
                    <Suspense fallback={<LoadingSpinner />}>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            {/* <Route path="/book/confirmation" element={<BookConfirmation />} /> */}
                            <Route path="/career" element={<Career />} />
                            <Route path="/about" element={<About />} />
                            <Route path="/trust" element={<Trust />} />
                            <Route path="/help" element={<Help />} />
                            <Route path="/contact" element={<Contact />} />
                            <Route path="/chat" element={<ChatPage />} />
                            <Route path="/chat/:id" element={<ChatPage />} />
                            {/* <Route path="/account" element={<Dashboard />} /> */}
                            <Route path="/account-v2" element={<NewDashboard />} />
                            <Route path="/events" element={<EventsPage />} />
                            <Route path="/events/host" element={
                                <HostGuard>
                                    <HostEventPage />
                                </HostGuard>
                            } />
                            <Route path="/events/:id" element={<EventDetailsPage />} />
                            <Route path="/groups" element={<Groups />} />
                            <Route path="/groups/create" element={<CreateGroupPage />} />
                            <Route path="/groups/:id" element={<GroupDetailsPage />} />
                            <Route path="/groups/add-resource" element={<AddResource />} />
                            <Route path="/support" element={<SupportPage />} />
                            {/* <Route path="/host" element={<HostPage />} /> Add this route */}
                            <Route path="/hosts" element={<HostOnboardingForm />} />
                            {/* <Route path="/host/onboarding" element={<HostOnboardingPage />} /> */}
                            {/* <Route path="/hostverification" element={<HostVerification />} /> */}
                            <Route path="/rooms" element={<Navigate to="/search" replace />} />
                            <Route path="/rooms/:id" element={<RoomDetails />} />
                            {/* <Route path="/properties" element={<PropertiesListPage />} /> */}
                            <Route path="/search" element={<Search />} />
                            {/* <Route path="/host/guidelines" element={<HostYourHouse />} /> */}
                            {/* <Route path="/host/verify" element={<HostVerificationPage />} /> */}
                            <Route path="/host/create" element={
                                <HostGuard>
                                    <HostCreatePage />
                                </HostGuard>
                            } />
                            {/* <Route path="/trust" element={<TrustPage />} /> */}
                            {/* <Route path="/onboarding" element={<OnboardingPage />} /> */}
                            {/* <Route path="/resources/accommodation" element={<AccommodationPage />} /> */}
                            {/* <Route path="/resources/jobs" element={<Navigate to="/resources/mentorship" replace />} /> */}
                            <Route path="/travel" element={<TravelPage />} />
                            <Route path="/resources/community" element={<CommunityPage />} />
                            <Route path="/resources/legal" element={<LegalPage />} />
                            <Route path="/marketplace" element={<MarketplacePage />} />
                            <Route path="/marketplace/:id" element={<ProductDetailsPage />} />
                            <Route path="/signup" element={<Signup />} />
                            <Route path="/signin" element={<Signin />} />
                            <Route path="/resources/travel" element={<TravelCommunity />} />
                        </Routes>
                    </Suspense>
                </RootLayout>
            </CountryProvider>
        </BrowserRouter>
    );
}