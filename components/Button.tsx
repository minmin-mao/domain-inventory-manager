type Props = {
  variant?: "primary" | "secondary";
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
  variant = "primary",
  ...props
}: Props) {
  const base =
    "inline-flex cursor-pointer items-center rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm",
    secondary:
      "bg-zinc-800 text-zinc-200 hover:bg-zinc-700",
  };

  return (
    <button
      {...props}
      className={`${base} ${variants[variant]} ${props.className ?? ""}`}
    />
  );
}
