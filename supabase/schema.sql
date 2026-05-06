-- Supabase Initial Schema Setup for Pavan Home Services

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked to Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'partner', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'customer')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Services Catalog
CREATE TABLE services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Anyone can read services, only admins can write
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services are viewable by everyone." ON services FOR SELECT USING (true);


-- 3. Bookings
CREATE TABLE bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  service_id UUID REFERENCES services(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  total_amount NUMERIC(10,2),
  address TEXT,
  city TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view own bookings" ON bookings FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = partner_id);
CREATE POLICY "Admins can view all bookings" ON bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Customers can insert bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);


-- Insert some seed data for Services so you have something to book!
INSERT INTO services (category, title, description, base_price) VALUES 
('cleaning', 'Deep House Cleaning', 'Intensive top-to-bottom cleaning including inside cabinets and appliances.', 149.00),
('plumbing', 'Emergency Plumbing', 'Rapid response 24/7 for leaks, ruptures, and clogs.', 95.00),
('electrical', 'Rewiring & Fault finding', 'Diagnostic and circuit repairs by certified electricians.', 110.00),
('landscaping', 'Garden Maintenance', 'Lawn mowing, edge trimming, and general debris cleanup.', 85.00);
