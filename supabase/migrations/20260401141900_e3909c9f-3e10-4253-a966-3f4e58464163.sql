
CREATE OR REPLACE FUNCTION public.claim_tickets(_ticket_ids uuid[], _technician_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_count integer;
BEGIN
  -- Only allow if the user is a technician
  IF NOT has_role(_technician_id, 'technician') THEN
    RAISE EXCEPTION 'Only technicians can claim tickets';
  END IF;

  -- Atomically claim only unassigned tickets
  UPDATE service_orders
  SET assigned_technician = _technician_id, updated_at = now()
  WHERE id = ANY(_ticket_ids)
    AND assigned_technician IS NULL;

  GET DIAGNOSTICS claimed_count = ROW_COUNT;
  RETURN claimed_count;
END;
$$;
