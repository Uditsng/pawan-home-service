import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminSettingsPage() {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-primary font-headline">Platform Settings</h1>
        <p className="text-on-surface-variant font-medium">Global configurations, tax rules, and operational boundaries.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tax & Currency */}
        <Card variant="solid" className="space-y-6">
           <h3 className="text-lg font-bold tracking-tight text-primary font-headline">Financial Rules</h3>
           <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Platform Tax (GST)</label>
                <input type="text" defaultValue="18%" className="w-full p-3 rounded-xl bg-surface-container border border-outline-variant/20 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Default Currency</label>
                <input type="text" defaultValue="INR (₹)" disabled className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-bold text-on-surface-variant" />
              </div>
           </div>
        </Card>

        {/* Policies */}
        <Card variant="solid" className="space-y-6">
           <h3 className="text-lg font-bold tracking-tight text-primary font-headline">Cancellation & SLAs</h3>
           <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Free Cancellation Window</label>
                <input type="text" defaultValue="2 Hours before" className="w-full p-3 rounded-xl bg-surface-container border border-outline-variant/20 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Partner Penalty Rate</label>
                <input type="text" defaultValue="10% of job" className="w-full p-3 rounded-xl bg-surface-container border border-outline-variant/20 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
           </div>
        </Card>

        {/* Zones */}
        <Card variant="solid" className="space-y-6">
           <h3 className="text-lg font-bold tracking-tight text-primary font-headline">Service Areas</h3>
           <div className="flex flex-wrap gap-2">
              {['Roorkee', 'Chandigarh', 'Dehradun', 'Haridwar'].map(city => (
                <span key={city} className="px-3 py-1.5 rounded-xl bg-surface-container-high text-on-surface text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  {city} <span className="material-symbols-outlined text-[10px] cursor-pointer hover:text-red-500">close</span>
                </span>
              ))}
              <button className="px-3 py-1.5 rounded-xl border border-dashed border-outline-variant/30 text-on-surface-variant/60 text-[10px] font-black uppercase tracking-widest hover:border-primary hover:text-primary transition-all">
                + Add City
              </button>
           </div>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
         <Button variant="primary" size="lg" className="shadow-xl">Save Global Configurations</Button>
      </div>
    </div>
  );
}
