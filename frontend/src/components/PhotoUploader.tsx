"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, X } from "lucide-react";

export function PhotoUploader({ value, onChange }: any) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [preview, setPreview] = useState<string | null>(value || null);

    const handleFile = async (file: File | null) => {
        if (!file) return;

        // Preview local
        const url = URL.createObjectURL(file);
        setPreview(url);

        // Si querés subir al backend (S3/Supabase/etc.)
        // acá enviamos el file
        // const uploadedUrl = await uploadImage(file);
        // onChange(uploadedUrl);

        // TEMPORAL: guardamos el blob como valor del campo
        onChange(file);
    };

    return (
        <div className="space-y-3">

            {/* PREVIEW */}
            {preview && (
                <div className="relative w-32 h-32">
                    <img
                        src={preview}
                        alt="foto"
                        className="w-full h-full object-cover rounded-md border"
                    />

                    <button
                        type="button"
                        onClick={() => {
                            setPreview(null);
                            onChange(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* BOTONES */}
            <div className="flex gap-2">

                {/* SUBIR DESDE ARCHIVOS */}
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => inputRef.current?.click()}
                    className="flex items-center gap-2"
                >
                    <ImageIcon className="h-4 w-4" />
                    Elegir archivo
                </Button>

                {/* ABRIR CÁMARA */}
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => inputRef.current?.click()}
                    className="flex items-center gap-2"
                >
                    <Camera className="h-4 w-4" />
                    Cámara
                </Button>
            </div>

            {/* INPUT INVISIBLE */}
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"   // esto abre cámara si está disponible
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
        </div>
    );
}
