SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

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

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") FROM stdin;
00000000-0000-0000-0000-000000000000	dd99ff2d-e779-4e82-a0e7-c9b83473a569	{"action":"user_signedup","actor_id":"b3d53067-1726-4122-bf5e-445e7e35cdb5","actor_username":"imre.iddatasolutions@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2025-08-05 09:51:50.706394+00	
00000000-0000-0000-0000-000000000000	05684ddc-145f-42f6-a5f5-28e8e87b579f	{"action":"login","actor_id":"b3d53067-1726-4122-bf5e-445e7e35cdb5","actor_username":"imre.iddatasolutions@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-08-05 09:51:50.727233+00	
00000000-0000-0000-0000-000000000000	dedeaeb2-5b6b-4277-82c2-be1a69f8c202	{"action":"login","actor_id":"b3d53067-1726-4122-bf5e-445e7e35cdb5","actor_username":"imre.iddatasolutions@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-08-05 09:52:47.571234+00	
00000000-0000-0000-0000-000000000000	de2b72f6-ecb1-42ad-a88d-483c53b98386	{"action":"token_refreshed","actor_id":"b3d53067-1726-4122-bf5e-445e7e35cdb5","actor_username":"imre.iddatasolutions@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-08-05 10:53:02.084657+00	
00000000-0000-0000-0000-000000000000	d6943f37-80ec-401c-a68f-2373213f2dc7	{"action":"token_revoked","actor_id":"b3d53067-1726-4122-bf5e-445e7e35cdb5","actor_username":"imre.iddatasolutions@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-08-05 10:53:02.09379+00	
00000000-0000-0000-0000-000000000000	b8bdcd9b-1658-4247-a29f-820e3e1c690e	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"nextgendatalead@gmail.com","user_id":"697b8b4d-072c-410b-a3cc-4669fc87034a","user_phone":""}}	2025-08-11 19:14:31.62864+00	
00000000-0000-0000-0000-000000000000	9d88ce62-dc5f-45ba-ad6b-fb933bf24cc1	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"nextgendatalead@gmail.com","user_id":"697b8b4d-072c-410b-a3cc-4669fc87034a","user_phone":""}}	2025-08-15 14:38:51.814184+00	
00000000-0000-0000-0000-000000000000	78475527-55a1-4b6e-b59a-480f6e8851dd	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"nextgendatalead@gmail.com","user_id":"ae749a02-772e-46d6-97dd-b8ceb4709cdb","user_phone":""}}	2025-08-15 14:40:12.7635+00	
00000000-0000-0000-0000-000000000000	83171ab6-52ad-471f-aef4-efcb55884a31	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"nextgendatalead@gmail.com","user_id":"ae749a02-772e-46d6-97dd-b8ceb4709cdb","user_phone":""}}	2025-08-16 19:40:07.124802+00	
00000000-0000-0000-0000-000000000000	8e2a3c8f-ccb3-4646-9920-4e2524b07aee	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"nextgendatalead@gmail.com","user_id":"19998ca0-67a7-4ff5-ba7a-513ecc456e25","user_phone":""}}	2025-08-16 21:30:44.260624+00	
00000000-0000-0000-0000-000000000000	932de02d-8ba5-4984-9047-f6539ce2ecfb	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"nextgendatalead@gmail.com","user_id":"19998ca0-67a7-4ff5-ba7a-513ecc456e25","user_phone":""}}	2025-08-16 23:28:58.088155+00	
00000000-0000-0000-0000-000000000000	5fb5be51-e557-4613-bce8-0e110180431a	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"nextgendatalead@gmail.com","user_id":"1a2c02bc-3fd9-4bd1-89bf-8c32987b9cce","user_phone":""}}	2025-08-16 23:29:44.770003+00	
00000000-0000-0000-0000-000000000000	1f967507-a358-4f92-b798-f0c3eccb95a9	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"nextgendatalead@gmail.com","user_id":"1a2c02bc-3fd9-4bd1-89bf-8c32987b9cce","user_phone":""}}	2025-08-16 23:33:39.20407+00	
00000000-0000-0000-0000-000000000000	3531fa74-ccc4-4d05-b83d-00e46c78bdf7	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"nextgendatalead@gmail.com","user_id":"5464ef08-e30e-4adb-8536-a783d3c811b1","user_phone":""}}	2025-08-16 23:34:18.551878+00	
00000000-0000-0000-0000-000000000000	df6f135f-c143-4947-9aa0-9a4d1da43cf9	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"nextgendatalead@gmail.com","user_id":"5464ef08-e30e-4adb-8536-a783d3c811b1","user_phone":""}}	2025-08-16 23:37:12.687029+00	
00000000-0000-0000-0000-000000000000	8b8d11b7-1565-4534-89ec-bf2bf1498e7c	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"nextgendatalead@gmail.com","user_id":"e6dd13d9-08df-42ee-8825-c50838f2e3f9","user_phone":""}}	2025-08-16 23:38:00.500449+00	
00000000-0000-0000-0000-000000000000	5a63f6b9-96ad-4e50-bd39-d47003c226f7	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"nextgendatalead@gmail.com","user_id":"e6dd13d9-08df-42ee-8825-c50838f2e3f9","user_phone":""}}	2025-08-16 23:45:21.624616+00	
00000000-0000-0000-0000-000000000000	6e73ffdf-c695-4703-ad5e-89460f0dcfe9	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"imre.iddatasolutions@gmail.com","user_id":"b3d53067-1726-4122-bf5e-445e7e35cdb5","user_phone":""}}	2025-08-16 23:45:21.730768+00	
00000000-0000-0000-0000-000000000000	187d25ad-954d-4f2d-9c4e-09d245acd031	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"nextgendatalead@gmail.com","user_id":"a1f23fc3-4ffa-493f-a5e5-039e8a407e0f","user_phone":""}}	2025-08-16 23:45:53.180321+00	
00000000-0000-0000-0000-000000000000	923de592-8e45-4eba-83a4-9e676ebfd45c	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"nextgendatalead@gmail.com","user_id":"a1f23fc3-4ffa-493f-a5e5-039e8a407e0f","user_phone":""}}	2025-08-16 23:48:14.714836+00	
00000000-0000-0000-0000-000000000000	d6a23077-4134-4d8a-b7fc-31a2e49bb9be	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"nextgendatalead@gmail.com","user_id":"e94e07f2-565d-401e-bae8-e935d309350b","user_phone":""}}	2025-08-16 23:48:46.750667+00	
00000000-0000-0000-0000-000000000000	a215bb9b-8837-41ab-bda1-9810bc79ee22	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"nextgendatalead@gmail.com","user_id":"e94e07f2-565d-401e-bae8-e935d309350b","user_phone":""}}	2025-08-17 00:07:04.90208+00	
00000000-0000-0000-0000-000000000000	7da0235c-b627-4b3e-b8cc-d0ce775123eb	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"nextgendatalead@gmail.com","user_id":"b34c920c-0f66-4991-97a3-1ad8d5d66ded","user_phone":""}}	2025-08-17 00:07:07.846024+00	
00000000-0000-0000-0000-000000000000	9d9895ef-01be-4d25-80ff-5c76b8222b29	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"nextgendatalead@gmail.com","user_id":"b34c920c-0f66-4991-97a3-1ad8d5d66ded","user_phone":""}}	2025-08-17 00:10:51.864602+00	
00000000-0000-0000-0000-000000000000	bc686851-5b37-4d71-be85-41d7e47b9897	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"nextgendatalead@gmail.com","user_id":"b88e3bdb-2495-481e-84ef-1aabf9064eab","user_phone":""}}	2025-08-17 00:11:37.65238+00	
00000000-0000-0000-0000-000000000000	b55611d2-1974-4505-b9dd-3fd4b53ab43d	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"nextgendatalead@gmail.com","user_id":"b88e3bdb-2495-481e-84ef-1aabf9064eab","user_phone":""}}	2025-08-17 00:26:53.348888+00	
00000000-0000-0000-0000-000000000000	29bf9118-9895-4032-90b2-6f7d54491194	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"nextgendatalead@gmail.com","user_id":"bcce352d-a8df-4ee4-9b95-95e61b49f732","user_phone":""}}	2025-08-17 00:27:42.05008+00	
00000000-0000-0000-0000-000000000000	5be2a12b-0b19-4dd9-a9a1-108c877139f8	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"nextgendatalead@gmail.com","user_id":"bcce352d-a8df-4ee4-9b95-95e61b49f732","user_phone":""}}	2025-08-17 01:02:11.326204+00	
00000000-0000-0000-0000-000000000000	82e463af-4ef6-4a9a-93be-494c3f50cde8	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"nextgendatalead@gmail.com","user_id":"0eca2f6f-9362-4cec-98f3-7a7f903f386c","user_phone":""}}	2025-08-17 01:02:54.526372+00	
00000000-0000-0000-0000-000000000000	a7a3bc2f-1907-403d-830b-013d11b7bb13	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"nextgendatalead@gmail.com","user_id":"0eca2f6f-9362-4cec-98f3-7a7f903f386c","user_phone":""}}	2025-08-17 01:11:39.967366+00	
00000000-0000-0000-0000-000000000000	22fdf90d-9857-4431-9002-c1114f904043	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"nextgendatalead@gmail.com","user_id":"dacce7a3-d8f7-4907-9539-68a539b7c1ee","user_phone":""}}	2025-08-17 01:12:34.000381+00	
00000000-0000-0000-0000-000000000000	0317e196-a4c6-4758-8378-473ffd1dde43	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"nextgendatalead@gmail.com","user_id":"dacce7a3-d8f7-4907-9539-68a539b7c1ee","user_phone":""}}	2025-08-17 01:17:08.630292+00	
00000000-0000-0000-0000-000000000000	381b2b4e-aced-4466-aadd-e219834ace0b	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"nextgendatalead@gmail.com","user_id":"608b0c32-7bb0-4c03-bd3b-8b6006607a39","user_phone":""}}	2025-08-17 01:17:45.78949+00	
00000000-0000-0000-0000-000000000000	d24d80e2-8f38-47a7-83a2-dbe21357e75b	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"nextgendatalead@gmail.com","user_id":"608b0c32-7bb0-4c03-bd3b-8b6006607a39","user_phone":""}}	2025-08-17 01:21:32.055582+00	
00000000-0000-0000-0000-000000000000	53638cf3-757f-49d3-acdf-678988651545	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"nextgendatalead@gmail.com","user_id":"a17106d5-af80-43e9-8b2b-2e0a4ed0f715","user_phone":""}}	2025-08-17 01:22:09.319031+00	
00000000-0000-0000-0000-000000000000	c2c535ec-949f-4132-872e-72a9a5041cd4	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"nextgendatalead@gmail.com","user_id":"a17106d5-af80-43e9-8b2b-2e0a4ed0f715","user_phone":""}}	2025-08-17 01:24:41.620927+00	
00000000-0000-0000-0000-000000000000	302c74ca-f032-4bef-9e4d-298a6945f882	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"nextgendatalead@gmail.com","user_id":"8bb18bba-364a-4e81-a421-708390715ec6","user_phone":""}}	2025-08-17 01:25:24.262633+00	
00000000-0000-0000-0000-000000000000	67b47ae5-74a2-4aff-8be0-90e196cc5bc6	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"nextgendatalead@gmail.com","user_id":"8bb18bba-364a-4e81-a421-708390715ec6","user_phone":""}}	2025-08-17 01:33:38.968846+00	
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") FROM stdin;
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."instances" ("id", "uuid", "raw_base_config", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag") FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at", "secret", "phone", "last_challenged_at", "web_authn_credential", "web_authn_aaguid") FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_challenges" ("id", "factor_id", "created_at", "verified_at", "ip_address", "otp_code", "web_authn_session_data") FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_providers" ("id", "resource_id", "created_at", "updated_at", "disabled") FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_providers" ("id", "sso_provider_id", "entity_id", "metadata_xml", "metadata_url", "attribute_mapping", "created_at", "updated_at", "name_id_format") FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_relay_states" ("id", "sso_provider_id", "request_id", "for_email", "redirect_to", "created_at", "updated_at", "flow_state_id") FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_domains" ("id", "sso_provider_id", "domain", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."tenants" ("id", "name", "subdomain", "created_at", "updated_at", "settings", "subscription_status", "billing_email", "max_users", "max_storage_gb") FROM stdin;
8895945a-b288-4c61-ab31-1c25a1eee7b0	User's Organization	\N	2025-08-17 12:47:25.148819+00	2025-08-17 12:47:25.148819+00	{}	active	nextgendatalead@gmail.com	10	5
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."profiles" ("id", "tenant_id", "clerk_user_id", "email", "first_name", "last_name", "avatar_url", "role", "created_at", "updated_at", "last_sign_in_at", "is_active", "preferences", "username", "anonymized_at", "deletion_reason", "onboarding_complete") FROM stdin;
add877a5-bbe8-4649-8721-c329c0744632	8895945a-b288-4c61-ab31-1c25a1eee7b0	user_31Po01OVXdbEBt8MOXkcMX41VZM	nextgendatalead@gmail.com	Imd	ddd	https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdCIsImlpZCI6Imluc18zMGtHNENxNTZVQVVHUXVXdGlwOWZkc1FVSE4iLCJyaWQiOiJ1c2VyXzMxUG8wMU9WWGRiRUJ0OE1PWGtjTVg0MVZaTSJ9	owner	2025-08-17 12:47:25.222346+00	2025-08-17 12:48:23.503432+00	2025-08-17 12:47:49.839+00	t	{}	\N	\N	\N	t
\.


--
-- Data for Name: deletion_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."deletion_requests" ("id", "user_id", "requested_at", "scheduled_for", "completed_at", "status", "cancellation_token", "metadata") FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."organizations" ("id", "tenant_id", "clerk_org_id", "name", "slug", "description", "settings", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."documents" ("id", "tenant_id", "organization_id", "title", "content", "embedding", "metadata", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: gdpr_audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

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


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."notifications" ("id", "tenant_id", "user_id", "type", "title", "message", "data", "read_at", "created_at", "updated_at", "expires_at", "priority", "category") FROM stdin;
\.


--
-- Data for Name: notification_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."notification_events" ("id", "notification_id", "event_type", "created_at", "metadata") FROM stdin;
\.


--
-- Data for Name: organization_memberships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."organization_memberships" ("id", "organization_id", "user_id", "role", "invited_by", "joined_at") FROM stdin;
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."password_reset_tokens" ("id", "user_id", "token_hash", "expires_at", "created_at", "used", "used_at", "ip_address", "user_agent") FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id") FROM stdin;
avatars	avatars	\N	2025-08-02 14:45:32.662703+00	2025-08-02 14:45:32.662703+00	t	f	\N	\N	\N
documents	documents	\N	2025-08-02 14:45:32.662703+00	2025-08-02 14:45:32.662703+00	f	f	\N	\N	\N
exports	gdpr-exports	\N	2025-08-02 14:45:32.662703+00	2025-08-02 14:45:32.662703+00	f	f	\N	\N	\N
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads" ("id", "in_progress_size", "upload_signature", "bucket_id", "key", "version", "owner_id", "created_at", "user_metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads_parts" ("id", "upload_id", "size", "part_number", "bucket_id", "key", "etag", "owner_id", "version", "created_at") FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 3, true);


--
-- PostgreSQL database dump complete
--

RESET ALL;
