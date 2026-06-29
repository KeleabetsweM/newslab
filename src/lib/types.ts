export interface Journalist {
  id: string;
  name: string;
  website: string;
  sections: string[];
  role: string;
  tone: string;
  personality: string;
  avatar: string;
  created_at: string;
  is_active?: boolean;
  rules?: string[];
}

export type ArticleStatus =
  | 'idea'
  | 'researching'
  | 'drafted'
  | 'image_pending'
  | 'image_review'
  | 'fact_checking'
  | 'bias_review'
  | 'awaiting_admin_review'
  | 'revision_requested'
  | 'approved_sandbox'
  | 'rejected';

export interface Source {
  name: string;
  url: string;
  status: 'verified' | 'unverified' | 'weak';
  notes: string;
}

export interface ArticleArtifacts {
  story_idea?: string;
  research_notes?: string;
  source_list?: Source[];
  article_outline?: string;
  draft_article?: string;
  edited_article?: string;
  fact_check_report?: string;
  bias_check_report?: string;
  image_brief?: string;
  image_prompt?: string;
  generated_image?: string; // Base64 or URL
  image_quality_review?: string;
  admin_feedback?: string;
  final_approved_sandbox_version?: string;
}

export interface Article {
  id: string;
  journalist_id: string;
  title: string;
  topic: string;
  status: ArticleStatus;
  created_at: string;
  updated_at: string;
  featured_image?: string;
  artifacts: ArticleArtifacts;
}

export interface ImageJob {
  id: string;
  article_id: string;
  prompt: string;
  status: 'pending' | 'completed' | 'failed';
  image_url?: string;
  error?: string;
  created_at: string;
}

export interface ImageReview {
  id: string;
  article_id: string;
  rating: number; // 1 to 5
  passed: boolean;
  comments: string;
  created_at: string;
}

export type MemoryType =
  | 'style_lesson'
  | 'source_lesson'
  | 'editorial_preference'
  | 'image_preference'
  | 'headline_preference'
  | 'rejected_pattern'
  | 'approved_pattern'
  | 'topic_context';

export interface JournalistMemory {
  id: string;
  journalist_id: string;
  memory_type: MemoryType;
  memory_content: string;
  source_article_id: string | null;
  confidence_score: number;
  status: 'candidate' | 'approved' | 'rejected';
  created_at: string;
  last_used_at: string | null;
}

export interface TelegramApproval {
  id: string;
  article_id: string;
  message_id: string;
  status: 'pending' | 'approved_sandbox' | 'revision_requested' | 'regenerated_image' | 'rejected';
  sent_at: string;
  updated_at: string;
}

export interface AgentLog {
  id: string;
  timestamp: string;
  journalist_id: string;
  article_id: string | null;
  action_type: string;
  message: string;
  payload?: any;
}

export interface DBState {
  journalists: Journalist[];
  articles: Article[];
  journalist_memory: JournalistMemory[];
  agent_logs: AgentLog[];
  telegram_config: {
    bot_token: string;
    chat_id: string;
    is_active: boolean;
  };
}

export interface JournalistSchedule {
  id: string;
  journalist_id: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'manual';
  days_of_week: number[];
  preferred_hour_utc: number;
  timezone: string;
  weekly_quota: number;
  max_pending_reviews: number;
  auto_advance: boolean;
  stop_status: string;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentJob {
  id: string;
  job_type: 'create_article' | 'run_pipeline_step';
  journalist_id: string;
  article_id: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  attempts: number;
  priority: number;
  error: string | null;
  locked_at: string | null;
  scheduled_for: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id: string;
  run_type: 'scheduler' | 'manual';
  status: 'running' | 'completed' | 'failed';
  jobs_created: number;
  jobs_processed: number;
  error: string | null;
  notes: string | null;
  started_at: string;
  finished_at: string | null;
}

