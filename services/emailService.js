import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const sendEventApprovedEmail = async ({ to, name, eventTitle }) => {
    await transporter.sendMail({
        from: `"Accommodations" <${process.env.MAIL_USER}>`,
        to,
        subject: "Your event has been approved 🎉",
        html: `
      <p>Hi ${name},</p>
      <p>Your event <b>${eventTitle}</b> has been approved and is now live.</p>
      <p>You can manage your event from your dashboard.</p>
      <br />
      <p>Thanks,<br/>Team Accommodations</p>
    `
    });
};

export const sendPropertyApprovedEmail = async ({ to }) => {
    await transporter.sendMail({
        from: `"Accommodations" <${process.env.MAIL_USER}>`,
        to,
        subject: "Your property has been approved",
        html: `
      <p>Hi,</p>

<p>
We’re happy to inform you that your property has been <strong>approved</strong> and is now visible on our platform.
</p>

<p>
You can manage your property, update details, or track enquiries by logging into your dashboard.
</p>

<p>
If you have any questions or need assistance, feel free to reach out to our support team.
</p>

<br />

<p>
Regards,<br />
<strong>Accommodations Team</strong>
</p>

    `
    });
};

