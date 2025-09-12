import moment from "moment";

export function Time({
  value,
  options,
  className,
}: {
  value: string | Date;
  options?: any;
  className?: string;
}) {
  return (
    <div className={className}>
      {options?.format
        ? moment(value).format(options?.format)
        : moment(value).fromNow()}
    </div>
  );
}
