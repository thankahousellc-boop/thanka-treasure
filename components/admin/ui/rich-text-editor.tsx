"use client";

import TiptapImage from "@tiptap/extension-image";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState, type ReactNode, type SVGProps } from "react";

type UploadConfig = {
  bucket: string;
  target: string;
};

type UploadResponse = {
  publicUrl?: string;
  error?: string;
};

type RichTextEditorProps = {
  name: string;
  initialValue: string;
  upload?: UploadConfig;
  minHeight?: string;
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

const svgBase: SVGProps<SVGSVGElement> = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const Icons = {
  Bold: (
    <svg {...svgBase}>
      <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />
    </svg>
  ),
  Italic: (
    <svg {...svgBase}>
      <path d="M14 5H9M15 19H10M15 5l-6 14" />
    </svg>
  ),
  Strike: (
    <svg {...svgBase}>
      <path d="M4 12h16" />
      <path d="M17 7a4 4 0 0 0-4-2H11a3 3 0 0 0-1 5.8" />
      <path d="M7 17a4 4 0 0 0 4 2h2a3 3 0 0 0 3-3" />
    </svg>
  ),
  Code: (
    <svg {...svgBase}>
      <path d="m9 8-5 4 5 4M15 8l5 4-5 4" />
    </svg>
  ),
  H1: (
    <svg {...svgBase}>
      <path d="M5 5v14M13 5v14M5 12h8" />
      <path d="M17 8l3-1v12" />
    </svg>
  ),
  H2: (
    <svg {...svgBase}>
      <path d="M4 5v14M12 5v14M4 12h8" />
      <path d="M16 9a2.5 2.5 0 0 1 4.5 1.5c0 2.5-4.5 3.5-4.5 7.5h5" />
    </svg>
  ),
  H3: (
    <svg {...svgBase}>
      <path d="M4 5v14M12 5v14M4 12h8" />
      <path d="M16 8h4l-2.5 4a2.5 2.5 0 1 1-2 4" />
    </svg>
  ),
  BulletList: (
    <svg {...svgBase}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" />
      <circle cx="4.5" cy="12" r="1" />
      <circle cx="4.5" cy="18" r="1" />
    </svg>
  ),
  OrderedList: (
    <svg {...svgBase}>
      <path d="M10 6h11M10 12h11M10 18h11" />
      <path d="M4 4h2v4M4 8h3" />
      <path d="M4 11h3l-3 3h3" />
      <path d="M4 17h2v1.5H4v.5h2V21H4" />
    </svg>
  ),
  Quote: (
    <svg {...svgBase}>
      <path d="M7 7h4v4H7c0 3 2 4 3 4M14 7h4v4h-4c0 3 2 4 3 4" />
    </svg>
  ),
  CodeBlock: (
    <svg {...svgBase}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m9 10-2 2 2 2M15 10l2 2-2 2" />
    </svg>
  ),
  HR: (
    <svg {...svgBase}>
      <path d="M3 12h18M5 6h14M5 18h14" strokeDasharray="2 3" />
      <path d="M3 12h18" strokeDasharray="0" />
    </svg>
  ),
  Image: (
    <svg {...svgBase}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5-9 9" />
    </svg>
  ),
  Upload: (
    <svg {...svgBase}>
      <path d="M12 4v12" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  ),
  ClearFormat: (
    <svg {...svgBase}>
      <path d="M5 5h14M9 5l-2 14M15 5l-1 7" />
      <path d="m15 19 5-5M20 19l-5-5" />
    </svg>
  ),
  Undo: (
    <svg {...svgBase}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10H9" />
    </svg>
  ),
  Redo: (
    <svg {...svgBase}>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9a5 5 0 0 0 0 10h6" />
    </svg>
  ),
} as const;

type ToolbarIconButtonProps = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
};

function ToolbarIconButton({
  icon,
  label,
  onClick,
  isActive,
  disabled,
}: ToolbarIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        backgroundColor: isActive ? "var(--admin-accent)" : "transparent",
        color: isActive ? "var(--admin-on-accent)" : "var(--admin-text-soft)",
      }}
      onMouseEnter={(event) => {
        if (!isActive && !disabled) {
          event.currentTarget.style.backgroundColor =
            "var(--admin-accent-soft)";
        }
      }}
      onMouseLeave={(event) => {
        if (!isActive) {
          event.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      {icon}
    </button>
  );
}

function Divider() {
  return (
    <span
      aria-hidden="true"
      className="mx-1 h-5 w-px"
      style={{ backgroundColor: "var(--admin-border-strong)" }}
    />
  );
}

type ToolbarProps = {
  editor: Editor | null;
  onPromptImage: () => void;
  onUploadClick?: () => void;
  isUploading?: boolean;
};

function Toolbar({
  editor,
  onPromptImage,
  onUploadClick,
  isUploading,
}: ToolbarProps) {
  const containerStyle = {
    border: "1px solid var(--admin-border-strong)",
    backgroundColor: "var(--admin-surface-2)",
  } as const;

  if (!editor) {
    return (
      <div
        className="flex flex-wrap items-center gap-0.5 rounded-t-md border-b-0 px-2 py-1.5"
        style={containerStyle}
      />
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 rounded-t-md border-b-0 px-2 py-1.5"
      style={containerStyle}
    >
      <ToolbarIconButton
        icon={Icons.Bold}
        label="Bold"
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        disabled={!editor.can().chain().focus().toggleBold().run()}
      />
      <ToolbarIconButton
        icon={Icons.Italic}
        label="Italic"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
      />
      <ToolbarIconButton
        icon={Icons.Strike}
        label="Strikethrough"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
      />
      <ToolbarIconButton
        icon={Icons.Code}
        label="Inline code"
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        disabled={!editor.can().chain().focus().toggleCode().run()}
      />

      <Divider />

      <ToolbarIconButton
        icon={Icons.H1}
        label="Heading 1"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
      />
      <ToolbarIconButton
        icon={Icons.H2}
        label="Heading 2"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
      />
      <ToolbarIconButton
        icon={Icons.H3}
        label="Heading 3"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
      />

      <Divider />

      <ToolbarIconButton
        icon={Icons.BulletList}
        label="Bullet list"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
      />
      <ToolbarIconButton
        icon={Icons.OrderedList}
        label="Numbered list"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
      />
      <ToolbarIconButton
        icon={Icons.Quote}
        label="Quote"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
      />
      <ToolbarIconButton
        icon={Icons.CodeBlock}
        label="Code block"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
      />

      <Divider />

      <ToolbarIconButton
        icon={Icons.HR}
        label="Horizontal rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      />
      <ToolbarIconButton
        icon={Icons.Image}
        label="Insert image by URL"
        onClick={onPromptImage}
      />
      {onUploadClick ? (
        <ToolbarIconButton
          icon={Icons.Upload}
          label={isUploading ? "Uploading…" : "Upload image"}
          onClick={onUploadClick}
          disabled={isUploading}
        />
      ) : null}
      <ToolbarIconButton
        icon={Icons.ClearFormat}
        label="Clear formatting"
        onClick={() =>
          editor.chain().focus().unsetAllMarks().clearNodes().run()
        }
      />

      <Divider />

      <ToolbarIconButton
        icon={Icons.Undo}
        label="Undo"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
      />
      <ToolbarIconButton
        icon={Icons.Redo}
        label="Redo"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
      />
    </div>
  );
}

export function RichTextEditor({
  name,
  initialValue,
  upload,
  minHeight = "min-h-64",
}: RichTextEditorProps) {
  const normalizedInitialValue = normalizeInitialContent(initialValue);
  const [htmlValue, setHtmlValue] = useState(normalizedInitialValue);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TiptapImage.configure({ inline: false, allowBase64: false }),
    ],
    content: normalizedInitialValue,
    editorProps: {
      attributes: {
        class: `tiptap-content ${minHeight} w-full rounded-b-md px-4 py-3 text-sm focus:outline-none`,
      },
    },
    onUpdate({ editor: currentEditor }) {
      setHtmlValue(currentEditor.getHTML());
    },
  });

  const promptForImage = () => {
    if (!editor) return;
    const url = window.prompt("Image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const triggerUpload = upload ? () => fileInputRef.current?.click() : undefined;

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";

    if (!file || !upload || !editor) {
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("bucket", upload.bucket);
      payload.append("target", upload.target);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: payload,
      });

      const result = (await response
        .json()
        .catch(() => ({}))) as UploadResponse;

      if (!response.ok || !result.publicUrl) {
        throw new Error(result.error ?? "Failed to upload image.");
      }

      editor
        .chain()
        .focus()
        .setImage({ src: result.publicUrl, alt: file.name })
        .run();
    } catch (error) {
      setUploadError((error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <input type="hidden" name={name} value={htmlValue} />

      {upload ? (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      ) : null}

      <Toolbar
        editor={editor}
        onPromptImage={promptForImage}
        onUploadClick={triggerUpload}
        isUploading={isUploading}
      />

      <div
        className="rounded-b-md"
        style={{
          border: "1px solid var(--admin-border-strong)",
          borderTop: "none",
          backgroundColor: "var(--admin-surface)",
          color: "var(--admin-text)",
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {uploadError ? (
        <p className="mt-1 text-[11px]" style={{ color: "#b3261e" }}>
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
