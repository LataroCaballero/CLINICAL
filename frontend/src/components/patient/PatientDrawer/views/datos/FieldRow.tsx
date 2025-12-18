type FieldRowProps = {
    label: string;
    value?: React.ReactNode;
};

export function FieldRow({ label, value }: FieldRowProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-4">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="md:col-span-2 text-sm">
                {value ?? <span className="text-muted-foreground">—</span>}
            </span>
        </div>
    );
}