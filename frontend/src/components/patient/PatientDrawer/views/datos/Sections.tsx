import { Pencil, X, Check } from "lucide-react";

type SectionProps = {
    title: string;
    isEditing: boolean;
    onEdit: () => void;
    onCancel: () => void;
    onSave?: () => void;
    children: React.ReactNode;
};

export function Section({
    title,
    isEditing,
    onEdit,
    onCancel,
    onSave,
    children,
}: SectionProps) {
    return (
        <section className="relative space-y-3 pb-6 border-b last:border-b-0">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {title}
                </h3>

                {!isEditing ? (
                    <button
                        onClick={onEdit}
                        className="text-muted-foreground hover:text-foreground transition"
                    >
                        <Pencil size={16} />
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onSave}
                            className="text-green-600 hover:text-green-700"
                        >
                            <Check size={18} />
                        </button>
                        <button
                            onClick={onCancel}
                            className="text-muted-foreground hover:text-red-500"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-2">{children}</div>
        </section>
    );
}