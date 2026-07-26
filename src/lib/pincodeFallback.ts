interface FallbackPostOffice {
  Name: string;
  Pincode: string;
  District: string;
  State: string;
}

export interface PincodeFallback {
  [pincode: string]: FallbackPostOffice[];
}

export const PINCODE_FALLBACK: PincodeFallback = {
  "247667": [
    { Name: "Roorkee", Pincode: "247667", District: "Haridwar", State: "Uttarakhand" },
    { Name: "Roorkee Cantt", Pincode: "247667", District: "Haridwar", State: "Uttarakhand" },
    { Name: "Iqbalpur", Pincode: "247667", District: "Haridwar", State: "Uttarakhand" },
  ],
  "110001": [
    { Name: "Connaught Place", Pincode: "110001", District: "New Delhi", State: "Delhi" },
    { Name: "Patel Nagar", Pincode: "110001", District: "New Delhi", State: "Delhi" },
    { Name: "Gole Market", Pincode: "110001", District: "New Delhi", State: "Delhi" },
  ],
  "400001": [
    { Name: "Mumbai GPO", Pincode: "400001", District: "Mumbai", State: "Maharashtra" },
    { Name: "Fort", Pincode: "400001", District: "Mumbai", State: "Maharashtra" },
    { Name: "Churchgate", Pincode: "400001", District: "Mumbai", State: "Maharashtra" },
  ],
  "560001": [
    { Name: "Bangalore GPO", Pincode: "560001", District: "Bangalore", State: "Karnataka" },
    { Name: "Vasanth Nagar", Pincode: "560001", District: "Bangalore", State: "Karnataka" },
    { Name: "Cantonment", Pincode: "560001", District: "Bangalore", State: "Karnataka" },
  ],
  "600001": [
    { Name: "Chennai GPO", Pincode: "600001", District: "Chennai", State: "Tamil Nadu" },
    { Name: "Parrys", Pincode: "600001", District: "Chennai", State: "Tamil Nadu" },
    { Name: "George Town", Pincode: "600001", District: "Chennai", State: "Tamil Nadu" },
  ],
  "700001": [
    { Name: "Kolkata GPO", Pincode: "700001", District: "Kolkata", State: "West Bengal" },
    { Name: "B BD Bag", Pincode: "700001", District: "Kolkata", State: "West Bengal" },
    { Name: "Bowbazar", Pincode: "700001", District: "Kolkata", State: "West Bengal" },
  ],
  "500001": [
    { Name: "Hyderabad GPO", Pincode: "500001", District: "Hyderabad", State: "Telangana" },
    { Name: "Abids", Pincode: "500001", District: "Hyderabad", State: "Telangana" },
    { Name: "Nampally", Pincode: "500001", District: "Hyderabad", State: "Telangana" },
  ],
  "380001": [
    { Name: "Ahmedabad GPO", Pincode: "380001", District: "Ahmedabad", State: "Gujarat" },
    { Name: "Dariapur", Pincode: "380001", District: "Ahmedabad", State: "Gujarat" },
    { Name: "Kalupur", Pincode: "380001", District: "Ahmedabad", State: "Gujarat" },
  ],
  "302001": [
    { Name: "Jaipur GPO", Pincode: "302001", District: "Jaipur", State: "Rajasthan" },
    { Name: "Gopinath", Pincode: "302001", District: "Jaipur", State: "Rajasthan" },
    { Name: "Chandpole", Pincode: "302001", District: "Jaipur", State: "Rajasthan" },
  ],
  "411001": [
    { Name: "Pune GPO", Pincode: "411001", District: "Pune", State: "Maharashtra" },
    { Name: "Koregaon Park", Pincode: "411001", District: "Pune", State: "Maharashtra" },
    { Name: "Cantonment", Pincode: "411001", District: "Pune", State: "Maharashtra" },
  ],
};

export function getFallbackPincodeData(pincode: string): FallbackPostOffice[] {
  return PINCODE_FALLBACK[pincode] ?? [];
}
