import { TagForm } from "@/components/admin/tags/tag-form";
import { createTagAction } from "@/app/admin/(panel)/tags/actions";

export const dynamic = "force-dynamic";

export default function AdminTagNewPage() {
  return (
    <TagForm
      title="Новый тег"
      submitLabel="Создать"
      action={createTagAction}
      initial={{ name: "", slug: "" }}
    />
  );
}

