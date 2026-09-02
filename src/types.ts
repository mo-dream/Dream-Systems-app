export type BusinessType = 'food' | 'retail' | 'auto';

export interface Tenant {
  id: number;
  business_name: string;
  expiry_date: string;
  license_key: string;
  business_type: BusinessType | string;
  created_at?: string;
}

export interface SupportMessage {
  id?: number;
  tenant_id: number;
  sender: 'admin' | 'client';
  message: string;
  is_read?: boolean;
  created_at?: string;
}
