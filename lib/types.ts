export type InputRow = Record<string, unknown>;
export type Field = {
  key: string; label: string; value_type: string; required?: boolean; order?: number;
  description?: string; enum_values?: unknown[]; default_value?: unknown;
  accepted_mime_types?: string[]; max_values?: number;
  presentation?: { widget?: string; hint?: string };
};
export type Schema = { fields: Field[]; input_summary?: string; instructions?: string[]; sample_rows?: InputRow[] };
export type Money = { amount: string; currency: string };
export type Listing = {
  id: string; officialTemplateId?: string; displayName: string; description: string; currency?: string;
  taskFixedFeeT?: number; taskFixedFee?: Money; inputSchemaSnapshot: string | Schema;
  listingVersionId?: string; saleStatus?: string; executionAvailabilityStatus?: string;
  creator?: { nickname?: string };
};
export type Quote = {
  source?: 'official'; quoteId?: string; currency?: string; taskCount?: number; taskFixedFeeT?: number;
  estimatedExecutionCostT?: number; estimatedBuyerPayableT?: number;
  estimatedBuyerPayable?: Money; listingVersionId?: string; pricingRuleVersion?: string;
};
export type Balance = { availableBalanceT?: number; currency?: string; availableBalance?: Money };
export type Artifact = { artifactId?: string; accessUrl?: string; inlineText?: string; mimeType?: string; portName?: string; stepId?: string; stepLabel?: string };
export type ResultRow = { rowIndex: number; inputJson: string; status: string; errorMessage?: string; artifacts?: Artifact[]; stepErrors?: { errorMessage?: string; stepLabel?: string; stepId?: string }[] };
export type Run = {
  runId: string; templateKey?: string; sourceType?: string; displayName?: string; templateName?: string; status: string;
  totalTasks?: number; completedTasks?: number; failedTasks?: number; cancelledTasks?: number;
  createdAtUnix?: number; actualCostT?: number; actualCost?: Money; firstErrorMessage?: string;
  market?: { listingId?: string; skillName?: string; currency?: string; finalBuyerPayableT?: number; transactionStatus?: string };
};
export type RunDetail = { run: Run; market?: Run['market'] };
