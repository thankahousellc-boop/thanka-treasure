"use client";

import Image from "@tiptap/extension-image";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState } from "react";

type BlogContentEditorProps = {
  name: string;
  initialValue: string;
};

type UploadResult = {
  publicUrl?: string;
  error?: string;
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

export function BlogContentEditor({
  name,
  initialValue,
}: BlogContentEditorProps) {
  const normalizedInitialValue = normalizeInitialContent(initialValue);
  const [htmlValue, setHtmlValue] = useState(normalizedInitialValue);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: normalizedInitialValue,
    editorProps: {
      attributes: {
        class:
          "prose prose-stone min-h-72 w-full max-w-none rounded-b border border-t-0 border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-maroon-700 focus-visible:outline-offset-2",
      },
    },
    onUpdate({ editor: currentEditor }) {
      setHtmlValue(currentEditor.getHTML());
    },
  });

  async function uploadInlineImage(file: File) {
    const payload = new FormData();
    payload.append("file", file);
    payload.append("bucket", "blog-images");
    payload.append("target", "blog-inline");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: payload,
    });

    const result = (await response.json().catch(() => ({}))) as UploadResult;

    if (!response.ok || !result.publicUrl) {
      throw new Error(result.error ?? "Failed to upload inline image.");
    }

    editor
      ?.chain()
      .focus()
      .setImage({ src: result.publicUrl, alt: file.name })
      .run();
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={htmlValue} />

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.currentTarget.value = "";

          if (!file) {
            return;
          }

          setUploadError(null);
          setIsUploading(true);

          try {
            await uploadInlineImage(file);
          } catch (error) {
            setUploadError((error as Error).message);
          } finally {
            setIsUploading(false);
          }
        }}
      />

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
          label={isUploading ? "Uploading" : "Upload Image"}
          onClick={() => uploadInputRef.current?.click()}
          disabled={isUploading}
        />
      </div>

      <EditorContent editor={editor} />
      {uploadError ? (
        <p className="text-xs text-red-700">{uploadError}</p>
      ) : null}
      <p className="text-xs text-zinc-500">
        Format long-form content and upload inline images directly from the
        editor.
      </p>
    </div>
  );
}
