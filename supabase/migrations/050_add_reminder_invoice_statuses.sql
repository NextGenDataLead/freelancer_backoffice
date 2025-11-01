-- Add new invoice statuses for reminder tracking
-- Migration: 050_add_reminder_invoice_statuses.sql

-- Add new status values to invoice_status enum
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'overdue_reminder_1';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'overdue_reminder_2';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'overdue_reminder_3';

-- Note: These statuses track how many payment reminders have been sent
-- overdue: Invoice is overdue, no reminders sent yet
-- overdue_reminder_1: Invoice is overdue, 1 reminder sent
-- overdue_reminder_2: Invoice is overdue, 2 reminders sent
-- overdue_reminder_3: Invoice is overdue, 3 reminders sent (final notice)
