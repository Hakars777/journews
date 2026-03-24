import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/categories/category-form";
import { prisma } from "@/lib/prisma";
import { updateCategoryAction } from "@/app/admin/(panel)/categories/actions";

export const dynamic = "force-dynamic";

export default async function AdminCategoryEditPage({ params }: { params: { id: string } }) {
  const category = await prisma.category.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, slug: true, description: true },
  });
  if (!category) notFound();

  const bound = updateCategoryAction.bind(null, category.id);

  return (
    <CategoryForm
      title="Редактирование категории"
      submitLabel="Сохранить"
      action={bound}
      initial={{
        name: category.name,
        slug: category.slug,
        description: category.description,
      }}
    />
  );
}

