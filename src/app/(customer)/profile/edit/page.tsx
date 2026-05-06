import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import EditProfileForm from "@/components/profile/EditProfileForm";

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
    <div className="bg-[#f5f6f8] text-on-background min-h-screen flex flex-col font-sans">
      <EditProfileForm initialData={initialData} userId={user.id} />
    </div>
  );
}
