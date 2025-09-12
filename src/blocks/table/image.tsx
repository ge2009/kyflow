export function Image({
  value,
  options,
  className,
}: {
  value: string;
  options?: any;
  className?: string;
}) {
  return (
    <img
      src={value}
      alt={value}
      className={`w-10 h-10 rounded-full ${className}`}
    />
  );
}
