import React, { useState, useEffect, memo } from "react"
import { Link } from "react-router-dom"
import { Star, EyeOff, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGetEventReviewsQuery, useGetEventRatingQuery, useAddEventReviewMutation, useHideEventReviewMutation } from "@/store/api/hostApi"
import { useAuth } from "../hooks/useAuth"
import { toast } from "sonner"

export const ReviewsTab = memo(({ event, visibleSections }) => {
    const { user } = useAuth()

    // RTK Query hooks
    const { data: reviews = [], isLoading: reviewsLoading } = useGetEventReviewsQuery(event.id, {
        skip: !event?.id
    })
    const { data: ratingData = { rating: 0, count: 0 } } = useGetEventRatingQuery(event.id, {
        skip: !event?.id
    })

    const [addReview, { isLoading: submitting }] = useAddEventReviewMutation()
    const [hideReview] = useHideEventReviewMutation()

    const [userRating, setUserRating] = useState(0)
    const [reviewText, setReviewText] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [showSuccessMessage, setShowSuccessMessage] = useState(false)

    // Derived state
    const userReview = React.useMemo(() => {
        if (!user || !reviews.length) return null
        return reviews.find(review => review.user_id === user.id)
    }, [user, reviews])

    const hasReviewed = !!userReview

    useEffect(() => {
        if (userReview) {
            setUserRating(userReview.rating || 0)
            setReviewText(userReview.comment || '')
        }
    }, [userReview])

    const handleSubmitReview = async () => {
        if (!user) {
            setErrorMessage('You must be logged in to submit a review.')
            return
        }

        if (userRating === 0) {
            setErrorMessage('Please select a rating.')
            return
        }

        try {
            setErrorMessage('')
            await addReview({
                id: event.id,
                data: {
                    reviewer_name: user?.full_name || user?.name || user?.username || "NextKin User",
                    rating: userRating,
                    comment: reviewText
                }
            }).unwrap()

            toast.success("Your review has been submitted successfully!")
            setShowSuccessMessage(true)
            setTimeout(() => setShowSuccessMessage(false), 3000)
        } catch (error) {
            console.error('Error submitting review:', error)
            const msg = error?.data?.message || 'Failed to submit review. Please try again.'
            setErrorMessage(msg)
            toast.error(msg)
        }
    }

    const handleHideReview = async () => {
        if (!userReview?.id) return

        try {
            await hideReview(userReview.id).unwrap()
            setUserRating(0)
            setReviewText('')
        } catch (error) {
            console.error('Error hiding review:', error)
            setErrorMessage(error?.data?.message || 'Failed to hide review. Please try again.')
        }
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffTime = Math.abs(now - date)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 1) return '1 day ago'
        if (diffDays < 7) return `${diffDays} days ago`
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`
        return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`
    }

    const displayRating = typeof ratingData?.rating === 'number' ? ratingData.rating : 0
    const displayCount = reviews.length || 0

    const isEventCompleted = React.useMemo(() => {
        if (!event?.end_date && !event?.date) return false

        // Use end_date if available, otherwise assume event ends on start_date
        const endDateStr = event.end_date || event.date
        const endTimeStr = event.end_time || "23:59:59"

        try {
            const eventEnd = new Date(`${endDateStr}T${endTimeStr}`)
            return new Date() > eventEnd
        } catch (e) {
            // Fallback for date parsing issues
            return new Date() > new Date(endDateStr)
        }
    }, [event])

    return (
        <div id="reviews" className="space-y-6 md:space-y-8">
            <section
                className={`bg-gradient-to-b from-white to-gray-50 rounded-3xl shadow-xl p-6 md:p-8 animate-section transition-all duration-700 ${visibleSections.has('reviews') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}
            >
                {/* ... existing reviews display code ... */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center shadow-lg">
                        <Star className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Reviews</h2>
                        <p className="text-gray-500 text-sm mt-1">See what our attendees are saying</p>
                    </div>
                </div>

                {errorMessage && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
                        {errorMessage}
                    </div>
                )}

                {showSuccessMessage && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6">
                        Your review has been submitted successfully!
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gradient-to-b from-yellow-50 to-yellow-100 rounded-2xl p-6 border border-yellow-200 text-center">
                        <div className="flex justify-center gap-1 mb-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className={`h-8 w-8 ${star <= Math.round(displayRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                            ))}
                        </div>
                        <p className="text-4xl font-bold text-gray-900">{displayRating.toFixed(1)}</p>
                        <p className="text-gray-600">Based on {displayCount} reviews</p>
                    </div>
                    <div className="bg-accent/10 rounded-2xl p-6 border border-accent/20 text-center">
                        <p className="text-4xl font-bold text-gray-900">{event.attendeesCount || 0}</p>
                        <p className="text-gray-600">Total Attendees</p>
                    </div>
                </div>

                {reviewsLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {reviews.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No reviews yet. Be the first to review this event!
                            </div>
                        ) : (
                            reviews.map((review) => (
                                <div key={review.id} className="group bg-white/70 backdrop-blur-sm rounded-2xl p-6 hover:bg-white transition-all duration-300 hover:shadow-xl border border-gray-100">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-accent rounded-full flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                                                {review.user_avatar || (
                                                    <span>{review.user_name?.charAt(0)?.toUpperCase() || 'U'}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{review.user_name || 'Anonymous User'}</p>
                                                <p className="text-sm text-gray-500">{review.user_role || 'Attendee'}</p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`h-4 w-4 ${i < (review.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-gray-500">{formatDate(review.created_at)}</p>
                                            {user && review.user_id === user.id && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleHideReview}
                                                    className="text-gray-500 hover:text-red-500"
                                                >
                                                    <EyeOff className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </section>

            {!hasReviewed && (
                <section
                    className={`bg-gradient-to-b from-white to-gray-50 rounded-3xl shadow-xl p-6 md:p-8 animate-section transition-all duration-700 delay-100 ${visibleSections.has('reviews') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                        }`}
                    id="review-form"
                >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center shadow-lg">
                            <MessageCircle className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Leave a Review</h2>
                            <p className="text-gray-500 text-sm mt-1">Share your experience with others</p>
                        </div>
                    </div>

                    {!isEventCompleted ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
                            <p className="text-blue-800 font-medium text-lg mb-2">Event in Progress or Upcoming</p>
                            <p className="text-blue-600">
                                Reviews will be available after the event concludes on {new Date(event.end_date || event.date).toLocaleDateString()}.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-100">
                            {!user ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-600 mb-4">You must be logged in to leave a review.</p>
                                    <Link to="/login">
                                        <Button className="bg-accent text-white hover:bg-accent/90 transition-all duration-300 transform hover:scale-105 shadow-xl rounded-2xl">
                                            Login to Review
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 font-medium mb-2">Your Rating</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button key={star} className="p-1" onClick={() => setUserRating(star)}>
                                                    <Star className={`h-8 w-8 ${star <= userRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-400 hover:fill-yellow-400'} transition-colors`} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 font-medium mb-2">Your Review</label>
                                        <textarea
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                                            rows="4"
                                            placeholder="Share your experience with this event..."
                                            value={reviewText}
                                            onChange={(e) => setReviewText(e.target.value)}
                                        ></textarea>
                                    </div>
                                    <Button
                                        onClick={handleSubmitReview}
                                        disabled={submitting || userRating === 0}
                                        className="bg-accent text-white hover:bg-accent/90 transition-all duration-300 transform hover:scale-105 shadow-xl rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submitting ? 'Submitting...' : 'Submit Review'}
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </section>
            )}
        </div>
    )
})
ReviewsTab.displayName = "ReviewsTab"
