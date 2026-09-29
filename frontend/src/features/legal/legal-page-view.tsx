import { useLocale } from '@/features/i18n/locale-context';
import {
  getLegalDocument,
  type LegalDocumentId,
} from '@/features/legal/legal-documents';
import { LegalLayout } from '@/features/legal/legal-layout';

export function LegalPageView({ documentId }: { documentId: LegalDocumentId }) {
  const { locale } = useLocale();
  const doc = getLegalDocument(documentId, locale);

  return (
    <LegalLayout title={doc.title} lastUpdated={doc.lastUpdated}>
      {doc.sections.map((section) => (
        <section key={section.title}>
          <h2 className="text-ink text-lg font-bold">{section.title}</h2>
          <div className="text-muted mt-3 space-y-3 text-[15px] leading-7">
            {section.paragraphs.map((p) => (
              <p key={p.slice(0, 48)}>{p}</p>
            ))}
          </div>
        </section>
      ))}
    </LegalLayout>
  );
}
