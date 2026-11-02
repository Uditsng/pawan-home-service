import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import EditProfileForm from "@/components/profile/EditProfileForm";

export const metadata: Metadata = {
  title: "Edit Profile | PHS Cleaning Company",
  description: "Update your customer profile details, phone number, and photo.",
};

export default async function EditProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  const initialData = {
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    email: user.email || "",
    avatar_url: profile?.avatar_url || ""
  };

  return (
    <div className="bg-surface-dim text-on-background min-h-screen flex flex-col font-body w-full max-w-full overflow-x-hidden min-w-0">
      <EditProfileForm initialData={initialData} userId={user.id} />
    </div>
  );
}
