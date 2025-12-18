function EditableSelect({
    value,
    options,
    disabled,
    onChange,
    error,
}: {
    value: string | null;
    options: { id: string; nombre: string }[];
    disabled: boolean;
    onChange: (v: string | null) => void;
    error?: string;
}) {
    if (disabled) {
        const selected = options.find((o) => o.id === value);
        return <span>{selected?.nombre ?? "—"}</span>;
    }

    return (
        <div>
            <select
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value || null)}
                className={[
                    "w-full px-3 py-2 rounded-xl text-sm",
                    "neu-inset",
                    "focus:outline-none",
                    error ? "ring-1 ring-red-500" : "",
                ].join(" ")}
            >
                <option value="">Sin obra social</option>
                {options.map((o) => (
                    <option key={o.id} value={o.id}>
                        {o.nombre}
                    </option>
                ))}
            </select>
            {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
        </div>
    );
}