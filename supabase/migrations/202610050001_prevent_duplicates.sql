-- حماية من التكرار على مستوى قاعدة البيانات (تعمل حتى لو أخطأ كود التطبيق)
create unique index if not exists companies_name_unique
  on public.companies (lower(btrim(regexp_replace(name, '\s+', ' ', 'g'))));
create unique index if not exists company_ids_company_type_unique
  on public.company_ids (company_id, id_type) where company_id is not null;
create unique index if not exists tax_assessments_company_year_unique
  on public.tax_assessments (company_id, year);
create unique index if not exists financial_statements_company_year_unique
  on public.financial_statements (company_id, year);
