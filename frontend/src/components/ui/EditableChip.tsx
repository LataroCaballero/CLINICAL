import { useState } from "react";

export function EditableChips({
    items,
    disabled,
    onAdd,
    onRemove,
    placeholder,
}: {
    items: string[];
    disabled: boolean;
    onAdd: (value: string) => void;
    onRemove: (index: number) => void;
    placeholder: string;
}) {
    const [value, setValue] = useState("");

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {items.length === 0 && !disabled && (
                    <span className="text-muted-foreground text-sm">—</span>
                )}

                {items.map((item, idx) => (
                    <span
                        key={idx}
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-muted"
                    >
                        {item}
                        {!disabled && (
                            <button
                                onClick={() => onRemove(idx)}
                                className="text-xs hover:text-red-500"
                            >
                                ✕
                            </button>
                        )}
                    </span>
                ))}
            </div>

            {!disabled && (
                <div className="flex gap-2">
                    <input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 px-3 py-2 rounded-xl text-sm neu-inset focus:outline-none"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            if (value.trim().length > 1) {
                                onAdd(value.trim());
                                setValue("");
                            }
                        }}
                        className="px-3 rounded-xl bg-primary text-primary-foreground text-sm"
                    >
                        Agregar
                    </button>
                </div>
            )}
        </div>
    );
}