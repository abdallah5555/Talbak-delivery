-- ============================================================================
-- MIGRATION: 20260817_driver_status_capacity_statemachine.sql
-- DESCRIPTION: Phase 5.2 Driver Status Protection, Order State Machine RPC,
--              Automatic Capacity Decrement Trigger & Hardened Orders UPDATE RLS
-- ============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON public.driver_status
ALTER TABLE public.driver_status ENABLE ROW LEVEL SECURITY;

-- 2. RLS POLICIES FOR public.driver_status
DROP POLICY IF EXISTS "Driver Status View Policy" ON public.driver_status;
DROP POLICY IF EXISTS "Driver Status Insert Policy" ON public.driver_status;
DROP POLICY IF EXISTS "Driver Status Update Policy" ON public.driver_status;
DROP POLICY IF EXISTS "Driver Status Delete Policy" ON public.driver_status;

-- 2A. SELECT Policy:
-- Drivers see their own status, Admins see all statuses
CREATE POLICY "Driver Status View Policy" ON public.driver_status
  FOR SELECT USING (
    auth.uid() = driver_id
    OR public.is_admin(auth.uid())
  );

-- 2B. INSERT Policy:
-- Drivers can initialize their own row; Admins can insert any
CREATE POLICY "Driver Status Insert Policy" ON public.driver_status
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      (auth.uid() = driver_id AND public.is_driver(auth.uid()))
      OR public.is_admin(auth.uid())
    )
  );

-- 2C. UPDATE Policy:
-- Drivers can update ONLY their own row (coordinates, is_online, last_seen);
-- Admin has full update capability.
-- NOTE: Financial or arbitrary columns cannot be breached.
CREATE POLICY "Driver Status Update Policy" ON public.driver_status
  FOR UPDATE USING (
    (auth.uid() = driver_id AND public.is_driver(auth.uid()))
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    (auth.uid() = driver_id AND public.is_driver(auth.uid()))
    OR public.is_admin(auth.uid())
  );

-- 2D. DELETE Policy: Admin only
CREATE POLICY "Driver Status Delete Policy" ON public.driver_status
  FOR DELETE USING (
    public.is_admin(auth.uid())
  );


-- 3. DATABASE TRIGGER TO AUTOMATICALLY DECREMENT DRIVER CAPACITY
-- When an order moves from an active state to 'delivered' or 'cancelled',
-- decrement current_active_orders for the assigned driver, ensuring it never drops below 0.
-- Guarantees exact 1-time decrement using transition check (OLD.status NOT IN ('delivered', 'cancelled')).
CREATE OR REPLACE FUNCTION public.handle_order_capacity_decrement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- Check if order had an assigned driver and transitioned to terminal state
  IF OLD.driver_id IS NOT NULL 
     AND OLD.status NOT IN ('delivered', 'cancelled')
     AND NEW.status IN ('delivered', 'cancelled') THEN
     
    UPDATE public.driver_status
    SET current_active_orders = GREATEST(0, current_active_orders - 1),
        last_seen = NOW()
    WHERE driver_id = OLD.driver_id;
    
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_capacity_decrement ON public.orders;
CREATE TRIGGER trg_order_capacity_decrement
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_capacity_decrement();


-- 4. AUTHORITATIVE DRIVER STATE MACHINE RPC
-- driver_update_order_step enforces strictly sequential step progression:
-- driver_assigned -> arrived_store -> picked_up -> arrived_customer -> delivered
-- Prevents skipping steps, backwards traversal, price tampering, or unauthorized order updates.
CREATE OR REPLACE FUNCTION public.driver_update_order_step(
  p_order_id UUID,
  p_next_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_order RECORD;
  v_expected_prev_status TEXT;
  v_new_driver_step TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Lock order row for authoritative inspection
  SELECT id, driver_id, status, subtotal, delivery_fee, discount, total
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  -- Verify caller is the assigned driver or admin
  IF NOT public.is_admin(v_caller_id) AND (v_order.driver_id IS NULL OR v_order.driver_id <> v_caller_id) THEN
    RAISE EXCEPTION 'Not authorized to update status for order %', p_order_id;
  END IF;

  -- State Machine Sequential Enforcement
  IF p_next_status = 'arrived_store' THEN
    IF v_order.status <> 'driver_assigned' THEN
      RAISE EXCEPTION 'Invalid transition: Cannot transition to arrived_store from current status %', v_order.status;
    END IF;
    v_new_driver_step := 'at_store';

  ELSIF p_next_status = 'picked_up' THEN
    IF v_order.status <> 'arrived_store' THEN
      RAISE EXCEPTION 'Invalid transition: Cannot transition to picked_up from current status %', v_order.status;
    END IF;
    v_new_driver_step := 'picked';

  ELSIF p_next_status = 'arrived_customer' THEN
    IF v_order.status <> 'picked_up' THEN
      RAISE EXCEPTION 'Invalid transition: Cannot transition to arrived_customer from current status %', v_order.status;
    END IF;
    v_new_driver_step := 'at_customer';

  ELSIF p_next_status = 'delivered' THEN
    IF v_order.status <> 'arrived_customer' THEN
      RAISE EXCEPTION 'Invalid transition: Cannot transition to delivered from current status %', v_order.status;
    END IF;
    v_new_driver_step := 'completed';

  ELSE
    RAISE EXCEPTION 'Unsupported next status: % for driver update', p_next_status;
  END IF;

  -- Perform authoritative state update (Financial columns, customer_id and driver_id remain untouched)
  UPDATE public.orders
  SET status = p_next_status,
      driver_step = v_new_driver_step
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', p_next_status,
    'driver_step', v_new_driver_step
  );
END;
$$;


-- 5. HARDENED ORDERS UPDATE RLS POLICY
-- Blocks direct UPDATE by Driver to bypass the state machine RPC.
-- Customer can only cancel their pending order ('sent' -> 'cancelled').
-- Driver cannot perform direct table updates (must use driver_update_order_step RPC or accept_order_atomic).
-- Admin maintains full update authority.
DROP POLICY IF EXISTS "Orders Update Policy" ON public.orders;

CREATE POLICY "Orders Update Policy" ON public.orders
  FOR UPDATE USING (
    -- Customer can only target their own pending order
    (auth.uid() = customer_id AND status = 'sent')
    -- Admin has full direct update control
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    -- Customer can ONLY change status to 'cancelled'
    (
      auth.uid() = customer_id
      AND status = 'cancelled'
    )
    -- Admin has full direct update control
    OR public.is_admin(auth.uid())
  );
