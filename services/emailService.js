// src/services/emailService.js
import nodemailer from "nodemailer";
import "dotenv/config";

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

  TRAVEL_MATCH_CANCELLED: "TRAVEL_MATCH_CANCELLED",
  TRAVEL_TRIP_CANCELLED: "TRAVEL_TRIP_CANCELLED"
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
 * EMAIL TEMPLATES
 */
const templates = {
  [NOTIFICATION_TYPES.HOST_APPROVED]: () => ({
    subject: "Host profile approved",
    html: `<p>Your host profile <b>has been</b> approved.</p><br/><p>— Accommodations Team</p>`
  }),

  [NOTIFICATION_TYPES.HOST_REJECTED]: (d) => ({
    subject: "Host profile rejected",
    html: `<p>Your host profile was rejected.</p>
           <p>Reason: ${d.reason || "Not specified"}</p>
           <br/><p>— Accommodations Team</p>`
  }),

  [NOTIFICATION_TYPES.EVENT_APPROVED]: (d) => ({
    subject: "Event approved",
    html: `<p>Your event <b>${d.title}</b> is now live.</p>
           <br/><p>— Accommodations Team</p>`
  }),

  [NOTIFICATION_TYPES.EVENT_REJECTED]: (d) => ({
    subject: "Event rejected",
    html: `<p>Your event <b>${d.title}</b> was rejected.</p>
           <p>Reason: ${d.reason || "Not specified"}</p>
           <br/><p>— Accommodations Team</p>`
  }),

  [NOTIFICATION_TYPES.PROPERTY_APPROVED]: () => ({
    subject: "Property approved",
    html: `<p>Your property <b>has been</b> approved and is now visible.</p>
           <br/><p>— Accommodations Team</p>`
  }),

  [NOTIFICATION_TYPES.PROPERTY_REJECTED]: (d) => ({
    subject: "Property rejected",
    html: `<p>Your property was rejected.</p>
           <p>Reason: ${d.reason || "Not specified"}</p>
           <br/><p>— Accommodations Team</p>`
  }),

  [NOTIFICATION_TYPES.BUYSELL_APPROVED]: () => ({
    subject: "Listing approved",
    html: `<p>Your buy/sell listing <b>has been</b> approved.</p>
           <br/><p>— Accommodations Team</p>`
  }),

  [NOTIFICATION_TYPES.BUYSELL_REJECTED]: (d) => ({
    subject: "Listing rejected",
    html: `<p>Your buy/sell listing was rejected.</p>
           <p>Reason: ${d.reason || "Not specified"}</p>
           <br/><p>— Accommodations Team</p>`
  }),

  [NOTIFICATION_TYPES.COMMUNITY_APPROVED]: () => ({
    subject: "Community approved",
    html: `
      <p>Your community <b>has been</b> approved and is now live.</p>
      <br/><p>— Accommodations Team</p>
    `
  }),

  [NOTIFICATION_TYPES.COMMUNITY_REJECTED]: (d) => ({
    subject: "Community rejected",
    html: `
      <p>Your community was rejected.</p>
      <p>Reason: ${d.reason || "Not specified"}</p>
      <br/><p>— Accommodations Team</p>
    `
  }),

  [NOTIFICATION_TYPES.COMMUNITY_SUSPENDED]: () => ({
    subject: "Community suspended",
    html: `
      <p>Your community <b>has been</b> suspended by admin.</p>
      <p>Please contact support for clarification.</p>
      <br/><p>— Accommodations Team</p>
    `
  }),

  [NOTIFICATION_TYPES.TRAVEL_MATCH_CANCELLED]: () => ({
    subject: "Travel match cancelled",
    html: `
      <p>Your travel match was cancelled by admin.</p>
      <br/><p>— Accommodations Team</p>
    `
  }),

  [NOTIFICATION_TYPES.TRAVEL_TRIP_CANCELLED]: () => ({
    subject: "Travel trip cancelled",
    html: `
      <p>Your travel trip was cancelled by admin.</p>
      <br/><p>— Accommodations Team</p>
    `
  }),
};

/**
 * SEND EMAIL
 */
export const sendNotificationEmail = async ({ to, type, data }) => {
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