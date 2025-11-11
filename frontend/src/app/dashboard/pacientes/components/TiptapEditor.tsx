"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Heading from "@tiptap/extension-heading";
import { Button } from "@/components/ui/button";
import {
  BoldIcon,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  ImagePlus,
  Undo2,
  Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef } from "react";

export default function TiptapEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (value: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: true,
      }),
      Heading.configure({
        levels: [2, 3],
      }),
      Placeholder.configure({
        placeholder: "Escribe aquí la evolución del paciente...",
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] text-gray-800",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const handleImageUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result as string }).run();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="border rounded-md p-3 bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 mb-2 border-b pb-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            editor.isActive("bold") ? "bg-gray-100 text-indigo-600" : ""
          )}
        >
          <BoldIcon className="w-4 h-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            editor.isActive("italic") ? "bg-gray-100 text-indigo-600" : ""
          )}
        >
          <Italic className="w-4 h-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(
            editor.isActive("heading", { level: 2 })
              ? "bg-gray-100 text-indigo-600"
              : ""
          )}
        >
          <Heading2 className="w-4 h-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn(
            editor.isActive("heading", { level: 3 })
              ? "bg-gray-100 text-indigo-600"
              : ""
          )}
        >
          <Heading3 className="w-4 h-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            editor.isActive("bulletList") ? "bg-gray-100 text-indigo-600" : ""
          )}
        >
          <List className="w-4 h-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            editor.isActive("orderedList") ? "bg-gray-100 text-indigo-600" : ""
          )}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            const url = window.prompt("Ingrese una URL");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
        >
          <Link2 className="w-4 h-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="w-4 h-4" />
        </Button>

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageUpload}
          className="hidden"
        />

        <Button
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="w-4 h-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} className="mt-2" />
    </div>
  );
}
