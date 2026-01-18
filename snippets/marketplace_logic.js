
// Import these at the top of src/app/marketplace/page.jsx
import { useGetHostProfileQuery, useGetMeQuery } from "@/store/api/hostApi"; // Wait, api/hostApi exports hostProfile, but GetMe is usually authApi.
import { useGetMeQuery } from "@/store/api/authApi";
import { useNavigate } from "react-router-dom";

// Inside the component:
const navigate = useNavigate();
const { data: user } = useGetMeQuery();
const { data: hostProfile } = useGetHostProfileQuery(undefined, { skip: !user });

const handleTabChange = (tab) => {
    if (tab === 'sell') {
        if (!user) {
            navigate('/signin'); // or show auth modal
            return;
        }
        if (!hostProfile || (!hostProfile.id && !hostProfile._id)) {
            navigate('/hosts');
            return;
        }
    }
    setActiveTab(tab);
};

// Update JSX:
// <MarketplaceLayout activeTab={activeTab} onTabChange={handleTabChange}>
