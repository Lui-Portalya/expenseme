import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PasswordForm, ProfileForm } from "@/components/SettingsForms";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid max-w-xl gap-4">
        <ProfileForm name={user.name} currency={user.currency} />
        <PasswordForm />
      </div>
    </>
  );
}
