import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCity,
  faFileLines,
  faFolderOpen,
  faLayerGroup,
  faScaleBalanced,
  faUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Card, CardHeader } from "@/components/ui/Card";
import { MOCK_DOCS, type MockDocType } from "@/lib/leads/mockDocs";

const ICONS: Record<MockDocType, IconDefinition> = {
  tabu: faFileLines,
  shuma: faScaleBalanced,
  tochnit: faCity,
  tabatz: faLayerGroup,
};

/** Quick access to the seeded demo documents for a lead's compound. */
export function CompoundDocs({ leadId }: { leadId: string }) {
  return (
    <Card>
      <CardHeader title="מסמכי מתחם (הדגמה)" icon={faFolderOpen} />
      <div className="px-5 pb-5 space-y-2">
        {MOCK_DOCS.map((d) => (
          <Link
            key={d.type}
            href={`/doc/${leadId}/${d.type}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:border-brand-300 hover:bg-surface-muted"
          >
            <FontAwesomeIcon icon={ICONS[d.type]} className="text-brand-500" />
            <span>{d.label}</span>
            <FontAwesomeIcon
              icon={faUpRightFromSquare}
              className="ms-auto text-[0.7em] text-ink-300"
            />
          </Link>
        ))}
      </div>
    </Card>
  );
}
