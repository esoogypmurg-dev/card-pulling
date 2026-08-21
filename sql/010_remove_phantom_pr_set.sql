-- The "PR" set row was a migration artifact: those 53 promo cards were merged
-- into the pre-existing "PROMO" set (same id/key preserved), so no card in the
-- `cards` table actually has set_code = 'PR'. Confirms zero rows before deleting.
select count(*) as should_be_zero from public.cards where set_code = 'PR';

delete from public.sets where code = 'PR';
