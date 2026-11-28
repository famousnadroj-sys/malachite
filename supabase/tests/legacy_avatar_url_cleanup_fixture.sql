create table public.profiles (
  id uuid primary key,
  avatar jsonb not null default '{}'::jsonb
);

insert into public.profiles(id,avatar) values
('70000000-0000-0000-0000-000000000001',
 '{"type":"humanforge-3d","version":"1","config":{"hair":"curly"},"imagePath":"70000000-0000-0000-0000-000000000001/avatar-1.png","imageUrl":"https://project.supabase.co/storage/v1/object/sign/profile-photos/70000000-0000-0000-0000-000000000001/avatar-1.png?token=expired"}'::jsonb),
('70000000-0000-0000-0000-000000000002',
 '{"type":"humanforge-3d","version":"1","config":{"hair":"braids"},"imagePath":"70000000-0000-0000-0000-000000000002/avatar-2.png"}'::jsonb),
('70000000-0000-0000-0000-000000000003',
 '{"type":"pro-vector","version":"3","config":{"hair":"short"},"imageUrl":"https://cdn.example.test/avatar.png"}'::jsonb);
