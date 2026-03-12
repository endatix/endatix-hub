export type TenantStorageStats = {
  tenantId: number;
  submissionCount: number;
  versionCount: number;
  estimatedStorageBytes: number;
};

export type FormStorageStats = {
  formId: number;
  formName: string;
  submissionCount: number;
  versionCount: number;
  estimatedStorageBytes: number;
};

export type TableStorageStats = {
  tableName: string;
  tableSizeBytes: number;
  indexSizeBytes: number;
  totalSizeBytes: number;
};

export type StorageDashboard = {
  tenantStats: TenantStorageStats;
  formStats: FormStorageStats[];
  tableStats: TableStorageStats[];
};
