"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { RichTextEditorProps } from "./rich-text-editor";
import { VideoEmbed, getVideoEmbedUrl } from "./video-embed-extension";

export function RichTextEditorInner({
  initialHtml,
  onChange,
}: RichTextEditorProps) {
  const editor = useEditor({
    // TipTap warns about SSR/hydration in Next.js. Avoid mismatches by rendering after hydration.
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      VideoEmbed,
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class:
          "min-h-[260px] rounded-md border bg-background px-3 py-2 text-sm focus:outline-none prose prose-zinc max-w-none",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    // Ensure initial state is in sync.
    onChange(editor.getHTML());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) {
    return (
      <div className="min-h-[260px] rounded-md border p-3 text-sm text-muted-foreground">
        Редактор загружается...
      </div>
    );
  }

  const isActive = (
    name: string,
    attrs?: Record<string, string | number | boolean>,
  ) => editor.isActive(name, attrs);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2">
        <Button
          type="button"
          size="sm"
          variant={isActive("bold") ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isActive("italic") ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isActive("heading", { level: 2 }) ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isActive("bulletList") ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          List
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button
          type="button"
          size="sm"
          variant={isActive("blockquote") ? "default" : "outline"}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          Quote
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          Clear
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const url = window.prompt("YouTube или Vimeo ссылка:");
            if (!url) return;
            const embedUrl = getVideoEmbedUrl(url);
            if (!embedUrl) {
              window.alert("Ссылка не распознана. Поддерживается YouTube и Vimeo.");
              return;
            }
            editor.chain().focus().insertContent({ type: "videoEmbed", attrs: { src: embedUrl } }).run();
          }}
        >
          Video
        </Button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
