import { getConfig } from "@/lib/firebase/repo";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const config = await getConfig();

  return (
    <div>
      <PageHeader
        title="הגדרות"
        subtitle="כוונון ספי הסינון — כל שינוי משפיע על אופן דירוג הלידים"
      />
      <SettingsForm initial={config} />
    </div>
  );
}
