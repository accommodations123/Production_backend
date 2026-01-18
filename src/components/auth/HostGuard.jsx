import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGetMeQuery } from '@/store/api/authApi';
import { useGetHostProfileQuery } from '@/store/api/hostApi';

const HostGuard = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // 1. Check if User is Logged In
    const { data: user, isLoading: isUserLoading } = useGetMeQuery();

    // 2. Check Host Status (Skip if not logged in)
    const {
        data: host,
        isLoading: isHostLoading
    } = useGetHostProfileQuery(undefined, {
        skip: !user
    });

    useEffect(() => {
        if (isUserLoading || isHostLoading) return;

        // If not logged in, redirect to signin
        if (!user) {
            // Optional: You might want to save the current location to redirect back after login
            navigate('/signin');
            return;
        }

        // If User is Logged In...
        const hasHostProfile = host && (host.id || host._id); // Check for valid ID

        if (!hasHostProfile) {
            console.log("HostGuard: User is not a host. Redirecting to /hosts");
            navigate('/hosts', { replace: true });
        }

    }, [user, host, isUserLoading, isHostLoading, navigate]);

    // Show nothing while loading or if redirecting
    if (isUserLoading || isHostLoading || (!user) || (user && !(host && (host.id || host._id)))) {
        return null; // Or a loading spinner
    }

    return children;
};

export default HostGuard;
