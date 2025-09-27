export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-col gap-4">{children}</div>;
}
