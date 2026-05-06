import "@/app/brand-theme.css";

export default function CustomerMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full brand-identity bg-surface text-on-surface">
      {children}
    </div>
  );
}
