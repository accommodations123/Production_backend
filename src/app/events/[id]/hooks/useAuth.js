import { useState, useEffect } from "react"
import { useGetMeQuery } from "@/store/api/authApi"

export const useAuth = () => {
    const { data: userData, isError } = useGetMeQuery()
    const [user, setUser] = useState(null)

    useEffect(() => {
        // Priority 1: Redux Store (Source of Truth)
        if (userData) {
            setUser(userData)
            return
        }

        // Priority 2: LocalStorage (Fallback/Optimistic)
        if (typeof window !== 'undefined') {
            const storedUser = localStorage.getItem('user')
            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser))
                } catch (e) {
                    console.error('Failed to parse user from localStorage')
                }
            }
        }
    }, [userData])

    return { user }
}
