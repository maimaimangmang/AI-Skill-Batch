import type { InputRow, Listing, Quote } from './types';
import { cellText } from './domain';

export const officialTemplateIds = ['text-image-v1', 'text-v1'] as const;
export function isOfficialTemplate(id: string) { return (officialTemplateIds as readonly string[]).includes(id); }
export type OfficialSchema = {
  templateId: string; version: string; name: string; description: string; inputSummary?: string;
  fields: { key: string; label: string; required?: boolean; type: string; enumValues?: string[] | null; businessHint?: string; inputHint?: string }[];
  columns: { fieldKey: string; headerLabel: string; order: number }[];
  instructions?: string[]; sampleRows?: { values: InputRow }[];
};
export function officialListing(schema: OfficialSchema): Listing {
  if (!isOfficialTemplate(schema.templateId) || !schema.fields?.length || !schema.columns?.length) throw new Error('官方模板字段暂不可用。');
  const fields = schema.columns.map(column => {
    const field = schema.fields.find(f => f.key === column.fieldKey);
    if (!field || !column.headerLabel) throw new Error('官方模板字段不完整。');
    return { key: column.headerLabel, label: field.label, order: column.order, required: field.required,
      // Official row cells are strings, including enums; upstream validates their semantics.
      value_type: 'string', enum_values: field.enumValues || undefined,
      description: field.businessHint, presentation: { hint: field.inputHint } };
  });
  return { id: schema.templateId, officialTemplateId: schema.templateId, displayName: schema.name, description: schema.description,
    listingVersionId: schema.version, creator: { nickname: 'LoomLoom 官方' }, executionAvailabilityStatus: 'available',
    inputSchemaSnapshot: { fields, input_summary: schema.inputSummary, instructions: schema.instructions, sample_rows: schema.sampleRows?.map(r => r.values) } };
}
export function officialRows(rows: InputRow[]): Record<string, string>[] {
  return rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, cellText(value)])));
}
export type OfficialPrecheck = {
  estimatedTotalCostT?: number; estimatedTotalCost?: { currency?: string }; pricingRevision?: string;
  balanceCheck?: { currency?: string; availableBalance?: number; isSufficient?: boolean };
};
export function officialQuote(precheck: OfficialPrecheck, count: number, version?: string): Quote {
  const cost = precheck.estimatedTotalCostT;
  const currency = precheck.estimatedTotalCost?.currency || precheck.balanceCheck?.currency;
  if (cost == null || !Number.isSafeInteger(cost) || cost < 0 || !currency ||
      (precheck.estimatedTotalCost?.currency && precheck.balanceCheck?.currency && precheck.estimatedTotalCost.currency !== precheck.balanceCheck.currency)) {
    throw new Error('服务未返回完整预估金额或币种，暂不能确认执行。');
  }
  return { source: 'official', currency, taskCount: count, taskFixedFeeT: 0, estimatedExecutionCostT: cost,
    estimatedBuyerPayableT: cost, listingVersionId: version, pricingRuleVersion: precheck.pricingRevision || undefined };
}
export function workflowPath(listing: Pick<Listing, 'id' | 'officialTemplateId'>) {
  return listing.officialTemplateId ? `/official/${encodeURIComponent(listing.officialTemplateId)}` : `/market/${encodeURIComponent(listing.id)}`;
}
