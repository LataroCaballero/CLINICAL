type Props = {
    title: string;
    items?: string[];
    variant?: "destructive" | "secondary";
};

export function MedicalChips({
    title,
    items = [],
    variant = "secondary",
}: Props) {
    if (!items.length) return null;

    const baseChip =
        "rounded-full px-3 py-1 text-xs font-medium bg-[#f3f4f6] transition-colors " +
        "shadow-[inset_2px_2px_4px_rgba(0,0,0,0.08),inset_-2px_-2px_4px_rgba(255,255,255,0.9)]";

    const textColor =
        variant === "destructive"
            ? "text-red-400"
            : "text-gray-600";

    return (
        <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
                {title}
            </p>

            <div className="flex flex-wrap gap-2 max-w-[260px]">
                {items.map((item, idx) => (
                    <span
                        key={idx}
                        className={`${baseChip} ${textColor}`}
                    >
                        {item}
                    </span>
                ))}
            </div>
        </div>
    );
}