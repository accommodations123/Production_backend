import { sendNotificationEmail, NOTIFICATION_TYPES } from "../services/emailService.js";

export const scheduleCall = async (req, res) => {
    try {
        const { date, timeSlot } = req.body;

        if (!date || !timeSlot) {
            return res.status(400).json({
                success: false,
                message: "Date and time slot are required.",
            });
        }

        await sendNotificationEmail({
            to: "accommodations.nextkinlife@gmail.com",
            type: NOTIFICATION_TYPES.SCHEDULE_CALL,
            data: { date, timeSlot },
        });

        return res.status(200).json({
            success: true,
            message: "Schedule call notification sent successfully.",
        });

    } catch (error) {
        console.error("❌ Schedule call email error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send notification. Please try again.",
        });
    }
};