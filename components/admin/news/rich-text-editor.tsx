"use client";

import dynamic from "next/dynamic";

export type RichTextEditorProps = {
  initialHtml: string;
  onChange: (html: string) => void;
};

const editorLoading = (
  <div className="min-h-[260px] rounded-md border p-3 text-sm text-muted-foreground">
    Редактор загружается...
  </div>
);

const RichTextEditorInner = dynamic<RichTextEditorProps>(
  () => import("./rich-text-editor-inner").then((mod) => mod.RichTextEditorInner),
  {
    ssr: false,
    loading: () => editorLoading,
  },
);

export function RichTextEditor(props: RichTextEditorProps) {
  return <RichTextEditorInner {...props} />;
}
