-- Migration: 038 - Clear Existing Data
-- Removes all existing data from tables in dependency order

SET session_replication_role = replica;
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
-- FIX: Set proper search path for Supabase migrations
SET search_path = public, auth, extensions;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- ====================
-- CLEAR EXISTING DATA (only tables that exist)
-- ====================

-- Clear tables in dependency order with explicit schema qualification
DELETE FROM public.notification_events;
DELETE FROM public.time_entries;
DELETE FROM public.invoices;
DELETE FROM public.expenses;
DELETE FROM public.notifications;
DELETE FROM public.projects;
DELETE FROM public.clients;
DELETE FROM public.profiles;
DELETE FROM public.tenant_platform_subscriptions;
DELETE FROM public.subscription_usage;
DELETE FROM public.platform_subscription_payments;
DELETE FROM public.platform_subscription_plans;
DELETE FROM public.tenants;

SET row_security = on;