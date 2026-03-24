import { CategoryForm } from "@/components/admin/categories/category-form";
import { createCategoryAction } from "@/app/admin/(panel)/categories/actions";

export const dynamic = "force-dynamic";

export default function AdminCategoryNewPage() {
  return (
    <CategoryForm
      title="Новая категория"
      submitLabel="Создать"
      action={createCategoryAction}
      initial={{ name: "", slug: "", description: null }}
    />
  );
}

