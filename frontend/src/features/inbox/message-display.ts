export function customerMessageDisplayText(content: string) {
  const withoutImages = content
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('[IMAGE_ATTACHMENT:'))
    .join('\n')
    .trim();

  // Older comment seeds bundled post caption into the customer bubble.
  // Prefer showing only the customer comment line when present.
  const customerLine = withoutImages.match(
    /(?:^|\n)تعليق العميل:\s*([\s\S]+)$/,
  );
  if (customerLine?.[1]?.trim()) return customerLine[1].trim();

  return withoutImages;
}

export function messageAttachments(
  meta?: { attachments?: Array<{ type: string; url: string }> } | null,
) {
  return meta?.attachments ?? [];
}
