export function NewsContent({ html }: { html: string }) {
  return (
    <div
      className="prose prose-zinc max-w-none prose-headings:jn-headline prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-md"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

