import { AuthorForm } from "@/components/admin/authors/author-form";
import { createAuthorAction } from "@/app/admin/(panel)/authors/actions";
import { getAdminMediaPickerItems } from "@/lib/r2-media";

export const dynamic = "force-dynamic";

export default async function AdminAuthorNewPage() {
  const mediaItems = await getAdminMediaPickerItems();

  return (
    <AuthorForm
      title="Новый автор"
      submitLabel="Создать"
      action={createAuthorAction}
      initial={{ name: "", slug: "", bio: null, avatar: null }}
      mediaItems={mediaItems}
    />
  );
}

