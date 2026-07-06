import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import InvoiceSettingsForm from "./InvoiceSettingsForm";
import Link from "next/link";
import { InvoiceSeller } from "@/lib/invoice/invoiceTypes";

const DEFAULT_COMPANY_PROFILE: InvoiceSeller = {
  company_name: "PHS Cleaning Company",
  legal_name: "PHS Cleaning Company Private Limited",
  logo_url: "/PHS.png",
  gst_number: "05AAACP9876M1ZX",
  support_phone: "+91 98765 43210",
  support_email: "support@phs.com",
  website: "www.phs.com",
  address: "123, Premium Heights, Civil Lines, Dehradun, Uttarakhand - 248001",
  tagline: "Professional Home Services",
  footer_text: "Thank you for choosing PHS Cleaning Company. We value your business!",
};

export default async function AdminInvoiceSettingsPage() {
  const supabase = await createClient();

  // Validate admin authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/login");
  }

  // Fetch current company settings
  const { data: companySetting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "invoice_company_profile")
    .maybeSingle();

  let initialSettings = DEFAULT_COMPANY_PROFILE;
  if (companySetting?.value) {
    try {
      initialSettings = typeof companySetting.value === "string"
        ? JSON.parse(companySetting.value)
        : companySetting.value;
    } catch (e) {
      console.warn("Failed to parse invoice settings from DB:", e);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <section className="flex items-center justify-between">
        <div>
          <Link 
            href="/admin/settings" 
            className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors mb-2"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Settings
          </Link>
          <h1 className="text-2xl font-black tracking-tighter text-primary font-headline">Invoice Settings</h1>
          <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">Manage dynamic company details, logos, and support details embedded in invoices.</p>
        </div>
      </section>

      <InvoiceSettingsForm initialSettings={initialSettings} />
    </div>
  );
}
