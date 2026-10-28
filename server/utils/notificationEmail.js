import nodemailer from "nodemailer";

const hasMailConfig = () => Boolean(
  process.env.SMTP_HOST
  && process.env.SMTP_PORT
  && process.env.SMTP_USER
  && process.env.SMTP_PASSWORD,
);

const mailTransport = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
}[character]));

export const isNotificationEmailConfigured = hasMailConfig;

export const sendNotificationEmail = async ({ to, subject, text }) => {
  if (!hasMailConfig()) {
    throw new Error("Notification email is enabled but SMTP is not configured");
  }
  await mailTransport().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html: `<p>${escapeHtml(text)}</p>`,
  });
};
