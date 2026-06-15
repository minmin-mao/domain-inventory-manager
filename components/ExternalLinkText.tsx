type Props = {
  href: string | null | undefined;
  children: React.ReactNode;
  className?: string;
};

export default function ExternalLinkText({ href, children, className = "" }: Props) {
  if (!href) {
    return <span className={className}>{children}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-inherit underline-offset-4 transition hover:text-sky-300 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${className}`}
    >
      {children}
    </a>
  );
}
