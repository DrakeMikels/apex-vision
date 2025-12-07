-- Safe Profiles update
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'has_pro_access') then
    alter table public.profiles add column has_pro_access boolean default false;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'email') then
    alter table public.profiles add column email text;
  end if;
end $$;

-- Create scores if not exists
create table if not exists public.scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  saccade_score integer,
  smooth_pursuit_score integer,
  peripheral_score integer,
  reaction_score integer,
  stability_score integer,
  overall_score integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create purchases if not exists
create table if not exists public.purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  stripe_session_id text,
  amount integer,
  status text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.profiles enable row level security;
alter table public.scores enable row level security;
alter table public.purchases enable row level security;

-- Policies
drop policy if exists "Users can view own scores" on public.scores;
create policy "Users can view own scores" on public.scores for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own scores" on public.scores;
create policy "Users can insert own scores" on public.scores for insert with check (auth.uid() = user_id);

-- Check if handle_new_user exists and update it
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Upsert profile (safe for existing users)
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

