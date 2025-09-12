export function Main({ children }: { children: React.ReactNode }) {
  return (
    <div className="@container/main flex flex-1 flex-col px-4 md:px-6 py-8">
      {children}
    </div>
  );
}
