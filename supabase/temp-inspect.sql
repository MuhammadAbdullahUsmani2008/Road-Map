-- Inspect execution data counts
SELECT 'tasks_total' as metric, count(*)::text as value FROM tasks
UNION ALL
SELECT 'tasks_completed', count(*)::text FROM tasks WHERE status = 'completed'
UNION ALL
SELECT 'tasks_in_progress', count(*)::text FROM tasks WHERE status = 'in_progress'
UNION ALL
SELECT 'task_completions', count(*)::text FROM task_completions
UNION ALL
SELECT 'focus_sessions', count(*)::text FROM focus_sessions
UNION ALL
SELECT 'daily_reports', count(*)::text FROM daily_reports
UNION ALL
SELECT 'weekly_reviews', count(*)::text FROM weekly_reviews
UNION ALL
SELECT 'monthly_reviews', count(*)::text FROM monthly_reviews
UNION ALL
SELECT 'milestones_total', count(*)::text FROM milestones
UNION ALL
SELECT 'milestones_achieved', count(*)::text FROM milestones WHERE status = 'achieved'
UNION ALL
SELECT 'live_motivation_shown', count(*)::text FROM live_motivation_shown
UNION ALL
SELECT 'live_motivation_items', count(*)::text FROM live_motivation_items
UNION ALL
SELECT 'business_metrics', count(*)::text FROM business_metrics
UNION ALL
SELECT 'youtube_metrics', count(*)::text FROM youtube_metrics
UNION ALL
SELECT 'activity_logs', count(*)::text FROM activity_logs
UNION ALL
SELECT 'goals', count(*)::text FROM goals
UNION ALL
SELECT 'roadmap_years', count(*)::text FROM roadmap_years
UNION ALL
SELECT 'roadmap_phases', count(*)::text FROM roadmap_phases
UNION ALL
SELECT 'roadmap_months', count(*)::text FROM roadmap_months
UNION ALL
SELECT 'roadmap_weeks', count(*)::text FROM roadmap_weeks
UNION ALL
SELECT 'commitments', count(*)::text FROM commitments
UNION ALL
SELECT 'motivation_items', count(*)::text FROM motivation_items
UNION ALL
SELECT 'youtube_channels', count(*)::text FROM youtube_channels
UNION ALL
SELECT 'youtube_videos', count(*)::text FROM youtube_videos
UNION ALL
SELECT 'experiments', count(*)::text FROM experiments
UNION ALL
SELECT 'decision_notes', count(*)::text FROM decision_notes
UNION ALL
SELECT 'knowledge_items', count(*)::text FROM knowledge_items
UNION ALL
SELECT 'user_devices', count(*)::text FROM user_devices;
