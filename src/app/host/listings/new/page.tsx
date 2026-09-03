import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import NewListingForm from "@/components/NewListingForm";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-2">Post a new space</h1>
      <p className="text-sm text-gray-500 mb-6">
        Your listing goes live once your monthly subscription is active and an
        admin approves it.
      </p>
      <NewListingForm />
    </div>
  );
}
