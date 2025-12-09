"use client";

import { Input } from "@/components/ui/input";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export function PhoneInput({ value, onChange, ...props }: any) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="relative flex items-center">

                        {/* PREFIJO */}
                        <div className="
              absolute left-0 top-0 h-full flex items-center 
              px-3 text-sm font-medium text-muted-foreground
              bg-muted/30 rounded-l-md border border-r-0 border-input
            ">
                            +54 9
                        </div>

                        {/* INPUT */}
                        <Input
                            className="pl-20"    // espacio para el prefijo
                            value={value}
                            onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9]/g, ""); // solo números
                                onChange(raw);
                            }}
                            placeholder="Ej: 2644123456"
                            maxLength={10}        // 10 dígitos después del +54 9
                            {...props}
                        />
                    </div>
                </TooltipTrigger>

                <TooltipContent side="bottom">
                    Sin 0 ni 15, sin caracteres especiales ni espacios.
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
