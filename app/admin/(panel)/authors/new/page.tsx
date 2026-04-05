import { AuthorForm } from "@/components/admin/authors/author-form";
import { createAuthorAction } from "@/app/admin/(panel)/authors/actions";

export const dynamic = "force-dynamic";

export default async function AdminAuthorNewPage() {
  return (
    <AuthorForm
      title="Новый автор"
      submitLabel="Создать"
      action={createAuthorAction}
      initial={{ name: "", slug: "", bio: null, avatar: null }}
    />
  );
}

