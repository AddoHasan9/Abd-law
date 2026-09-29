-- الشركات القائمة المضافة من «قسم الشركات» تُعلَّم خارجية حتى لا تظهر في «تأسيس الشركات»
update public.companies c
set external = true
where c.external is not true
  and not exists (select 1 from public.transactions t where t.company_id = c.id and t.type in ('tasis','formation'))
  and (select count(distinct w.done_at) from public.workflow_steps w where w.company_id = c.id and w.state = 'done') <= 1
  and not exists (select 1 from public.workflow_steps w where w.company_id = c.id and w.state <> 'done');
