-- =====================================================
-- WELLNESS PORTAL DATABASE SCHEMA
-- Corporate Wellness & Wellbeing Portal
-- =====================================================

-- 1. Corporate Wellness Configuration (Which modules are enabled per corporate)
CREATE TABLE IF NOT EXISTS corporate_wellness_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    
    -- Module toggles
    wellness_enabled BOOLEAN DEFAULT false,
    health_risk_assessment_enabled BOOLEAN DEFAULT false,
    mental_wellbeing_enabled BOOLEAN DEFAULT false,
    ai_wellness_coach_enabled BOOLEAN DEFAULT false,
    personalized_plans_enabled BOOLEAN DEFAULT false,
    knowledge_hub_enabled BOOLEAN DEFAULT false,
    preventive_care_enabled BOOLEAN DEFAULT false,
    financial_wellbeing_enabled BOOLEAN DEFAULT false,
    habit_tracking_enabled BOOLEAN DEFAULT false,
    journaling_enabled BOOLEAN DEFAULT false,
    
    -- AI Configuration
    ai_provider VARCHAR(50) DEFAULT 'openai', -- openai, claude, gemini
    ai_enabled BOOLEAN DEFAULT true,
    ai_guardrails_strict BOOLEAN DEFAULT true,
    
    -- Consent settings
    require_consent BOOLEAN DEFAULT true,
    consent_text TEXT,
    
    -- Privacy settings
    anonymize_hr_reports BOOLEAN DEFAULT true,
    data_retention_days INTEGER DEFAULT 365,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    UNIQUE(tenant_id)
);

-- 2. User Wellness Consent
CREATE TABLE IF NOT EXISTS wellness_user_consent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    
    consent_given BOOLEAN DEFAULT false,
    consent_date TIMESTAMP WITH TIME ZONE,
    consent_version VARCHAR(20),
    ip_address VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, employee_id)
);

-- 3. Health Risk Assessment (HRA) Questions
CREATE TABLE IF NOT EXISTS hra_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE, -- NULL for global
    
    category VARCHAR(100) NOT NULL, -- general_health, lifestyle, medical_history, etc.
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- single_choice, multi_choice, scale, text, number
    options JSONB, -- For choice questions
    weight DECIMAL(5,2) DEFAULT 1.0, -- Scoring weight
    risk_mappings JSONB, -- Maps answers to risk scores
    order_index INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. HRA Responses
CREATE TABLE IF NOT EXISTS hra_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    
    assessment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responses JSONB NOT NULL, -- {question_id: answer}
    
    -- Calculated scores (rule-based)
    total_score DECIMAL(5,2),
    risk_level VARCHAR(20), -- low, moderate, high, critical
    category_scores JSONB, -- {category: score}
    
    -- AI-generated insights (optional)
    ai_summary TEXT,
    ai_focus_areas JSONB,
    ai_suggestions JSONB,
    ai_processed BOOLEAN DEFAULT false,
    ai_processed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Mental Wellbeing Surveys
CREATE TABLE IF NOT EXISTS mental_wellbeing_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    
    survey_type VARCHAR(50) NOT NULL, -- stress, burnout, mood, anxiety
    name VARCHAR(200) NOT NULL,
    description TEXT,
    questions JSONB NOT NULL,
    scoring_logic JSONB, -- How to calculate scores
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Mental Wellbeing Responses
CREATE TABLE IF NOT EXISTS mental_wellbeing_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    survey_id UUID REFERENCES mental_wellbeing_surveys(id),
    
    response_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responses JSONB NOT NULL,
    
    -- Calculated
    score DECIMAL(5,2),
    level VARCHAR(20), -- good, moderate, concerning, critical
    
    -- AI insights
    ai_patterns JSONB,
    ai_coping_strategies JSONB,
    ai_processed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. AI Wellness Coach Conversations
CREATE TABLE IF NOT EXISTS wellness_coach_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    
    session_id UUID NOT NULL, -- Groups messages in a session
    
    message_type VARCHAR(20) NOT NULL, -- user, assistant
    message_content TEXT NOT NULL,
    
    -- Context
    user_context JSONB, -- Goals, preferences at time of message
    
    -- AI metadata
    ai_model_used VARCHAR(100),
    ai_tokens_used INTEGER,
    guardrail_triggered BOOLEAN DEFAULT false,
    guardrail_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Personalized Wellness Plans
CREATE TABLE IF NOT EXISTS wellness_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    
    plan_name VARCHAR(200) NOT NULL,
    plan_type VARCHAR(50), -- 30_day, 60_day, 90_day, custom
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- active, paused, completed, abandoned
    
    -- Goals
    goals JSONB NOT NULL, -- [{id, description, target, current, unit}]
    
    -- Schedule
    daily_tasks JSONB, -- [{day, tasks: [{id, description, completed}]}]
    weekly_milestones JSONB,
    
    -- AI personalization
    ai_personalized BOOLEAN DEFAULT false,
    ai_adjustments JSONB,
    
    -- Progress
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Knowledge Hub Articles
CREATE TABLE IF NOT EXISTS wellness_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE, -- NULL for global
    
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500),
    summary TEXT,
    content TEXT NOT NULL,
    
    category VARCHAR(100), -- nutrition, exercise, mental_health, sleep, etc.
    tags JSONB,
    
    author VARCHAR(200),
    source_url TEXT,
    image_url TEXT,
    
    -- AI enhancements
    ai_summary TEXT,
    ai_simplified_content TEXT,
    ai_processed BOOLEAN DEFAULT false,
    
    read_time_minutes INTEGER,
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Article Read Tracking
CREATE TABLE IF NOT EXISTS article_read_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    article_id UUID NOT NULL REFERENCES wellness_articles(id) ON DELETE CASCADE,
    
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_percentage DECIMAL(5,2) DEFAULT 0,
    time_spent_seconds INTEGER,
    
    UNIQUE(tenant_id, employee_id, article_id)
);

-- 11. Preventive Care Reminders
CREATE TABLE IF NOT EXISTS preventive_care_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Targeting
    age_min INTEGER,
    age_max INTEGER,
    gender VARCHAR(20), -- male, female, all
    job_levels JSONB, -- Specific job levels
    countries JSONB, -- Country-specific
    
    -- Reminder details
    reminder_type VARCHAR(100), -- annual_checkup, vaccination, screening
    frequency_months INTEGER,
    seasonal BOOLEAN DEFAULT false,
    season_months JSONB, -- [1,2,3] for Jan-Feb-Mar
    
    message_template TEXT,
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Preventive Care Reminders Sent
CREATE TABLE IF NOT EXISTS preventive_care_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    rule_id UUID REFERENCES preventive_care_rules(id),
    
    reminder_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message TEXT,
    
    -- AI contextual nudge
    ai_nudge TEXT,
    
    status VARCHAR(20) DEFAULT 'sent', -- sent, acknowledged, completed
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Financial Wellbeing Modules
CREATE TABLE IF NOT EXISTS financial_wellbeing_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    
    module_type VARCHAR(100), -- budget_calculator, savings_planner, insurance_literacy
    name VARCHAR(200) NOT NULL,
    description TEXT,
    content JSONB, -- Module content/steps
    
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Financial Module Completion
CREATE TABLE IF NOT EXISTS financial_module_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    module_id UUID NOT NULL REFERENCES financial_wellbeing_modules(id) ON DELETE CASCADE,
    
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- User inputs/calculations
    user_data JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, employee_id, module_id)
);

-- 15. Habit Definitions
CREATE TABLE IF NOT EXISTS habit_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- exercise, nutrition, sleep, mindfulness
    icon VARCHAR(50),
    
    -- Tracking config
    tracking_type VARCHAR(50), -- boolean, count, duration
    unit VARCHAR(50), -- times, minutes, steps
    default_goal DECIMAL(10,2),
    
    is_system BOOLEAN DEFAULT false, -- System-defined vs custom
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. User Habits
CREATE TABLE IF NOT EXISTS user_habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    habit_id UUID REFERENCES habit_definitions(id),
    
    -- Custom habit (if habit_id is null)
    custom_name VARCHAR(200),
    custom_category VARCHAR(100),
    
    goal DECIMAL(10,2),
    frequency VARCHAR(20) DEFAULT 'daily', -- daily, weekly
    
    start_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Habit Logs
CREATE TABLE IF NOT EXISTS habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    user_habit_id UUID NOT NULL REFERENCES user_habits(id) ON DELETE CASCADE,
    
    log_date DATE NOT NULL,
    value DECIMAL(10,2), -- Count/duration/boolean as 1/0
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_habit_id, log_date)
);

-- 18. Wellness Challenges
CREATE TABLE IF NOT EXISTS wellness_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Challenge rules
    challenge_type VARCHAR(50), -- individual, team, company_wide
    target_metric VARCHAR(100),
    target_value DECIMAL(10,2),
    
    -- Rewards
    rewards JSONB,
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. Challenge Participation
CREATE TABLE IF NOT EXISTS challenge_participation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES wellness_challenges(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    team_id UUID, -- For team challenges
    
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_progress DECIMAL(10,2) DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(challenge_id, employee_id)
);

-- 20. Private Journal Entries (Encrypted)
CREATE TABLE IF NOT EXISTS wellness_journal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    
    entry_date DATE DEFAULT CURRENT_DATE,
    
    -- Encrypted content
    encrypted_content TEXT NOT NULL, -- AES-256 encrypted
    encryption_iv TEXT NOT NULL,
    
    -- Mood tracking (not encrypted)
    mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 10),
    mood_tags JSONB,
    
    -- AI sentiment (optional, processed on-device or with consent)
    ai_sentiment VARCHAR(50),
    ai_mood_trend JSONB,
    ai_feedback TEXT,
    ai_processed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. AI Audit Logs (Mandatory)
CREATE TABLE IF NOT EXISTS ai_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE SET NULL,
    employee_id UUID,
    
    module_name VARCHAR(100) NOT NULL, -- hra, mental_wellbeing, coach, plans, etc.
    action_type VARCHAR(100) NOT NULL, -- analyze, generate, validate, summarize
    
    -- Request details
    request_prompt TEXT, -- Sanitized, no PII
    request_context JSONB,
    
    -- Response details
    response_summary TEXT,
    response_tokens INTEGER,
    response_time_ms INTEGER,
    
    -- Audit flags
    ai_invoked BOOLEAN DEFAULT true,
    ai_warnings JSONB,
    ai_ignored BOOLEAN DEFAULT false,
    user_override_reason TEXT,
    
    -- Model info
    ai_provider VARCHAR(50),
    ai_model VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 22. Aggregate Analytics (HR Dashboard - Anonymized)
CREATE TABLE IF NOT EXISTS wellness_analytics_aggregate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20), -- daily, weekly, monthly
    
    -- Participation metrics
    total_employees INTEGER,
    wellness_participants INTEGER,
    hra_completions INTEGER,
    mental_survey_completions INTEGER,
    coach_sessions INTEGER,
    articles_read INTEGER,
    habits_logged INTEGER,
    challenges_joined INTEGER,
    
    -- Aggregate scores (anonymized)
    avg_hra_score DECIMAL(5,2),
    avg_mental_score DECIMAL(5,2),
    avg_habit_completion_rate DECIMAL(5,2),
    
    -- Department breakdowns (only if > 10 employees)
    department_metrics JSONB,
    
    -- AI insights
    ai_risk_clusters JSONB,
    ai_program_insights TEXT,
    ai_recommendations JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, period_start, period_end, period_type)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_wellness_config_tenant ON corporate_wellness_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hra_responses_tenant_employee ON hra_responses(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_mental_responses_tenant_employee ON mental_wellbeing_responses(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_coach_conversations_session ON wellness_coach_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_wellness_plans_tenant_employee ON wellness_plans(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_journal_tenant_employee ON wellness_journal(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_tenant ON ai_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_created ON ai_audit_logs(created_at);

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default HRA questions
INSERT INTO hra_questions (category, question_text, question_type, options, weight, risk_mappings, order_index) VALUES
('general_health', 'How would you rate your overall health?', 'single_choice', 
 '["Excellent", "Very Good", "Good", "Fair", "Poor"]', 
 2.0, '{"Excellent": 0, "Very Good": 1, "Good": 2, "Fair": 4, "Poor": 6}', 1),
 
('lifestyle', 'How many hours of sleep do you typically get per night?', 'single_choice',
 '["Less than 5", "5-6 hours", "7-8 hours", "More than 8"]',
 1.5, '{"Less than 5": 5, "5-6 hours": 3, "7-8 hours": 0, "More than 8": 1}', 2),
 
('lifestyle', 'How many days per week do you exercise for at least 30 minutes?', 'single_choice',
 '["0 days", "1-2 days", "3-4 days", "5+ days"]',
 1.5, '{"0 days": 5, "1-2 days": 3, "3-4 days": 1, "5+ days": 0}', 3),
 
('lifestyle', 'How would you describe your stress level?', 'single_choice',
 '["Very Low", "Low", "Moderate", "High", "Very High"]',
 2.0, '{"Very Low": 0, "Low": 1, "Moderate": 2, "High": 4, "Very High": 6}', 4),
 
('nutrition', 'How many servings of fruits and vegetables do you eat daily?', 'single_choice',
 '["0-1", "2-3", "4-5", "6+"]',
 1.0, '{"0-1": 4, "2-3": 2, "4-5": 0, "6+": 0}', 5),
 
('lifestyle', 'Do you smoke or use tobacco products?', 'single_choice',
 '["Never", "Former smoker (quit >1 year)", "Occasionally", "Daily"]',
 2.5, '{"Never": 0, "Former smoker (quit >1 year)": 1, "Occasionally": 4, "Daily": 8}', 6),
 
('lifestyle', 'How many alcoholic drinks do you have per week?', 'single_choice',
 '["None", "1-7", "8-14", "15+"]',
 1.5, '{"None": 0, "1-7": 1, "8-14": 3, "15+": 5}', 7),
 
('medical_history', 'Do you have any chronic conditions? (Select all that apply)', 'multi_choice',
 '["None", "Diabetes", "Hypertension", "Heart Disease", "Asthma/COPD", "Arthritis", "Other"]',
 2.0, '{"None": 0, "Diabetes": 3, "Hypertension": 3, "Heart Disease": 4, "Asthma/COPD": 2, "Arthritis": 1, "Other": 1}', 8),
 
('mental_health', 'In the past 2 weeks, how often have you felt down or hopeless?', 'single_choice',
 '["Not at all", "Several days", "More than half the days", "Nearly every day"]',
 2.0, '{"Not at all": 0, "Several days": 2, "More than half the days": 4, "Nearly every day": 6}', 9),
 
('preventive', 'When was your last general health checkup?', 'single_choice',
 '["Within past year", "1-2 years ago", "3-5 years ago", "More than 5 years", "Never"]',
 1.0, '{"Within past year": 0, "1-2 years ago": 1, "3-5 years ago": 3, "More than 5 years": 4, "Never": 5}', 10)
ON CONFLICT DO NOTHING;

-- Insert default mental wellbeing survey (PHQ-2 inspired)
INSERT INTO mental_wellbeing_surveys (survey_type, name, description, questions, scoring_logic) VALUES
('mood', 'Daily Mood Check', 'Quick daily mood assessment', 
 '[{"id": 1, "text": "How are you feeling today?", "type": "scale", "min": 1, "max": 10},
   {"id": 2, "text": "What best describes your energy level?", "type": "single_choice", "options": ["Very Low", "Low", "Moderate", "High", "Very High"]}]',
 '{"method": "average", "thresholds": {"good": 7, "moderate": 5, "concerning": 3}}'),
 
('stress', 'Stress Assessment', 'Weekly stress level check',
 '[{"id": 1, "text": "How stressed have you felt this week?", "type": "scale", "min": 1, "max": 10},
   {"id": 2, "text": "How well did you sleep this week?", "type": "scale", "min": 1, "max": 10},
   {"id": 3, "text": "How manageable was your workload?", "type": "scale", "min": 1, "max": 10}]',
 '{"method": "weighted_average", "weights": [0.4, 0.3, 0.3], "thresholds": {"good": 7, "moderate": 5, "concerning": 3}}'),
 
('burnout', 'Burnout Risk Screen', 'Monthly burnout assessment',
 '[{"id": 1, "text": "I feel emotionally drained from my work", "type": "frequency", "options": ["Never", "Rarely", "Sometimes", "Often", "Always"]},
   {"id": 2, "text": "I feel used up at the end of the workday", "type": "frequency", "options": ["Never", "Rarely", "Sometimes", "Often", "Always"]},
   {"id": 3, "text": "I feel I am positively influencing others through my work", "type": "frequency", "options": ["Never", "Rarely", "Sometimes", "Often", "Always"]}]',
 '{"method": "burnout_scale", "reverse_questions": [3], "thresholds": {"good": 20, "moderate": 40, "concerning": 60}}')
ON CONFLICT DO NOTHING;

-- Insert default habit definitions
INSERT INTO habit_definitions (name, description, category, icon, tracking_type, unit, default_goal, is_system) VALUES
('Drink Water', 'Track your daily water intake', 'nutrition', '💧', 'count', 'glasses', 8, true),
('Exercise', 'Log your workout sessions', 'exercise', '🏃', 'duration', 'minutes', 30, true),
('Meditation', 'Practice mindfulness meditation', 'mindfulness', '🧘', 'duration', 'minutes', 10, true),
('Sleep', 'Track your sleep duration', 'sleep', '😴', 'duration', 'hours', 8, true),
('Steps', 'Daily step count', 'exercise', '👟', 'count', 'steps', 10000, true),
('Read', 'Reading for personal growth', 'mindfulness', '📚', 'duration', 'minutes', 20, true),
('Gratitude', 'Write down things you are grateful for', 'mindfulness', '🙏', 'count', 'items', 3, true),
('Healthy Meal', 'Eat a nutritious meal', 'nutrition', '🥗', 'count', 'meals', 3, true)
ON CONFLICT DO NOTHING;

-- Insert default preventive care rules
INSERT INTO preventive_care_rules (name, description, reminder_type, frequency_months, message_template) VALUES
('Annual Health Checkup', 'Yearly comprehensive health examination', 'annual_checkup', 12, 
 'It''s time for your annual health checkup! Regular checkups help detect potential health issues early.'),
('Flu Vaccination', 'Annual flu shot recommendation', 'vaccination', 12,
 'Flu season is approaching. Consider getting your annual flu vaccination to protect yourself and others.'),
('Dental Checkup', 'Regular dental examination', 'dental', 6,
 'Time for your dental checkup! Regular dental visits help maintain oral health and prevent issues.'),
('Eye Examination', 'Regular vision screening', 'screening', 24,
 'When did you last have your eyes checked? Regular eye exams are important for maintaining good vision.')
ON CONFLICT DO NOTHING;

-- Insert default financial wellbeing modules
INSERT INTO financial_wellbeing_modules (module_type, name, description, content, order_index) VALUES
('budget_calculator', 'Monthly Budget Planner', 'Create and manage your monthly budget',
 '{"steps": ["income", "fixed_expenses", "variable_expenses", "savings", "review"]}', 1),
('savings_planner', 'Emergency Fund Calculator', 'Plan your emergency savings fund',
 '{"steps": ["monthly_expenses", "target_months", "current_savings", "plan"]}', 2),
('insurance_literacy', 'Understanding Your Health Insurance', 'Learn about your health insurance benefits',
 '{"topics": ["coverage_basics", "copay_deductible", "network", "claims_process", "faq"]}', 3),
('retirement_basics', 'Retirement Planning Basics', 'Introduction to retirement planning concepts',
 '{"topics": ["compound_interest", "employer_matching", "investment_types", "timeline"]}', 4)
ON CONFLICT DO NOTHING;

-- =====================================================
-- SAMPLE WELLNESS ARTICLES
-- =====================================================

INSERT INTO wellness_articles (title, slug, summary, content, category, tags, read_time_minutes, is_featured) VALUES
('10 Simple Habits for Better Sleep', 'better-sleep-habits', 
 'Discover practical tips to improve your sleep quality and wake up refreshed.',
 'Getting quality sleep is essential for your physical and mental health. Here are 10 evidence-based habits that can help you sleep better...\n\n1. Stick to a consistent sleep schedule\n2. Create a relaxing bedtime routine\n3. Optimize your sleep environment\n4. Limit screen time before bed\n5. Watch your caffeine intake\n6. Exercise regularly (but not too close to bedtime)\n7. Manage stress and anxiety\n8. Be mindful of what you eat and drink\n9. Limit daytime naps\n10. Consider your mattress and pillows',
 'sleep', '["sleep", "habits", "wellness", "health"]', 5, true),
 
('Managing Workplace Stress: A Practical Guide', 'managing-workplace-stress',
 'Learn effective strategies to cope with work-related stress and maintain wellbeing.',
 'Workplace stress is a common challenge that affects millions of people. Understanding how to manage it effectively is crucial for your health and productivity...\n\n## Recognizing Signs of Stress\n- Difficulty concentrating\n- Irritability\n- Physical symptoms like headaches\n- Sleep problems\n\n## Effective Coping Strategies\n1. Take regular breaks\n2. Practice deep breathing\n3. Set realistic goals\n4. Learn to say no\n5. Seek support when needed',
 'mental_health', '["stress", "workplace", "mental health", "productivity"]', 7, true),
 
('Nutrition Basics: Building a Healthy Plate', 'nutrition-basics-healthy-plate',
 'Understanding the fundamentals of balanced nutrition for optimal health.',
 'Good nutrition is the foundation of good health. This guide will help you understand how to build balanced meals that nourish your body...\n\n## The Healthy Plate Model\n- Half your plate: vegetables and fruits\n- Quarter: lean proteins\n- Quarter: whole grains\n- Add healthy fats in moderation\n\n## Key Nutrients to Focus On\n1. Protein for muscle and tissue repair\n2. Fiber for digestive health\n3. Vitamins and minerals for various body functions\n4. Healthy fats for brain health',
 'nutrition', '["nutrition", "diet", "healthy eating", "food"]', 6, false),
 
('The Power of Mindfulness: Getting Started', 'mindfulness-getting-started',
 'An introduction to mindfulness meditation and its benefits for mental health.',
 'Mindfulness is the practice of being fully present and engaged in the current moment. Research shows it can reduce stress, improve focus, and enhance overall wellbeing...\n\n## What is Mindfulness?\nMindfulness involves paying attention to the present moment without judgment. It can be practiced through formal meditation or informal daily activities.\n\n## Simple Mindfulness Exercises\n1. Mindful breathing (5 minutes)\n2. Body scan meditation\n3. Mindful eating\n4. Walking meditation\n\n## Getting Started\nStart with just 5 minutes a day and gradually increase.',
 'mindfulness', '["mindfulness", "meditation", "mental health", "stress relief"]', 8, true)
ON CONFLICT DO NOTHING;
