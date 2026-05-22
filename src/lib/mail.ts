// const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const domain = "http://localhost:3000";

// Replace these with actual Resend API implementation once API keys are provided.
// import { Resend } from "resend";
// const resend = new Resend(process.env.RESEND_API_KEY);

export const sendTwoFactorTokenEmail = async (
  email: string,
  token: string
) => {
  console.log(`[EMAIL MOCK] To: ${email}`);
  console.log(`[EMAIL MOCK] Subject: 2FA Code`);
  console.log(`[EMAIL MOCK] Body: Your 2FA code: ${token}`);

  /*
  await resend.emails.send({
    from: "mail@tiket.dev",
    to: email,
    subject: "2FA Code",
    html: `<p>Your 2FA code: ${token}</p>`
  });
  */
};

export const sendPasswordResetEmail = async (
  email: string,
  token: string
) => {
  const resetLink = `${domain}/new-password?token=${token}`;

  console.log(`[EMAIL MOCK] To: ${email}`);
  console.log(`[EMAIL MOCK] Subject: Reset your password`);
  console.log(`[EMAIL MOCK] Body: Click here: ${resetLink}`);

  /*
  await resend.emails.send({
    from: "mail@tiket.dev",
    to: email,
    subject: "Reset your password",
    html: `<p>Click <a href="${resetLink}">here</a> to reset password.</p>`
  });
  */
};

export const sendVerificationEmail = async (
  email: string,
  token: string
) => {
  const confirmLink = `${domain}/new-verification?token=${token}`;

  console.log(`[EMAIL MOCK] To: ${email}`);
  console.log(`[EMAIL MOCK] Subject: Confirm your email`);
  console.log(`[EMAIL MOCK] Body: Click here: ${confirmLink}`);

  /*
  await resend.emails.send({
    from: "mail@tiket.dev",
    to: email,
    subject: "Confirm your email",
    html: `<p>Click <a href="${confirmLink}">here</a> to confirm email.</p>`
  });
  */
};
