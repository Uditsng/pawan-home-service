-- Supabase Extension Schema for Phase 3: Disputes

-- 1. Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'reviewing' CHECK (status IN ('reviewing', 'negotiating', 'resolved', 'escalated')),
  severity TEXT DEFAULT 'normal' CHECK (severity IN ('low', 'normal', 'urgent', 'critical')),
  issue_title TEXT,
  issue_description TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Anyone involved in the dispute can see it, Admins see all.
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Involved parties can view disputes" ON disputes FOR SELECT USING (
  auth.uid() = customer_id OR auth.uid() = partner_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Customers can insert disputes" ON disputes FOR INSERT WITH CHECK (
  auth.uid() = customer_id
);

CREATE POLICY "Admins can update disputes" ON disputes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Seed a dummy dispute so Admin dashboard is populated
INSERT INTO disputes (booking_id, customer_id, status, severity, issue_title, issue_description) 
SELECT id, customer_id, 'reviewing', 'urgent', 'Incomplete deep cleaning', 'The technician completely missed the master bedroom and left dirt.' FROM bookings LIMIT 1;
