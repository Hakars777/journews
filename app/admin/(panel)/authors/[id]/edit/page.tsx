import { notFound } from "next/navigation";
import { AuthorForm } from "@/components/admin/authors/author-form";
import { prisma } from "@/lib/prisma";
import { getAdminMediaPickerItems } from "@/lib/r2-media";
import { updateAuthorAction } from "@/app/admin/(panel)/authors/actions";

export const dynamic = "force-dynamic";

export default async function AdminAuthorEditPage({ params }: { params: { id: string } }) {
  const [author, mediaItems] = await Promise.all([
    prisma.author.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, slug: true, bio: true, avatar: true },
    }),
    getAdminMediaPickerItems(),
  ]);
  if (!author) notFound();

  const bound = updateAuthorAction.bind(null, author.id);

  return (
    <AuthorForm
      title="Редактирование автора"
      submitLabel="Сохранить"
      action={bound}
      initial={{
        name: author.name,
        slug: author.slug,
        bio: author.bio,
        avatar: author.avatar,
      }}
      mediaItems={mediaItems}
    />
  );
}

