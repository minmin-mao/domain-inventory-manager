export default function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10 rounded-2xl bg-zinc-900/70 p-6 shadow-sm">
      <h2 className="mb-6 text-base font-semibold tracking-wide text-zinc-200">
        {title}
      </h2>
      {children}
    </section>
  );
}
