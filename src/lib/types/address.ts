export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  formatted_address: string;
  address_line_1: string;
  address_line_2: string | null;
  area: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  place_id: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
