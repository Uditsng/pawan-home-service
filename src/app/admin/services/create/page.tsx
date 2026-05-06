import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/Button";

export default async function AdminCreateServicePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') redirect('/');

  async function createServiceAction(formData: FormData) {
    "use server";
    const db = await createClient();
    
    // Core details
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const base_price = parseFloat(formData.get("base_price") as string);
    const description = formData.get("description") as string;
    
    
    // Rich Page Content
    const about_text = formData.get("about_text") as string;
    
    // Arrays separated by newline
    const includedRaw = formData.get("included_features") as string;
    const excludedRaw = formData.get("excluded_features") as string;
    const included_features = includedRaw.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    const excluded_features = excludedRaw.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    
    // Simplistic FAQs
    const faqQ1 = formData.get("faq_q_1") as string;
    const faqA1 = formData.get("faq_a_1") as string;
    const faqs = [];
    if (faqQ1 && faqA1) faqs.push({ question: faqQ1, answer: faqA1 });

    const page_content = {
      about_text,
      included_features,
      excluded_features,
      faqs,
      why_choose_us: [
         { icon: "verified_user", title: "Verified Professionals", desc: "Background-checked and certified experts." },
         { icon: "timer", title: "On-Time Service", desc: "We respect your schedule." }
      ],
      how_to_book_steps: [
         { step: 1, title: "Choose Service", desc: "Select and confirm your location" },
         { step: 2, title: "Pick Schedule", desc: "Select a date and time" },
         { step: 3, title: "Service Done", desc: "Professional arrives to complete the job" }
      ]
    };

    const { error } = await db.from("services").insert({
      title,
      category,
      base_price,
      description,
      is_active: true,
      page_content,
      // Pass image URL dynamically based on db capabilities.
      // If image_url column doesn't exist we can fallback later, or store in page_content.
    });

    if (!error) {
      revalidatePath('/admin/services');
      revalidatePath('/');
      redirect('/admin/services');
    } else {
      console.error(error);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto pb-32">
      <div className="mb-8">
        <Link href="/admin/services" className="text-on-surface-variant hover:text-primary flex items-center gap-1 mb-4 font-bold text-sm">
           <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Services
        </Link>
        <h1 className="text-3xl font-bold font-headline text-primary">Add New Service</h1>
      </div>

      <form action={createServiceAction} className="space-y-8 bg-surface-container-lowest p-8 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-outline-variant/20">
        
        {/* Core Settings */}
        <div>
           <h2 className="text-xl font-bold mb-4 border-b border-outline-variant/10 pb-2 text-primary">Core Settings</h2>
           <div className="grid grid-cols-2 gap-6">
              <div>
                 <label className="block text-sm font-bold text-on-surface-variant mb-2">Service Title</label>
                 <input name="title" required type="text" className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. Premium Bathroom Cleaning" />
              </div>
              <div>
                 <label className="block text-sm font-bold text-on-surface-variant mb-2">Category Key</label>
                 <input name="category" required type="text" className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. cleaning" />
              </div>
              <div>
                 <label className="block text-sm font-bold text-on-surface-variant mb-2">Base Price (₹)</label>
                 <input name="base_price" required type="number" step="0.01" className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. 599.00" />
              </div>
              <div>
                 <label className="block text-sm font-bold text-on-surface-variant mb-2">Image URL (Optional)</label>
                 <input name="image_url" type="text" className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="https://..." />
              </div>
           </div>
           
           <div className="mt-6">
              <label className="block text-sm font-bold text-on-surface-variant mb-2">Short Description (For listings)</label>
              <textarea name="description" required rows={2} className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Brief summary of the service..."></textarea>
           </div>
        </div>

        {/* Detailed Page Content */}
        <div className="pt-8">
           <h2 className="text-xl font-bold mb-4 border-b border-outline-variant/10 pb-2 text-primary">Detailed Page Content</h2>
           
           <div className="space-y-6">
              <div>
                 <label className="block text-sm font-bold text-on-surface-variant mb-2">About The Service (Detailed paragraph)</label>
                 <textarea name="about_text" rows={4} className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Full detailed description for the service landing page..."></textarea>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-bold text-on-surface-variant mb-2">What's Included</label>
                    <p className="text-xs text-on-surface-variant/60 mb-2">Enter one item per line</p>
                    <textarea name="included_features" rows={5} className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Feature 1&#10;Feature 2"></textarea>
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-on-surface-variant mb-2">What's Excluded</label>
                    <p className="text-xs text-on-surface-variant/60 mb-2">Enter one item per line</p>
                    <textarea name="excluded_features" rows={5} className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Limitation 1&#10;Limitation 2"></textarea>
                 </div>
              </div>
              
              <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
                 <h3 className="font-bold mb-3 text-primary">Add Primary FAQ</h3>
                 <div className="space-y-3">
                    <input name="faq_q_1" type="text" className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Question?" />
                    <input name="faq_a_1" type="text" className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Answer..." />
                 </div>
              </div>
           </div>
        </div>

        <div className="flex justify-end border-t border-outline-variant/10 pt-8">
           <Button type="submit" variant="primary" size="lg">
             Publish Service
           </Button>
        </div>
      </form>
    </div>
  );
}
