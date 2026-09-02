import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewListingForm from "@/components/NewListingForm";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  if (user?.idVerificationStatus !== "VERIFIED") {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-2">Verify your ID first</h1>
        <p className="text-gray-500 mb-8">
          Hosts need a verified ID before posting a listing.
        </p>
        <Link
          href="/verify"
          className="inline-block rounded-full bg-rose-600 text-white px-6 py-3 font-medium hover:bg-rose-700"
        >
          Verify your ID
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-2">Post a new space</h1>
      <p className="text-sm text-gray-500 mb-6">
        Your listing goes live once your monthly subscription is active.
      </p>
      <NewListingForm />
    </div>
  );
}
