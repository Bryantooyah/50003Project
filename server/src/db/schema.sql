create extension if not exists pgcrypto;

create type user_role as enum ('therapist', 'parent', 'student', 'admin');

create table users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  name text not null,
  role user_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table therapists (
  user_id uuid primary key references users(id) on delete cascade
);

create table parents (
  user_id uuid primary key references users(id) on delete cascade
);

-- DAS admin: manages accounts and relationships (student<->parent,
-- student<->therapist). No admin-specific columns needed yet, but the
-- table exists now so admin accounts can be created alongside the others.
create table admins (
  user_id uuid primary key references users(id) on delete cascade
);

create table students (
  user_id uuid primary key references users(id) on delete cascade,
  date_of_birth date,
  level text,                 -- e.g. "Primary 3" (DAS band/level)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Therapy group (many-to-many relationship: therapist <-> student)
create table therapist_students (
  therapist_id uuid not null references therapists(user_id) on delete cascade,
  student_id uuid not null references students(user_id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (therapist_id, student_id)
);

create table therapist_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(user_id) on delete cascade,
  therapist_id uuid not null references therapists(user_id),
  note text not null,
  created_at timestamptz not null default now()
);

-- Parents (many-to-many relationship: parent <-> student)
create table parent_students (
  parent_id uuid not null references parents(user_id) on delete cascade,
  student_id uuid not null references students(user_id) on delete cascade,
  relationship text,          -- optional: "mother", "father", "guardian"
  granted_at timestamptz not null default now(),
  primary key (parent_id, student_id)
);

-- One row per submitted writing sample, plus everything derived from it.
-- ai_analysis / recommendations are in raw JSONB
create table writing_samples (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(user_id) on delete cascade,
  submitted_by uuid not null references users(id),  -- therapist who submitted it
  sample_text text not null,
  ai_analysis jsonb,           -- AI-detected errors / summary, shape owned by analysis pipeline
  recommendations jsonb,       -- AI-generated recommendations, shape owned by analysis pipeline
  therapist_feedback text,     -- this therapist's feedback on this specific sample
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- helpful indexes for dashboard queries
create index on writing_samples (student_id);
create index on therapist_notes (student_id);