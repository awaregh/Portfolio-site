interface TechBadgeProps {
  label: string;
  variant?: "default" | "accent" | "mono";
}

export default function TechBadge({
  label,
  variant = "default",
}: TechBadgeProps) {
  const styles = {
    default:
      "bg-[#f8fbff] text-[#6b7ea3] border-[rgba(147,197,253,0.2)]",
    accent:
      "bg-[#eff6ff] text-[#5b9bd5] border-[rgba(147,197,253,0.35)]",
    mono: "bg-[#f8fbff] text-[#6b7ea3] border-[rgba(147,197,253,0.2)] font-mono",
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 text-xs rounded-lg border font-medium ${styles[variant]}`}
    >
      {label}
    </span>
  );
}
