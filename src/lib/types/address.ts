export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  formatted_address: string;
  address_line_1: string;
  address_line_2: string | null;
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

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface PlaceDetails {
  place_id: string;
  formatted_address: string;
  address_components: AddressComponent[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}
