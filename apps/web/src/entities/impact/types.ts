/** City Impact domain. No React, storage or network dependencies. */
// Categories of the shared platform activity log. A log entry alone is not a
// verified impact: impact calculations use validated ImpactRecord entries.
export type ActivityKind =
  | "join"
  | "start"
  | "report"
  | "confirm"
  | "cancel"
  | "reward"
  | "profile"
  | "impact"
  | "mission"
  | "challenge"
  | "team";
export type ActivityEvent = {
  id: string;
  sourceEventId: string;
  type: ActivityKind;
  kind: ActivityKind; // backwards-compatible presentation field
  userId: string;
  questId?: string;
  participationId?: string;
  organizationId?: string;
  occurredAt: string;
  date: string; // backwards-compatible presentation field
  title: string;
  metadata: Record<string, string | number | boolean | null>;
};
export type ImpactMetricType =
  | "volunteer_hours"
  | "waste_kg"
  | "trees_planted"
  | "animals_helped"
  | "people_helped"
  | "area_cleaned";
export type ImpactScope = "individual" | "collective";
export type ImpactMetricInput = {
  type: ImpactMetricType;
  value: number;
  unit: "hours" | "kg" | "count" | "m2";
};
export type ImpactMetric = ImpactMetricInput & {
  id: string;
  impactRecordId: string;
};
export type ImpactPhoto = { url: string; alt: string; isDemo: true };
export type ImpactLocation = {
  label: string;
  district: string;
  coordinates: [number, number] | null;
  coordinateSource: string | null;
};
export type ImpactRecord = {
  id: string;
  sourceEventId: string;
  questId: string;
  participationId: string | null;
  userId: string | null;
  organizationId: string;
  scope: ImpactScope;
  verificationStatus: "unverified" | "verified" | "rejected";
  verifiedAt: string | null;
  verifiedBy: string | null;
  provenance: "organizer-confirmation" | "legacy-import";
  location: ImpactLocation;
  metrics: ImpactMetric[];
  beforePhoto: ImpactPhoto | null;
  afterPhoto: ImpactPhoto | null;
  summary: string;
  questTitle: string;
  categoryId: string;
  organizationName: string;
  awardedXp: number;
  awardedPoints: number;
};
export type CollectiveImpactInput = {
  metrics: ImpactMetricInput[];
  summary: string;
  beforePhoto: ImpactPhoto | null;
  afterPhoto: ImpactPhoto | null;
};
export type ImpactFilter = {
  userId?: string;
  organizationId?: string;
  categoryId?: string;
  district?: string;
  scope?: ImpactScope;
  from?: string; // inclusive YYYY-MM-DD, Europe/Kyiv calendar days
  to?: string;
};
