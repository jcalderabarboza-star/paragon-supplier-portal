export interface KpiItem {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  trend?: number;
  category?: string;
}
