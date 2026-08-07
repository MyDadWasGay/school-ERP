import { InviteAcceptForm } from "@/features/users/components/invite-accept-form";

export default async function InvitationAcceptPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <InviteAcceptForm token={token ?? ""} />;
}
