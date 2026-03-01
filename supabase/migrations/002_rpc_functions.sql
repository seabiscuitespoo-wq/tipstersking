-- ============================================================
-- TipstersKing RPC Functions
-- Run after 001_marketplace_schema.sql
-- ============================================================

-- Increment tipster's total tip count
CREATE OR REPLACE FUNCTION increment_tip_count(p_profile_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE tipster_profiles 
  SET tip_count_total = tip_count_total + 1
  WHERE profile_id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get leaderboard data (90-day rolling ROI)
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_limit INTEGER DEFAULT 50,
  p_min_tips INTEGER DEFAULT 50
)
RETURNS TABLE (
  profile_id UUID,
  alias VARCHAR(50),
  roi_pct NUMERIC,
  win_rate NUMERIC,
  tip_count BIGINT,
  approved_at TIMESTAMPTZ
) AS $$
DECLARE
  v_from_date TIMESTAMPTZ := NOW() - INTERVAL '90 days';
BEGIN
  RETURN QUERY
  SELECT 
    tp.profile_id,
    tp.alias,
    ROUND(
      (SUM(CASE WHEN t.status = 'won' THEN t.odds - 1 ELSE -1 END) / COUNT(*)::NUMERIC) * 100,
      2
    ) as roi_pct,
    ROUND(
      (COUNT(*) FILTER (WHERE t.status = 'won')::NUMERIC / COUNT(*)) * 100,
      2
    ) as win_rate,
    COUNT(*) as tip_count,
    tp.approved_at
  FROM tipster_profiles tp
  JOIN profiles p ON p.id = tp.profile_id
  JOIN tips t ON t.profile_id = tp.profile_id
  WHERE p.role = 'tipster'
    AND tp.active = true
    AND tp.application_status = 'approved'
    AND t.status IN ('won', 'lost')
    AND t.tip_timestamp >= v_from_date
  GROUP BY tp.profile_id, tp.alias, tp.approved_at
  HAVING COUNT(*) >= p_min_tips
  ORDER BY roi_pct DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get monthly standings (for current month commission preview)
CREATE OR REPLACE FUNCTION get_monthly_standings(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  profile_id UUID,
  alias VARCHAR(50),
  roi_pct NUMERIC,
  tip_count BIGINT,
  rank BIGINT
) AS $$
DECLARE
  v_from_date TIMESTAMPTZ := make_date(p_year, p_month, 1);
  v_to_date TIMESTAMPTZ := (make_date(p_year, p_month, 1) + INTERVAL '1 month' - INTERVAL '1 second');
BEGIN
  RETURN QUERY
  SELECT 
    tp.profile_id,
    tp.alias,
    ROUND(
      (SUM(CASE WHEN t.status = 'won' THEN t.odds - 1 ELSE -1 END) / COUNT(*)::NUMERIC) * 100,
      2
    ) as roi_pct,
    COUNT(*) as tip_count,
    ROW_NUMBER() OVER (ORDER BY 
      SUM(CASE WHEN t.status = 'won' THEN t.odds - 1 ELSE -1 END) / COUNT(*)::NUMERIC DESC
    ) as rank
  FROM tipster_profiles tp
  JOIN profiles p ON p.id = tp.profile_id
  JOIN tips t ON t.profile_id = tp.profile_id
  WHERE p.role = 'tipster'
    AND tp.active = true
    AND tp.application_status = 'approved'
    AND t.status IN ('won', 'lost')
    AND t.tip_timestamp >= v_from_date
    AND t.tip_timestamp <= v_to_date
  GROUP BY tp.profile_id, tp.alias
  HAVING COUNT(*) >= 30
    AND SUM(CASE WHEN t.status = 'won' THEN t.odds - 1 ELSE -1 END) > 0
  ORDER BY roi_pct DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(p_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE profile_id = p_profile_id
      AND status IN ('active', 'trialing')
      AND current_period_end > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get tipster stats for profile
CREATE OR REPLACE FUNCTION get_tipster_stats(
  p_profile_id UUID,
  p_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  roi_pct NUMERIC,
  win_rate NUMERIC,
  tip_count BIGINT,
  profit_units NUMERIC,
  longest_win_streak INTEGER,
  longest_loss_streak INTEGER
) AS $$
DECLARE
  v_from_date TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  WITH settled_tips AS (
    SELECT 
      t.status,
      t.odds,
      t.tip_timestamp,
      CASE WHEN t.status = 'won' THEN t.odds - 1 ELSE -1 END as profit
    FROM tips t
    WHERE t.profile_id = p_profile_id
      AND t.status IN ('won', 'lost')
      AND t.tip_timestamp >= v_from_date
    ORDER BY t.tip_timestamp
  ),
  streaks AS (
    SELECT
      status,
      COUNT(*) as streak_length
    FROM (
      SELECT 
        status,
        SUM(CASE WHEN status != LAG(status) OVER (ORDER BY tip_timestamp) THEN 1 ELSE 0 END) OVER (ORDER BY tip_timestamp) as grp
      FROM settled_tips
    ) s
    GROUP BY status, grp
  )
  SELECT
    ROUND((SUM(st.profit) / COUNT(*)::NUMERIC) * 100, 2),
    ROUND((COUNT(*) FILTER (WHERE st.status = 'won')::NUMERIC / COUNT(*)) * 100, 2),
    COUNT(*),
    ROUND(SUM(st.profit), 2),
    COALESCE((SELECT MAX(streak_length)::INTEGER FROM streaks WHERE status = 'won'), 0),
    COALESCE((SELECT MAX(streak_length)::INTEGER FROM streaks WHERE status = 'lost'), 0)
  FROM settled_tips st;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
