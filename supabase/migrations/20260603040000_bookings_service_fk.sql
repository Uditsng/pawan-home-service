-- Add missing foreign key constraints for services relationship
-- 1. From bookings.service_id to services.id
ALTER TABLE bookings
ADD CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES services(id);

-- 2. From partner_services.service_id to services.id
ALTER TABLE partner_services
ADD CONSTRAINT partner_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
