"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export function EmailInput({ value, onChange }: any) {
    const email = value || "";

    // separar usuario@dominio
    const [local, domain] = email.includes("@")
        ? email.split("@")
        : [email, "gmail.com"];

    const [customDomainMode, setCustomDomainMode] = useState(false);
    const [selectedDomain, setSelectedDomain] = useState(domain || "gmail.com");

    const updateEmail = (localPart: string, domainPart: string) => {
        onChange(`${localPart}@${domainPart}`);
    };

    return (
        <div className="flex gap-2 items-center">

            {/* PARTE LOCAL */}
            <Input
                className="flex-1"
                placeholder="usuario"
                value={local}
                onChange={(e) => updateEmail(e.target.value, selectedDomain)}
            />

            {/* DOMINIO */}
            {!customDomainMode ? (
                <Select
                    defaultValue={selectedDomain}
                    onValueChange={(v) => {
                        if (v === "otro") {
                            setCustomDomainMode(true);
                            return;
                        }
                        setSelectedDomain(v);
                        updateEmail(local, v);
                    }}
                >
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value="gmail.com">@gmail.com</SelectItem>
                        <SelectItem value="hotmail.com">@hotmail.com</SelectItem>
                        <SelectItem value="outlook.com">@outlook.com</SelectItem>
                        <SelectItem value="yahoo.com">@yahoo.com</SelectItem>

                        <SelectItem value="otro">Otro…</SelectItem>
                    </SelectContent>
                </Select>
            ) : (
                <Input
                    className="w-40"
                    placeholder="@tu-dominio.com"
                    value={selectedDomain}
                    onChange={(e) => {
                        setSelectedDomain(e.target.value);
                        updateEmail(local, e.target.value);
                    }}
                    onBlur={() => {
                        if (!selectedDomain.includes(".")) {
                            // dominio inválido → revertir a gmail
                            setCustomDomainMode(false);
                            setSelectedDomain("gmail.com");
                            updateEmail(local, "gmail.com");
                        }
                    }}
                />
            )}
        </div>
    );
}
