-- حالات سير العمل الثماني المستخدمة في التطبيق + دور «موظف»
alter type public.tx_status add value if not exists 'in_progress';
alter type public.tx_status add value if not exists 'under_review';
alter type public.tx_status add value if not exists 'waiting_client';
alter type public.tx_status add value if not exists 'waiting_government';
alter type public.tx_status add value if not exists 'completed';
alter type public.tx_status add value if not exists 'closed';
alter type public.tx_status add value if not exists 'cancelled';
alter type public.user_role add value if not exists 'staff';
