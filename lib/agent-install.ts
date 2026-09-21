// Matches the install prompt and archive route exposed by the official
// Shengsuanyun market detail page. No account credentials belong in this text.
export function agentInstallPrompt(listing: { id: string; displayName: string; officialTemplateId?: string }) {
  if (!/^[a-zA-Z0-9_-]{1,180}$/.test(listing.id) || listing.id.startsWith('demo-')) return null;
  if (listing.officialTemplateId) {
    if (!['text-v1', 'text-image-v1'].includes(listing.officialTemplateId)) return null;
    return `请根据 https://loomloom.shengsuanyun.com/loom/v1/officialTemplates/${listing.officialTemplateId}/skillPackage/archive，安装 Skill「${listing.displayName}」。`;
  }
  const archiveUrl = `https://api.shengsuanyun.com/loom/v1/marketListings/${encodeURIComponent(listing.id)}/skillPackage/archive`;
  return `请根据 ${archiveUrl}，安装 Skill「${listing.displayName}」。`;
}
