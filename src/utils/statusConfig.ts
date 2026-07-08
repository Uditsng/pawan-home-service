export type ServiceStatus = 'draft' | 'published';

export interface StatusDetail {
  label: string;
  badgeVariant: 'warning' | 'success' | 'danger' | 'primary' | 'surface' | 'outline';
}

export const SERVICE_STATUS_CONFIG: Record<ServiceStatus, StatusDetail> = {
  draft: {
    label: 'Draft',
    badgeVariant: 'warning',
  },
  published: {
    label: 'Published',
    badgeVariant: 'success',
  },
};

export function getServiceStatusDetails(status: string | null | undefined): StatusDetail {
  const currentStatus = (status || 'published') as ServiceStatus;
  return SERVICE_STATUS_CONFIG[currentStatus] || SERVICE_STATUS_CONFIG.published;
}
