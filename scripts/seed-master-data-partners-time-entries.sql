-- Seeding script: Add three random time entries for Master Data Partners
-- Generated with Claude Code (https://claude.ai/code)

-- Insert three random time entries for Master Data Partners
INSERT INTO public.time_entries (
    id,
    tenant_id,
    created_by,
    client_id,
    project_name,
    description,
    entry_date,
    hours,
    hourly_rate,
    billable,
    invoiced
)
VALUES 
    -- Entry 1: Data Migration Project
    (
        gen_random_uuid(),
        '5746b0cf-3879-4504-b349-4ea63f9ae0f0', -- tenant_id
        'dd8fed18-c9ec-419d-8100-3c2685fa7549', -- created_by (current user)
        '0323c68a-461c-49e5-a882-1b68dc51d4eb', -- client_id (Master Data Partners)
        'Data Migration Project',
        'Database migration',
        CURRENT_DATE - INTERVAL '5 days',
        6.5,
        85.00,
        true,
        false
    ),
    -- Entry 2: Analytics Dashboard Development
    (
        gen_random_uuid(),
        '5746b0cf-3879-4504-b349-4ea63f9ae0f0',
        'dd8fed18-c9ec-419d-8100-3c2685fa7549',
        '0323c68a-461c-49e5-a882-1b68dc51d4eb',
        'Analytics Dashboard',
        'Dashboard development',
        CURRENT_DATE - INTERVAL '3 days',
        4.0,
        95.00,
        true,
        false
    ),
    -- Entry 3: Data Quality Audit
    (
        gen_random_uuid(),
        '5746b0cf-3879-4504-b349-4ea63f9ae0f0',
        'dd8fed18-c9ec-419d-8100-3c2685fa7549',
        '0323c68a-461c-49e5-a882-1b68dc51d4eb',
        'Data Quality Audit',
        'Quality audit',
        CURRENT_DATE - INTERVAL '1 day',
        8.0,
        90.00,
        true,
        false
    );

-- Display results
SELECT 
    'Time entries created successfully for Master Data Partners!' as message,
    c.name as contact_name,
    c.company_name,
    COUNT(te.id) as total_entries,
    SUM(te.hours) as total_hours,
    SUM(te.hours * te.hourly_rate) as total_value
FROM public.clients c
LEFT JOIN public.time_entries te ON c.id = te.client_id
WHERE c.company_name = 'Master Data Partners'
GROUP BY c.id, c.name, c.company_name;