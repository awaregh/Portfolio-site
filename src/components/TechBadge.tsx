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
      "bg-[#ffffff06] text-[#888888] border-[rgba(255,255,255,0.06)]",
    accent:
      "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20",
    mono: "bg-[#ffffff06] text-[#888888] border-[rgba(255,255,255,0.06)] font-mono",
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 text-xs rounded-md border font-medium ${styles[variant]}`}
    >
      {label}
    </span>
  );
}
