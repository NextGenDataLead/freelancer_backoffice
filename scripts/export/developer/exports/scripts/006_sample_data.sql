-- Migration: 006 - Sample Data
-- Inserts sample tenant and profile data for testing

SET session_replication_role = replica;

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- ====================
-- SAMPLE DATA INSERTION
-- ====================

-- Insert sample tenant data
COPY "public"."tenants" ("id", "name", "subdomain", "created_at", "updated_at", "settings", "subscription_status", "billing_email", "max_users", "max_storage_gb") FROM stdin;
8895945a-b288-4c61-ab31-1c25a1eee7b0	User's Organization	\N	2025-08-17 12:47:25.148819+00	2025-08-17 12:47:25.148819+00	{}	active	nextgendatalead@gmail.com	10	5
\.

-- Insert sample profile data
COPY "public"."profiles" ("id", "tenant_id", "clerk_user_id", "email", "first_name", "last_name", "avatar_url", "role", "created_at", "updated_at", "last_sign_in_at", "is_active", "preferences", "username", "anonymized_at", "deletion_reason", "onboarding_complete") FROM stdin;
add877a5-bbe8-4649-8721-c329c0744632	8895945a-b288-4c61-ab31-1c25a1eee7b0	user_31Po01OVXdbEBt8MOXkcMX41VZM	nextgendatalead@gmail.com	Imd	ddd	https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdCIsImlpZCI6Imluc18zMGtHNENxNTZVQVVHUXVXdGlwOWZkc1FVSE4iLCJyaWQiOiJ1c2VyXzMxUG8wMU9WWGRiRUJ0OE1PWGtjTVg0MVZaTSJ9	owner	2025-08-17 12:47:25.222346+00	2025-08-17 12:48:23.503432+00	2025-08-17 12:47:49.839+00	t	{}	\N	\N	\N	t
\.

-- Insert sample GDPR audit logs showing 30-day grace periods
COPY "public"."gdpr_audit_logs" ("id", "user_id", "action", "timestamp", "ip_address", "user_agent", "metadata") FROM stdin;
3a883bac-1ab3-4421-a966-3e5dd31c2636	6c42d6a2-d375-4d03-9ed4-e0d13cd62e28	deletion_requested	2025-08-11 11:52:41.48+00	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"reason": "Testing enhanced Supabase integration for GDPR compliance", "scheduled_for": "2025-09-10T11:52:41.978Z", "grace_period_days": 30}
4cd91b3a-3ce2-417f-a7d3-6568ed992da0	6c42d6a2-d375-4d03-9ed4-e0d13cd62e28	deletion_requested	2025-08-11 12:18:32.962+00	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"reason": "Test", "scheduled_for": "2025-09-10T12:18:32.203Z", "grace_period_days": 30}
ea515adc-930c-46d4-8259-d4b794f9442a	1b46cc94-a302-467c-b3ef-7c81bead2abc	deletion_requested	2025-08-11 19:52:27.041+00	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"reason": "TEST", "scheduled_for": "2025-09-10T19:52:26.724Z", "grace_period_days": 30}
e2c23ad8-6d4f-4e35-9ea9-3776b3161132	ea2bb118-02d5-4179-a0e0-ed5b7f91d467	deletion_requested	2025-08-11 21:41:06.93+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"reason": "fdf", "scheduled_for": "2025-09-10T21:41:06.196Z", "grace_period_days": 30}
9dc71314-4fd6-44a0-8fba-3aa15f398f7c	ea2bb118-02d5-4179-a0e0-ed5b7f91d467	deletion_requested	2025-08-12 00:14:11.229+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"reason": "dfadf", "scheduled_for": "2025-09-11T00:14:10.935Z", "grace_period_days": 30}
4daee447-1957-4aa5-9754-36c608206c09	ea2bb118-02d5-4179-a0e0-ed5b7f91d467	deletion_completed	2025-08-12 12:22:35.535414+00	\N	\N	{"method": "soft_deletion_with_anonymization", "reason": "Testing soft deletion functionality for GDPR compliance verification", "clerk_user_id": "user_319tkZm1SoO8maxQLNWPoUcr2LS", "original_email": "deleted-user-ea2bb118-02d5-4179-a0e0-ed5b7f91d467@anonymized.local", "clerk_anonymized": true, "supabase_anonymized": true}
21b254f2-0f38-476e-b620-d7c906ea9d0d	ea2bb118-02d5-4179-a0e0-ed5b7f91d467	data_export	2025-08-12 12:34:28.62083+00	\N	\N	{"clerk_user_id": "user_319tkZm1SoO8maxQLNWPoUcr2LS", "export_version": "2.0", "data_architecture": "clerk_auth_supabase_business", "sections_included": ["authentication", "profile", "privacy", "communications", "businessData"]}
74b01e8a-fe23-47aa-a48c-e07eaf24125d	ea2bb118-02d5-4179-a0e0-ed5b7f91d467	deletion_requested	2025-08-12 12:34:58.449+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	{"reason": "Manual Test deletion", "scheduled_for": "2025-09-11T12:34:58.081Z", "grace_period_days": 30}
2a64e945-2a05-4437-ab19-724a4ff46eca	ea2bb118-02d5-4179-a0e0-ed5b7f91d467	deletion_requested	2025-08-12 12:37:26.15+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	{"reason": "Manual Test Deletion account", "scheduled_for": "2025-09-11T12:37:25.958Z", "grace_period_days": 30}
ad652018-a75a-4344-9551-226807a3024b	ea2bb118-02d5-4179-a0e0-ed5b7f91d467	deletion_requested	2025-08-12 12:38:32.052+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	{"reason": "Test", "scheduled_for": "2025-09-11T12:38:30.701Z", "grace_period_days": 30}
4ef28327-c76a-4f30-acf3-caf2ba056172	c7b018d8-dcc5-43e6-ae09-4d63448e60a3	deletion_requested	2025-08-12 12:42:52.758+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	{"reason": "test", "scheduled_for": "2025-09-11T12:42:52.338Z", "grace_period_days": 30}
43f7c348-a6f0-48f2-a030-4795fbcef00f	c7b018d8-dcc5-43e6-ae09-4d63448e60a3	deletion_completed	2025-08-12 12:45:48.641407+00	\N	\N	{"method": "soft_deletion_with_anonymization", "reason": "test", "clerk_user_id": "user_31BfgBaEhEVhqf4VSu5elWYFATq", "original_email": "deleted-user-c7b018d8-dcc5-43e6-ae09-4d63448e60a3@anonymized.local", "clerk_anonymized": true, "supabase_anonymized": true}
aa82b847-7241-48a2-a4b1-27072d8c2eb2	e7ea8a90-2526-4aa9-8873-a61c56d048ca	deletion_requested	2025-08-16 16:20:42.518+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	{"reason": "test", "scheduled_for": "2025-09-15T16:20:42.248Z", "grace_period_days": 30}
0a2647fe-5fcf-4448-8c70-5ead50a25c66	e7ea8a90-2526-4aa9-8873-a61c56d048ca	data_export	2025-08-16 16:21:01.662615+00	\N	\N	{"clerk_user_id": "user_31KNS2mqTeezuZmtz5id7T4l8PK", "export_version": "2.0", "data_architecture": "clerk_auth_supabase_business", "sections_included": ["authentication", "profile", "privacy", "communications", "businessData"]}
a77579ea-11f9-4804-be38-0d0023c49152	e7ea8a90-2526-4aa9-8873-a61c56d048ca	deletion_requested	2025-08-16 16:24:51.016+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	{"reason": "dfad", "scheduled_for": "2025-09-15T16:24:50.553Z", "grace_period_days": 30}
ab982d3c-a51b-4547-8e12-0d0bd5769ffd	e7ea8a90-2526-4aa9-8873-a61c56d048ca	deletion_completed	2025-08-16 16:28:47.804872+00	\N	\N	{"method": "soft_deletion_with_anonymization", "reason": "dfad", "clerk_user_id": "user_31KNS2mqTeezuZmtz5id7T4l8PK", "original_email": "deleted-user-e7ea8a90-2526-4aa9-8873-a61c56d048ca@anonymized.local", "clerk_anonymized": true, "supabase_anonymized": true}
047c98ef-4c90-485d-adf4-3e8b78938def	e7ea8a90-2526-4aa9-8873-a61c56d048ca	deletion_completed	2025-08-16 16:29:57.508665+00	\N	\N	{"method": "soft_deletion_with_anonymization", "reason": "dfad", "clerk_user_id": "user_31KNS2mqTeezuZmtz5id7T4l8PK", "original_email": "deleted-user-e7ea8a90-2526-4aa9-8873-a61c56d048ca@anonymized.local", "clerk_anonymized": true, "supabase_anonymized": true}
9362a29f-6437-40b5-9c51-db5f5e793a4f	e7ea8a90-2526-4aa9-8873-a61c56d048ca	deletion_completed	2025-08-16 16:36:07.192182+00	\N	\N	{"method": "soft_deletion_with_anonymization", "reason": "dfad", "clerk_user_id": "user_31KNS2mqTeezuZmtz5id7T4l8PK", "original_email": "deleted-user-e7ea8a90-2526-4aa9-8873-a61c56d048ca@anonymized.local", "clerk_anonymized": true, "supabase_anonymized": true}
d668dfe5-bfd1-48d3-9ec6-af83c6d4b9ea	e7ea8a90-2526-4aa9-8873-a61c56d048ca	deletion_completed	2025-08-16 16:37:48.877371+00	\N	\N	{"method": "soft_deletion_with_anonymization", "reason": "dfad", "clerk_user_id": "user_31KNS2mqTeezuZmtz5id7T4l8PK", "original_email": "deleted-user-e7ea8a90-2526-4aa9-8873-a61c56d048ca@anonymized.local", "clerk_anonymized": true, "supabase_anonymized": true}
\.

RESET ALL;