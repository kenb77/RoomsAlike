import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ManageBillingButton from "@/components/ManageBillingButton";
import DeleteAccountButton from "@/components/DeleteAccountButton";

export const dynamic = "force-dynamic";

const subscriptionStatusLabel: Record<string, string> = {
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  CANCELED: "Canceled",
  INCOMPLETE: "Incomplete",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      listings: {
        include: { subscription: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!user) redirect("/login");

  const hasBilling = Boolean(user.stripeCustomerId);
  const listingsWithSubs = user.listings.filter((l) => l.subscription);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Account</h1>
        <p className="text-gray-500 text-sm">{user.name} &middot; {user.email}</p>
      </div>

      {user.deletionDenialReason && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-sm text-amber-900">
          <p className="font-medium mb-1">Your deletion request was denied</p>
          <p>{user.deletionDenialReason}</p>
        </div>
      )}

      <div className="border rounded-xl p-5 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Subscription</h2>
          {hasBilling && <ManageBillingButton returnPath="/account" />}
        </div>
        {listingsWithSubs.length === 0 ? (
          <p className="text-sm text-gray-500">No active listing subscriptions.</p>
        ) : (
          <div className="space-y-3">
            {listingsWithSubs.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <div>
                  <Link href={`/listings/${l.id}`} className="font-medium hover:underline">
                    {l.title}
                  </Link>
                  <p className="text-gray-500">
                    {subscriptionStatusLabel[l.subscription!.status] ?? l.subscription!.status}
                    {l.subscription!.currentPeriodEnd &&
                      ` · renews or expires ${new Date(l.subscription!.currentPeriodEnd).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {!hasBilling && (
          <p className="text-xs text-gray-400 mt-3">
            No billing account on file yet — this shows up once you post your first listing.
          </p>
        )}
      </div>

      <div className="border rounded-xl p-5 bg-white space-y-2">
        <h2 className="text-lg font-semibold mb-2">ID verification</h2>
        <p className="text-sm text-gray-500">
          Status: {user.idVerificationStatus === "VERIFIED" ? "Verified" : "Not verified (optional)"}
        </p>
        {user.idVerificationStatus !== "VERIFIED" && (
          <Link href="/verify" className="text-sm text-rose-600 hover:underline">
            Verify your ID →
          </Link>
        )}
      </div>

      <div className="border rounded-xl p-5 bg-white">
        <h2 className="text-lg font-semibold mb-2">Danger zone</h2>
        <DeleteAccountButton />
      </div>
    </div>
  );
}
