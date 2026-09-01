import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import VerifyButton from "@/components/VerifyButton";

export const dynamic = "force-dynamic";

const statusCopy: Record<string, { title: string; body: string }> = {
  UNVERIFIED: {
    title: "Verify your ID",
    body: "Hosts need a verified ID to post a listing, and renters need one to request a booking. Verification is handled securely by Stripe — we never see or store your ID.",
  },
  PENDING: {
    title: "Verification in progress",
    body: "We've received your submission and are waiting on the result. This usually finishes within a few minutes — check back shortly.",
  },
  VERIFIED: {
    title: "You're verified",
    body: "Your ID has been verified. You can post listings and request bookings.",
  },
  FAILED: {
    title: "Verification didn't go through",
    body: "Something didn't check out — an expired document, a mismatch, or an unsupported document type. You can try again below.",
  },
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: { complete?: string };
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  const copy = statusCopy[user.idVerificationStatus] ?? statusCopy.UNVERIFIED;

  return (
    <div className="max-w-md mx-auto px-6 py-16 text-center">
      {searchParams.complete && user.idVerificationStatus === "PENDING" && (
        <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          Submission received &mdash; we&apos;re waiting on Stripe to finish processing it.
        </p>
      )}

      <h1 className="text-2xl font-semibold mb-2">{copy.title}</h1>
      <p className="text-gray-500 mb-8">{copy.body}</p>

      {user.idVerificationStatus !== "VERIFIED" && (
        <VerifyButton canRetry={user.idVerificationStatus === "FAILED"} />
      )}
    </div>
  );
}
