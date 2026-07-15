import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile, faFolderOpen } from "@fortawesome/free-solid-svg-icons";
import type { LeadDocument } from "@/lib/domain/types";
import { DOC_TYPE_LABEL, type DocType } from "@/lib/domain/enums";
import { Badge } from "@/components/ui/Badge";

/** Documents grouped by type. In dev there are no real files, so metadata only. */
export function DocumentList({ documents }: { documents: LeadDocument[] }) {
  if (!documents.length) {
    return <p className="text-sm text-ink-400 px-5 pb-5">אין מסמכים מצורפים</p>;
  }

  // Group by DocType preserving first-seen order.
  const groups = new Map<DocType, LeadDocument[]>();
  for (const doc of documents) {
    const list = groups.get(doc.type) ?? [];
    list.push(doc);
    groups.set(doc.type, list);
  }

  return (
    <div className="px-5 pb-5 space-y-4">
      {[...groups.entries()].map(([type, docs]) => (
        <div key={type}>
          <div className="flex items-center gap-2 mb-1.5">
            <FontAwesomeIcon icon={faFolderOpen} className="text-ink-400 text-sm" />
            <span className="text-sm font-bold text-ink-700">{DOC_TYPE_LABEL[type]}</span>
            <Badge tone="neutral" size="sm">
              <span className="ltr-nums">{docs.length}</span>
            </Badge>
          </div>
          <ul className="space-y-1">
            {docs.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-2.5 rounded-md bg-surface-muted/60 px-3 py-2 text-sm"
              >
                <FontAwesomeIcon icon={faFile} className="text-ink-400" />
                <span className="text-ink-700 truncate">{doc.fileName}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
