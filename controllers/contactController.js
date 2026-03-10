import { sendNotificationEmail, NOTIFICATION_TYPES } from "../services/emailService.js";

/**
 * POST /contact/submit
 */
export const submitContactForm = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, subject, message } = req.body;

        if (!firstName || !lastName || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all required fields (firstName, lastName, email, subject, message).",
            });
        }

        await sendNotificationEmail({
            to: "accommodations.nextkinlife@gmail.com",
            type: NOTIFICATION_TYPES.CONTACT_FORM,
            data: { firstName, lastName, email, phone, subject, message },
        });

        return res.status(200).json({
            success: true,
            message: "Your message has been sent successfully. We'll get back to you within 24 hours.",
        });
    } catch (error) {
        console.error("❌ Contact form email error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to send your message. Please try again.",
        });
    }
};