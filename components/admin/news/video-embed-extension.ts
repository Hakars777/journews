import { Node, mergeAttributes } from "@tiptap/core";

export function getVideoEmbedUrl(url: string): string | null {
  const trimmed = url.trim();

  // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const ytMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  // Vimeo: vimeo.com/ID
  const vmMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/);
  if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;

  return null;
}

export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.querySelector("iframe")?.getAttribute("src") ?? null,
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-video-embed]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      { "data-video-embed": "", class: "video-embed" },
      [
        "iframe",
        mergeAttributes({
          src: HTMLAttributes.src,
          frameborder: "0",
          allowfullscreen: "true",
          allow: "autoplay; encrypted-media; picture-in-picture; web-share",
        }),
      ],
    ];
  },
});
