import { Card } from "@/components/ui/Card";

export default async function AdminAnalyticsPage() {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-primary font-headline">Intelligence & Reports</h1>
        <p className="text-on-surface-variant font-medium">Deep insights into retention, profitability, and growth patterns.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Retention Analysis */}
        <Card variant="solid">
          <h3 className="text-xl font-bold tracking-tight text-primary font-headline mb-6">Customer Retention</h3>
          <div className="h-64 flex items-end justify-between gap-2 px-4 border-b border-outline-variant/20 pb-2">
            <div className="flex-1 bg-primary/20 rounded-t-lg h-[60%]" title="Month 1"></div>
            <div className="flex-1 bg-primary/40 rounded-t-lg h-[45%]" title="Month 2"></div>
            <div className="flex-1 bg-primary/60 rounded-t-lg h-[35%]" title="Month 3"></div>
            <div className="flex-1 bg-primary rounded-t-lg h-[25%]" title="Month 4"></div>
          </div>
          <div className="mt-4 flex justify-between text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
            <span>Month 1</span>
            <span>Month 2</span>
            <span>Month 3</span>
            <span>Month 4</span>
          </div>
          <p className="mt-6 text-sm text-on-surface-variant leading-relaxed">
            Average 3-month retention is <b>35%</b>. Users who book &quot;Deep Cleaning&quot; have a 50% higher return rate.
          </p>
        </Card>

        {/* Profitability by Category */}
        <Card variant="solid">
          <h3 className="text-xl font-bold tracking-tight text-primary font-headline mb-6">Category Profitability</h3>
          <div className="space-y-6">
            {[
              { name: 'Cleaning', margin: '22%', trend: '+5%' },
              { name: 'Pest Control', margin: '28%', trend: '+2%' },
              { name: 'Plumbing', margin: '15%', trend: '-1%' }
            ].map(cat => (
              <div key={cat.name} className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10">
                <div>
                  <p className="text-sm font-bold text-primary">{cat.name}</p>
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Net Margin</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-primary">{cat.margin}</p>
                  <p className={`text-[10px] font-bold ${cat.trend.startsWith('+') ? 'text-secondary' : 'text-red-500'}`}>{cat.trend} this week</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
