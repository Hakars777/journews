import { notFound } from "next/navigation";
import { TagForm } from "@/components/admin/tags/tag-form";
import { prisma } from "@/lib/prisma";
import { updateTagAction } from "@/app/admin/(panel)/tags/actions";

export const dynamic = "force-dynamic";

export default async function AdminTagEditPage({ params }: { params: { id: string } }) {
  const tag = await prisma.tag.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, slug: true },
  });
  if (!tag) notFound();

  const bound = updateTagAction.bind(null, tag.id);

  return (
    <TagForm
      title="Редактирование тега"
      submitLabel="Сохранить"
      action={bound}
      initial={{ name: tag.name, slug: tag.slug }}
    />
  );
}

