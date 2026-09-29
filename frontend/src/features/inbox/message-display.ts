export function customerMessageDisplayText(content: string) {
  return content
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('[IMAGE_ATTACHMENT:'))
    .join('\n')
    .trim();
}

export function messageAttachments(
  meta?: { attachments?: Array<{ type: string; url: string }> } | null,
) {
  return meta?.attachments ?? [];
}
