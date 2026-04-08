"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";

type ProductDescriptionEditorProps = {
  name: string;
  initialValue: string;
};

function normalizeInitialContent(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "<p></p>";
  }

  if (trimmed.includes("<") && trimmed.includes(">")) {
    return trimmed;
  }

  return `<p>${trimmed.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
}

function ToolbarButton({
  onClick,
  label,
  isActive,
  disabled,
}: {
  onClick: () => void;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 items-center rounded border px-2 text-xs font-medium uppercase tracking-[0.06em] transition ${
        isActive
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {label}
    </button>
  );
}

export function ProductDescriptionEditor({
  name,
  initialValue,
}: ProductDescriptionEditorProps) {
  const normalizedInitialValue = normalizeInitialContent(initialValue);
  const [htmlValue, setHtmlValue] = useState(normalizedInitialValue);

  const editor = useEditor({
    extensions: [StarterKit],
    content: normalizedInitialValue,
    editorProps: {
      attributes: {
        class:
          "min-h-56 w-full rounded-b border border-t-0 border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-maroon-700 focus-visible:outline-offset-2",
      },
    },
    onUpdate({ editor: currentEditor }) {
      setHtmlValue(currentEditor.getHTML());
    },
  });

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={htmlValue} />

      <div className="flex flex-wrap items-center gap-2 rounded-t border border-zinc-300 bg-zinc-50 p-2">
        <ToolbarButton
          label="Bold"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          isActive={editor?.isActive("bold")}
          disabled={!editor?.can().chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="Italic"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          isActive={editor?.isActive("italic")}
          disabled={!editor?.can().chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="Heading"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor?.isActive("heading", { level: 2 })}
          disabled={
            !editor?.can().chain().focus().toggleHeading({ level: 2 }).run()
          }
        />
        <ToolbarButton
          label="Bullet List"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          isActive={editor?.isActive("bulletList")}
          disabled={!editor?.can().chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="Ordered List"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          isActive={editor?.isActive("orderedList")}
          disabled={!editor?.can().chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="Quote"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          isActive={editor?.isActive("blockquote")}
          disabled={!editor?.can().chain().focus().toggleBlockquote().run()}
        />
      </div>

      <EditorContent editor={editor} />
      <p className="text-xs text-zinc-500">
        Use rich text formatting for long-form product storytelling and details.
      </p>
    </div>
  );
}
