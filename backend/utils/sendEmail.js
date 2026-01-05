const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, content, isHTML = false) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"IMRAS System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      ...(isHTML ? { html: content } : { text: content })
    });

    console.log(`✅ Email sent to ${to}`);
  } catch (err) {
    console.error("❌ Email sending failed:", err);
  }
};

module.exports = sendEmail;
