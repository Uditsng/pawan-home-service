export default function Loading() {
  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24 flex items-center justify-center">
      <main className="max-w-md w-full mx-auto px-4 py-8 text-center space-y-6 animate-pulse">
        <div className="mx-auto w-16 h-16 bg-surface-container-high rounded-full" />
        <div className="mx-auto w-48 h-6 bg-surface-container-high rounded" />
        <div className="mx-auto w-64 h-4 bg-surface-container-high rounded" />
        <div className="mx-auto w-full h-11 bg-surface-container-high rounded-xl" />
      </main>
    </div>
  );
}
