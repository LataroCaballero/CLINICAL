type EditableInputProps = {
    value?: string;
    disabled?: boolean;
    onChange?: (v: string) => void;
};

export function EditableInput({
    value,
    disabled,
    onChange,
}: EditableInputProps) {
    if (disabled) {
        return <span>{value || "—"}</span>;
    }

    return (
        <input
            value={value || ""}
            onChange={(e) => onChange?.(e.target.value)}
            className="
        w-full px-3 py-2 rounded-xl text-sm
        neu-inset
        focus:outline-none
      "
        />
    );
}