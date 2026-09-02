import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.EMAIL_FROM ?? "RoomsAlike <onboarding@resend.dev>";

// Fire-and-forget: notification emails should never break the request that
// triggered them. If Resend isn't configured (no API key yet) or the send
// fails for any reason, we just log it and move on.
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.log(`[email] RESEND_API_KEY not set — skipping email to ${to}: ${subject}`);
    return;
  }

  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("[email] failed to send", err);
  }
}

export function bookingRequestEmail(opts: {
  hostName: string;
  renterName: string;
  listingTitle: string;
  startTime: Date;
  endTime: Date;
  listingUrl: string;
}) {
  return {
    subject: `New booking request for ${opts.listingTitle}`,
    html: `
      <p>Hi ${opts.hostName},</p>
      <p><strong>${opts.renterName}</strong> requested to book <strong>${opts.listingTitle}</strong>:</p>
      <p>${opts.startTime.toLocaleString()} &ndash; ${opts.endTime.toLocaleString()}</p>
      <p><a href="${opts.listingUrl}">View and respond</a></p>
    `,
  };
}

export function bookingStatusEmail(opts: {
  renterName: string;
  listingTitle: string;
  status: "APPROVED" | "CANCELLED";
  listingUrl: string;
}) {
  const verb = opts.status === "APPROVED" ? "approved" : "cancelled";
  return {
    subject: `Your booking request was ${verb} — ${opts.listingTitle}`,
    html: `
      <p>Hi ${opts.renterName},</p>
      <p>Your booking request for <strong>${opts.listingTitle}</strong> was <strong>${verb}</strong>.</p>
      ${
        opts.status === "APPROVED"
          ? "<p>Message the host to arrange the deposit and payment before your booking.</p>"
          : ""
      }
      <p><a href="${opts.listingUrl}">View booking</a></p>
    `,
  };
}

export function newMessageEmail(opts: {
  recipientName: string;
  senderName: string;
  listingTitle: string;
  conversationUrl: string;
}) {
  return {
    subject: `New message from ${opts.senderName} — ${opts.listingTitle}`,
    html: `
      <p>Hi ${opts.recipientName},</p>
      <p><strong>${opts.senderName}</strong> sent you a message about <strong>${opts.listingTitle}</strong>.</p>
      <p><a href="${opts.conversationUrl}">Read and reply</a></p>
    `,
  };
}

export function newListingPendingReviewEmail(opts: {
  listingTitle: string;
  adminUrl: string;
}) {
  return {
    subject: `New listing awaiting review — ${opts.listingTitle}`,
    html: `
      <p><strong>${opts.listingTitle}</strong> just went live on payment and is waiting on admin approval before it's visible to renters.</p>
      <p><a href="${opts.adminUrl}">Review it</a></p>
    `,
  };
}

export function listingReviewedEmail(opts: {
  hostName: string;
  listingTitle: string;
  approved: boolean;
  rejectionReason?: string | null;
  listingUrl: string;
}) {
  return {
    subject: opts.approved
      ? `Your listing is live — ${opts.listingTitle}`
      : `Your listing needs changes — ${opts.listingTitle}`,
    html: opts.approved
      ? `
        <p>Hi ${opts.hostName},</p>
        <p>Good news — <strong>${opts.listingTitle}</strong> has been approved and is now live for renters to book.</p>
        <p><a href="${opts.listingUrl}">View your listing</a></p>
      `
      : `
        <p>Hi ${opts.hostName},</p>
        <p><strong>${opts.listingTitle}</strong> wasn't approved yet${
          opts.rejectionReason ? `: ${opts.rejectionReason}` : "."
        }</p>
        <p>Update it and it'll go back into review after your next payment cycle, or reach out if you have questions.</p>
        <p><a href="${opts.listingUrl}">View your listing</a></p>
      `,
  };
}
