/*
  # Create Travel & Trip Planning System

  ## Summary
  Creates a comprehensive trip-centric travel planning system with multi-user collaboration.
  Supports solo travel, couples, families, groups, events, and tours with shared planning spaces.

  ## New Tables
  
  ### trips
  Core trip entity - parent object for all travel planning
  - `id` (uuid, primary key)
  - `owner_id` (uuid, references auth.users) - Trip creator
  - `name` (text) - Trip name (e.g., "Italy Honeymoon")
  - `description` (text) - Trip details
  - `trip_type` (text) - solo, couple, family, group, event, tour
  - `start_date` (date) - Trip start
  - `end_date` (date) - Trip end
  - `visibility` (text) - personal, shared
  - `status` (text) - planning, confirmed, in_progress, completed, archived
  - `cover_image_url` (text) - Optional trip image
  - `notes` (text) - Shared notes
  - `created_at`, `updated_at`

  ### trip_collaborators
  Multi-user collaboration with roles
  - `id` (uuid, primary key)
  - `trip_id` (uuid, references trips)
  - `user_id` (uuid, references auth.users)
  - `role` (text) - owner, editor, viewer
  - `invited_by` (uuid, references auth.users)
  - `joined_at` (timestamptz)

  ### trip_destinations
  Multiple destinations per trip
  - `id` (uuid, primary key)
  - `trip_id` (uuid, references trips)
  - `name` (text) - Destination name
  - `country` (text)
  - `city` (text)
  - `timezone` (text) - IANA timezone
  - `arrival_date` (date)
  - `departure_date` (date)
  - `order_index` (int) - For sequencing
  - `notes` (text)

  ### trip_itinerary_items
  Day-by-day planning
  - `id` (uuid, primary key)
  - `trip_id` (uuid, references trips)
  - `destination_id` (uuid, references trip_destinations, nullable)
  - `date` (date)
  - `start_time` (time)
  - `end_time` (time)
  - `title` (text)
  - `description` (text)
  - `category` (text) - travel, activity, food, reservation, milestone
  - `location` (text)
  - `booking_reference` (text)
  - `cost` (numeric)
  - `assigned_to` (uuid[], array of user_ids)
  - `notes` (text)
  - `order_index` (int)

  ### trip_accommodations
  All stays organized
  - `id` (uuid, primary key)
  - `trip_id` (uuid, references trips)
  - `destination_id` (uuid, references trip_destinations, nullable)
  - `name` (text) - Hotel/Airbnb name
  - `type` (text) - hotel, airbnb, hostel, resort, camping, other
  - `address` (text)
  - `check_in_date` (date)
  - `check_out_date` (date)
  - `booking_reference` (text)
  - `cost` (numeric)
  - `currency` (text)
  - `assigned_travellers` (uuid[], array of user_ids)
  - `contact_info` (text)
  - `notes` (text)

  ### trip_places_to_visit
  Wishlist and ideas
  - `id` (uuid, primary key)
  - `trip_id` (uuid, references trips)
  - `destination_id` (uuid, references trip_destinations, nullable)
  - `name` (text)
  - `category` (text) - food, activity, landmark, shopping, nature, culture
  - `priority` (text) - must_see, want_to_see, if_time, maybe
  - `address` (text)
  - `notes` (text)
  - `suggested_by` (uuid, references auth.users)
  - `votes` (int, default 0)
  - `visited` (boolean, default false)
  - `visited_date` (date)

  ### trip_packing_lists
  Master packing list per trip
  - `id` (uuid, primary key)
  - `trip_id` (uuid, references trips)
  - `name` (text) - "Master List" or personal list name
  - `owner_id` (uuid, references auth.users) - null for shared master list
  - `is_master` (boolean) - True for trip-wide list
  - `is_template` (boolean) - Can be reused

  ### trip_packing_items
  Individual packing items
  - `id` (uuid, primary key)
  - `packing_list_id` (uuid, references trip_packing_lists)
  - `category` (text) - clothing, toiletries, documents, electronics, medication, other
  - `item_name` (text)
  - `quantity` (int)
  - `packed` (boolean, default false)
  - `notes` (text)
  - `order_index` (int)

  ### trip_budget_categories
  Budget breakdown
  - `id` (uuid, primary key)
  - `trip_id` (uuid, references trips)
  - `category` (text) - transport, accommodation, food, activities, shopping, other
  - `budgeted_amount` (numeric)
  - `currency` (text, default 'USD')

  ### trip_expenses
  Expense logging with splits
  - `id` (uuid, primary key)
  - `trip_id` (uuid, references trips)
  - `budget_category_id` (uuid, references trip_budget_categories, nullable)
  - `date` (date)
  - `description` (text)
  - `amount` (numeric)
  - `currency` (text)
  - `paid_by` (uuid, references auth.users)
  - `split_between` (uuid[], array of user_ids)
  - `receipt_url` (text)
  - `notes` (text)

  ### trip_road_trip_stops
  Route-based planning (optional)
  - `id` (uuid, primary key)
  - `trip_id` (uuid, references trips)
  - `destination_id` (uuid, references trip_destinations, nullable)
  - `stop_number` (int)
  - `location_name` (text)
  - `arrival_date` (date)
  - `departure_date` (date)
  - `distance_from_previous` (numeric) - in km
  - `estimated_travel_time` (interval)
  - `notes` (text)

  ## Security
  - RLS enabled on all tables
  - Users can only access trips they own or collaborate on
  - Role-based permissions enforced
  - Private trips remain fully private
*/

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trip_type text DEFAULT 'solo' CHECK (trip_type IN ('solo', 'couple', 'family', 'group', 'event', 'tour')),
  start_date date,
  end_date date,
  visibility text DEFAULT 'personal' CHECK (visibility IN ('personal', 'shared')),
  status text DEFAULT 'planning' CHECK (status IN ('planning', 'confirmed', 'in_progress', 'completed', 'archived')),
  cover_image_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trip_collaborators table
CREATE TABLE IF NOT EXISTS trip_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(trip_id, user_id)
);

-- Create trip_destinations table
CREATE TABLE IF NOT EXISTS trip_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  country text,
  city text,
  timezone text,
  arrival_date date,
  departure_date date,
  order_index int DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create trip_itinerary_items table
CREATE TABLE IF NOT EXISTS trip_itinerary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  destination_id uuid REFERENCES trip_destinations(id) ON DELETE SET NULL,
  date date NOT NULL,
  start_time time,
  end_time time,
  title text NOT NULL,
  description text,
  category text DEFAULT 'activity' CHECK (category IN ('travel', 'activity', 'food', 'reservation', 'milestone')),
  location text,
  booking_reference text,
  cost numeric,
  assigned_to uuid[],
  notes text,
  order_index int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create trip_accommodations table
CREATE TABLE IF NOT EXISTS trip_accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  destination_id uuid REFERENCES trip_destinations(id) ON DELETE SET NULL,
  name text NOT NULL,
  type text DEFAULT 'hotel' CHECK (type IN ('hotel', 'airbnb', 'hostel', 'resort', 'camping', 'other')),
  address text,
  check_in_date date,
  check_out_date date,
  booking_reference text,
  cost numeric,
  currency text DEFAULT 'USD',
  assigned_travellers uuid[],
  contact_info text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create trip_places_to_visit table
CREATE TABLE IF NOT EXISTS trip_places_to_visit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  destination_id uuid REFERENCES trip_destinations(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text DEFAULT 'activity' CHECK (category IN ('food', 'activity', 'landmark', 'shopping', 'nature', 'culture')),
  priority text DEFAULT 'want_to_see' CHECK (priority IN ('must_see', 'want_to_see', 'if_time', 'maybe')),
  address text,
  notes text,
  suggested_by uuid REFERENCES auth.users(id),
  votes int DEFAULT 0,
  visited boolean DEFAULT false,
  visited_date date,
  created_at timestamptz DEFAULT now()
);

-- Create trip_packing_lists table
CREATE TABLE IF NOT EXISTS trip_packing_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_master boolean DEFAULT false,
  is_template boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create trip_packing_items table
CREATE TABLE IF NOT EXISTS trip_packing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_list_id uuid NOT NULL REFERENCES trip_packing_lists(id) ON DELETE CASCADE,
  category text DEFAULT 'other' CHECK (category IN ('clothing', 'toiletries', 'documents', 'electronics', 'medication', 'other')),
  item_name text NOT NULL,
  quantity int DEFAULT 1,
  packed boolean DEFAULT false,
  notes text,
  order_index int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create trip_budget_categories table
CREATE TABLE IF NOT EXISTS trip_budget_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('transport', 'accommodation', 'food', 'activities', 'shopping', 'other')),
  budgeted_amount numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  created_at timestamptz DEFAULT now(),
  UNIQUE(trip_id, category)
);

-- Create trip_expenses table
CREATE TABLE IF NOT EXISTS trip_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  budget_category_id uuid REFERENCES trip_budget_categories(id) ON DELETE SET NULL,
  date date NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'USD',
  paid_by uuid NOT NULL REFERENCES auth.users(id),
  split_between uuid[],
  receipt_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create trip_road_trip_stops table
CREATE TABLE IF NOT EXISTS trip_road_trip_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  destination_id uuid REFERENCES trip_destinations(id) ON DELETE SET NULL,
  stop_number int NOT NULL,
  location_name text NOT NULL,
  arrival_date date,
  departure_date date,
  distance_from_previous numeric,
  estimated_travel_time interval,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_places_to_visit ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_packing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_packing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_road_trip_stops ENABLE ROW LEVEL SECURITY;

-- Helper function to check trip access
CREATE OR REPLACE FUNCTION user_can_access_trip(trip_id_param uuid, user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trips t
    LEFT JOIN trip_collaborators tc ON tc.trip_id = t.id AND tc.user_id = user_id_param
    WHERE t.id = trip_id_param
      AND (t.owner_id = user_id_param OR tc.user_id IS NOT NULL)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check edit permission
CREATE OR REPLACE FUNCTION user_can_edit_trip(trip_id_param uuid, user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trips t
    LEFT JOIN trip_collaborators tc ON tc.trip_id = t.id AND tc.user_id = user_id_param
    WHERE t.id = trip_id_param
      AND (
        t.owner_id = user_id_param 
        OR (tc.user_id IS NOT NULL AND tc.role IN ('owner', 'editor'))
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for trips
CREATE POLICY "Users can view trips they own or collaborate on"
  ON trips FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR user_can_access_trip(id, auth.uid()));

CREATE POLICY "Users can create their own trips"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update trips they own or can edit"
  ON trips FOR UPDATE
  TO authenticated
  USING (user_can_edit_trip(id, auth.uid()))
  WITH CHECK (user_can_edit_trip(id, auth.uid()));

CREATE POLICY "Users can delete trips they own"
  ON trips FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- RLS Policies for trip_collaborators
CREATE POLICY "Users can view collaborators for trips they access"
  ON trip_collaborators FOR SELECT
  TO authenticated
  USING (user_can_access_trip(trip_id, auth.uid()));

CREATE POLICY "Trip owners can manage collaborators"
  ON trip_collaborators FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_id AND trips.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_id AND trips.owner_id = auth.uid())
  );

-- RLS Policies for trip_destinations
CREATE POLICY "Users can view destinations for accessible trips"
  ON trip_destinations FOR SELECT
  TO authenticated
  USING (user_can_access_trip(trip_id, auth.uid()));

CREATE POLICY "Users can manage destinations for editable trips"
  ON trip_destinations FOR ALL
  TO authenticated
  USING (user_can_edit_trip(trip_id, auth.uid()))
  WITH CHECK (user_can_edit_trip(trip_id, auth.uid()));

-- RLS Policies for trip_itinerary_items
CREATE POLICY "Users can view itinerary for accessible trips"
  ON trip_itinerary_items FOR SELECT
  TO authenticated
  USING (user_can_access_trip(trip_id, auth.uid()));

CREATE POLICY "Users can manage itinerary for editable trips"
  ON trip_itinerary_items FOR ALL
  TO authenticated
  USING (user_can_edit_trip(trip_id, auth.uid()))
  WITH CHECK (user_can_edit_trip(trip_id, auth.uid()));

-- RLS Policies for trip_accommodations
CREATE POLICY "Users can view accommodations for accessible trips"
  ON trip_accommodations FOR SELECT
  TO authenticated
  USING (user_can_access_trip(trip_id, auth.uid()));

CREATE POLICY "Users can manage accommodations for editable trips"
  ON trip_accommodations FOR ALL
  TO authenticated
  USING (user_can_edit_trip(trip_id, auth.uid()))
  WITH CHECK (user_can_edit_trip(trip_id, auth.uid()));

-- RLS Policies for trip_places_to_visit
CREATE POLICY "Users can view places for accessible trips"
  ON trip_places_to_visit FOR SELECT
  TO authenticated
  USING (user_can_access_trip(trip_id, auth.uid()));

CREATE POLICY "Users can manage places for editable trips"
  ON trip_places_to_visit FOR ALL
  TO authenticated
  USING (user_can_edit_trip(trip_id, auth.uid()))
  WITH CHECK (user_can_edit_trip(trip_id, auth.uid()));

-- RLS Policies for trip_packing_lists
CREATE POLICY "Users can view packing lists for accessible trips"
  ON trip_packing_lists FOR SELECT
  TO authenticated
  USING (user_can_access_trip(trip_id, auth.uid()));

CREATE POLICY "Users can manage packing lists for editable trips"
  ON trip_packing_lists FOR ALL
  TO authenticated
  USING (user_can_edit_trip(trip_id, auth.uid()) OR owner_id = auth.uid())
  WITH CHECK (user_can_edit_trip(trip_id, auth.uid()) OR owner_id = auth.uid());

-- RLS Policies for trip_packing_items
CREATE POLICY "Users can view packing items for accessible trips"
  ON trip_packing_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_packing_lists tpl
      WHERE tpl.id = packing_list_id AND user_can_access_trip(tpl.trip_id, auth.uid())
    )
  );

CREATE POLICY "Users can manage packing items for their lists"
  ON trip_packing_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_packing_lists tpl
      WHERE tpl.id = packing_list_id 
        AND (user_can_edit_trip(tpl.trip_id, auth.uid()) OR tpl.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_packing_lists tpl
      WHERE tpl.id = packing_list_id 
        AND (user_can_edit_trip(tpl.trip_id, auth.uid()) OR tpl.owner_id = auth.uid())
    )
  );

-- RLS Policies for trip_budget_categories
CREATE POLICY "Users can view budget categories for accessible trips"
  ON trip_budget_categories FOR SELECT
  TO authenticated
  USING (user_can_access_trip(trip_id, auth.uid()));

CREATE POLICY "Users can manage budget categories for editable trips"
  ON trip_budget_categories FOR ALL
  TO authenticated
  USING (user_can_edit_trip(trip_id, auth.uid()))
  WITH CHECK (user_can_edit_trip(trip_id, auth.uid()));

-- RLS Policies for trip_expenses
CREATE POLICY "Users can view expenses for accessible trips"
  ON trip_expenses FOR SELECT
  TO authenticated
  USING (user_can_access_trip(trip_id, auth.uid()));

CREATE POLICY "Users can manage expenses for editable trips"
  ON trip_expenses FOR ALL
  TO authenticated
  USING (user_can_edit_trip(trip_id, auth.uid()))
  WITH CHECK (user_can_edit_trip(trip_id, auth.uid()));

-- RLS Policies for trip_road_trip_stops
CREATE POLICY "Users can view road trip stops for accessible trips"
  ON trip_road_trip_stops FOR SELECT
  TO authenticated
  USING (user_can_access_trip(trip_id, auth.uid()));

CREATE POLICY "Users can manage road trip stops for editable trips"
  ON trip_road_trip_stops FOR ALL
  TO authenticated
  USING (user_can_edit_trip(trip_id, auth.uid()))
  WITH CHECK (user_can_edit_trip(trip_id, auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trips_owner ON trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_trip ON trip_collaborators(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_user ON trip_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_destinations_trip ON trip_destinations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_itinerary_trip_date ON trip_itinerary_items(trip_id, date);
CREATE INDEX IF NOT EXISTS idx_trip_accommodations_trip ON trip_accommodations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_places_trip ON trip_places_to_visit(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_packing_lists_trip ON trip_packing_lists(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_trip ON trip_expenses(trip_id);
