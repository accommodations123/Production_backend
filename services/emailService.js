// src/services/emailService.js
import nodemailer from "nodemailer";
import "dotenv/config";

import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🔥 LOADED EMAIL SERVICE FILE:", __filename);


/**
 * INTERNAL NOTIFICATION TYPES
 */
export const NOTIFICATION_TYPES = {
  HOST_APPROVED: "HOST_APPROVED",
  HOST_REJECTED: "HOST_REJECTED",

  EVENT_APPROVED: "EVENT_APPROVED",
  EVENT_REJECTED: "EVENT_REJECTED",

  PROPERTY_APPROVED: "PROPERTY_APPROVED",
  PROPERTY_REJECTED: "PROPERTY_REJECTED",

  BUYSELL_APPROVED: "BUYSELL_APPROVED",
  BUYSELL_REJECTED: "BUYSELL_REJECTED",

  TRAVEL_APPROVED: "TRAVEL_APPROVED",
  TRAVEL_REJECTED: "TRAVEL_REJECTED",

  COMMUNITY_APPROVED: "COMMUNITY_APPROVED",
  COMMUNITY_REJECTED: "COMMUNITY_REJECTED",
  COMMUNITY_SUSPENDED: "COMMUNITY_SUSPENDED",

  TRAVEL_MATCH_REQUESTED: "TRAVEL_MATCH_REQUESTED",
  TRAVEL_MATCH_ACCEPTED: "TRAVEL_MATCH_ACCEPTED",
  TRAVEL_MATCH_REJECTED: "TRAVEL_MATCH_REJECTED",
  TRAVEL_MATCH_CANCELLED: "TRAVEL_MATCH_CANCELLED",
  TRAVEL_TRIP_CANCELLED: "TRAVEL_TRIP_CANCELLED",
  APPLICATION_UPDATE: "APPLICATION_UPDATE",
  SCHEDULE_CALL: "SCHEDULE_CALL",
  CONTACT_FORM: "CONTACT_FORM",

};

/**
 * SMTP TRANSPORTER
 */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((err) => {
  if (err) {
    console.error("❌ Mail server error:", err);
  } else {
    console.log("✅ Mail server ready");
  }
});

/**
 * EMAIL TEMPLATES (Expanded & Professional)
 */
const templates = {
  [NOTIFICATION_TYPES.HOST_APPROVED]: () => ({
    subject: "Welcome! Your Host Profile is Approved",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4CAF50;">Congratulations!</h2>
        <p>We are happy to inform you that your <strong>Host Profile</strong> has been successfully reviewed and approved by our team.</p>
        <p>You can now start creating listings, managing your calendar, and connecting with guests from all over the world.</p>
        <br/>
        <p>Log in to your dashboard to get started.</p>
        <br/>
        <p style="color: #777;">— Accommodations Team</p>
      </div>
    `
  }),

  [NOTIFICATION_TYPES.HOST_REJECTED]: (d) => ({
    subject: "Update on your Host Profile Application",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #f44336;">Update regarding your Host Profile</h2>
        <p>We have reviewed your application to become a host on our platform. Unfortunately, we cannot approve it at this time.</p>
        <p><strong>Reason:</strong> ${d.reason || "The information provided does not meet our current guidelines."}</p>
        <p>We encourage you to review the requirements and apply again once you have updated your details.</p>
        <br/>
        <p style="color: #777;">— Accommodations Team</p>
      </div>
    `
  }),

  [NOTIFICATION_TYPES.EVENT_APPROVED]: (d) => ({
    subject: "Your event is now live!",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4CAF50;">Great news! Event Approved.</h2>
        <p>Your event <strong>"${d.title}"</strong> has passed our review process and is now visible to the public.</p>
        <p>Users can now see your event, and you can start accepting registrations. Make sure to check your dashboard for any new sign-ups.</p>
        <br/>
        <p style="color: #777;">— Accommodations Team</p>
      </div>
    `
  }),

  [NOTIFICATION_TYPES.EVENT_REJECTED]: (d) => ({
    subject: "Event Submission Update",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #f44336;">Event Rejected</h2>
        <p>After reviewing your event <strong>"${d.title}"</strong>, we are unable to approve it at this moment.</p>
        <p><strong>Reason for Rejection:</strong> ${d.reason || "Content violation or missing required details."}</p>
        <p>Please review our community guidelines and feel free to resubmit your event with the necessary corrections.</p>
        <br/>
        <p style="color: #777;">— Accommodations Team</p>
      </div>
    `
  }),

  [NOTIFICATION_TYPES.PROPERTY_APPROVED]: () => ({
    subject: "Your Property is Now Live",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4CAF50;">Property Approved!</h2>
        <p>Your property listing has been successfully verified and is now visible on our platform.</p>
        <p>Users searching for accommodation in your area will now be able to view your property. Expect to receive booking inquiries soon!</p>
        <br/>
        <p style="color: #777;">— Accommodations Team</p>
      </div>
    `
  }),

  [NOTIFICATION_TYPES.PROPERTY_REJECTED]: (d) => ({
    subject: "Property Listing Review",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #f44336;">Property Listing Rejected</h2>
        <p>We regret to inform you that your property listing could not be approved.</p>
        <p><strong>Reason:</strong> ${d.reason || "Insufficient details or image quality issues."}</p>
        <p>Please update your listing details and submit it again for review.</p>
        <br/>
        <p style="color: #777;">— Accommodations Team</p>
      </div>
    `
  }),

  [NOTIFICATION_TYPES.BUYSELL_APPROVED]: () => ({
    subject: "Listing Approved: Your item is now visible",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4CAF50;">Listing Approved</h2>
        <p>Your buy/sell listing has been approved and is now live on our marketplace.</p>
        <p>Interested buyers or sellers in your area can now contact you.</p>
        <br/>
        <p style="color: #777;">— Accommodations Team</p>
      </div>
    `
  }),

  [NOTIFICATION_TYPES.BUYSELL_REJECTED]: (d) => ({
    subject: "Listing Rejected",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #f44336;">Listing Rejected</h2>
        <p>We have reviewed your listing and it does not currently meet our standards for publication.</p>
        <p><strong>Reason:</strong> ${d.reason || "Policy violation."}</p>
        <p>Please review our posting guidelines.</p>
        <br/>
        <p style="color: #777;">— Accommodations Team</p>
      </div>
    `
  }),

  [NOTIFICATION_TYPES.COMMUNITY_APPROVED]: () => ({
    subject: "Community Group Approved",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4CAF50;">Community Approved</h2>
        <p>Your community group has been created and is now live. You can start inviting members and posting content.</p>
        <p>Thank you for building a space for our users to connect.</p>
        <br/>
        <p style="color: #777;">— Accommodations Team</p>
      </div>
    `
  }),

  [NOTIFICATION_TYPES.COMMUNITY_REJECTED]: (d) => ({
    subject: "Community Group Rejected",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #f44336;">Community Group Rejected</h2>
        <p>Unfortunately, your community group request was rejected.</p>
        <p><strong>Reason:</strong> ${d.reason || "Content guidelines not met."}</p>
        <p>Please review our community standards and try again.</p>
        <br/>
        <p style="color: #777;">— Accommodations Team</p>
      </div>
    `
  }),

  [NOTIFICATION_TYPES.COMMUNITY_SUSPENDED]: () => ({
    subject: "Action Required: Community Suspended",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #FF9800;">Community Suspended</h2>
        <p>Your community group has been suspended by the administration due to a violation of our policies.</p>
        <p>If you believe this is a mistake, please contact our support team immediately with details.</p>
        <br/>
        <p style="color: #777;">— Accommodations Team</p>
      </div>
    `
  }),
  [NOTIFICATION_TYPES.TRAVEL_MATCH_REQUESTED]: () => ({
    subject: "New Travel Match Request",
    html: `
    <h2>New Travel Match Request</h2>
    <p>You have received a new travel match request.</p>
    <p>Please log in to review and respond.</p>
  `
  }),

  [NOTIFICATION_TYPES.TRAVEL_MATCH_ACCEPTED]: () => ({
    subject: "Travel Match Accepted",
    html: `
    <h2>Match Accepted</h2>
    <p>Your travel match request has been accepted.</p>
    <p>You can now contact your travel partner.</p>
  `
  }),

  [NOTIFICATION_TYPES.TRAVEL_MATCH_REJECTED]: () => ({
    subject: "Travel Match Rejected",
    html: `
    <h2>Match Rejected</h2>
    <p>Your travel match request was rejected.</p>
  `
  }),


  [NOTIFICATION_TYPES.TRAVEL_MATCH_CANCELLED]: () => ({
    subject: "Travel Match Cancelled",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #f44336;">Match Cancelled</h2>
        <p>We regret to inform you that a travel match you were involved in has been cancelled by an administrator.</p>
        <p>This may be due to policy violations or changes in the trip schedule. Please check your dashboard for available alternatives.</p>
        <br/>
        <p style="color: #777;">— Accommodations Team</p>
      </div>
    `
  }),

  [NOTIFICATION_TYPES.TRAVEL_TRIP_CANCELLED]: () => ({
    subject: "Travel Trip Cancelled",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #f44336;">Trip Cancelled</h2>
        <p>Your scheduled travel trip has been cancelled by the administration.</p>
        <p>If you believe this is an error, or if you need assistance rescheduling, please contact our support team.</p>
        <br/>
        <p style="color: #777;">— Accommodations Team</p>
      </div>
    `
  }),
  APPLICATION_UPDATE: (d) => ({
    subject: d.subject || "Application Update",
    html: `
    <div style="font-family: Arial, sans-serif;">
      <h2>Application Status Update</h2>
      <p>${d.message}</p>

      <p>
        <strong>Status:</strong> ${d.status}
      </p>

      <p>
        Job ID: ${d.jobId}<br/>
        Application ID: ${d.applicationId}
      </p>

      <p style="color:#777;">— Accommodations Team</p>
    </div>
  `
  }),

  [NOTIFICATION_TYPES.SCHEDULE_CALL]: (d) => ({
    subject: `New Scheduled Call Request — ${d.date || "Upcoming"}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed, #06b6d4); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">📞 New Call Scheduled</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; margin-bottom: 20px;">A visitor has scheduled a call through the NextKinLife website.</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 12px; background: #fff; border: 1px solid #e5e7eb; font-weight: bold; width: 140px;">📅 Date</td>
              <td style="padding: 12px; background: #fff; border: 1px solid #e5e7eb;">${d.date || "Not specified"}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold;">🕐 Time Slot</td>
              <td style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb;">${d.timeSlot || "Not specified"}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: #fff; border: 1px solid #e5e7eb; font-weight: bold;">📞 Contact Number</td>
              <td style="padding: 12px; background: #fff; border: 1px solid #e5e7eb;">+1 314 548 9101</td>
            </tr>
          </table>
          <p style="color: #6b7280; font-size: 14px;">The visitor has been provided with the phone number and email to reach out during the selected time slot.</p>
          <br/>
          <p style="color: #777;">— NextKinLife Team</p>
        </div>
      </div>
    `
  }),

  [NOTIFICATION_TYPES.CONTACT_FORM]: (d) => ({
    subject: `New Contact Form Submission — ${d.subject || "General Inquiry"}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed, #06b6d4); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">✉️ New Contact Form Submission</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; margin-bottom: 20px;">A visitor has submitted the contact form on the NextKinLife website.</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 12px; background: #fff; border: 1px solid #e5e7eb; font-weight: bold; width: 140px;">👤 Name</td>
              <td style="padding: 12px; background: #fff; border: 1px solid #e5e7eb;">${d.firstName || ""} ${d.lastName || ""}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold;">📧 Email</td>
              <td style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb;">${d.email || "Not provided"}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: #fff; border: 1px solid #e5e7eb; font-weight: bold;">📞 Phone</td>
              <td style="padding: 12px; background: #fff; border: 1px solid #e5e7eb;">${d.phone || "Not provided"}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold;">📋 Subject</td>
              <td style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb;">${d.subject || "General Inquiry"}</td>
            </tr>
          </table>
          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="font-weight: bold; margin: 0 0 8px 0; color: #374151;">💬 Message:</p>
            <p style="margin: 0; color: #4b5563; white-space: pre-wrap;">${d.message || "No message provided"}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">You can reply directly to this email to respond to the visitor at ${d.email || "their email"}.</p>
          <br/>
          <p style="color: #777;">— NextKinLife Team</p>
        </div>
      </div>
    `
  }),

};



/**
 * SEND EMAIL
 */
export const sendNotificationEmail = async ({ to, type, data }) => {
  console.log("🔥 EMAIL SERVICE CALLED");
  console.log("🔥 TYPE RECEIVED:", type);

  const template = templates[type];
  if (!template) {
    throw new Error(`No email template for type: ${type}`);
  }

  const { subject, html } = template(data || {});

  return transporter.sendMail({
    from: `"Accommodations" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
};
