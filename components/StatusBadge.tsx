type StatusBadgeProps = {
  status: "available" | "taken";
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const isAvailable = status === "available";

  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${
        isAvailable
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-rose-500/15 text-rose-400"
      }`}
    >
      {status}
    </span>
  );
}