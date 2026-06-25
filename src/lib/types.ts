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

export type Journalist = {
  id: string;
  name: string;
  website: string;
  sections: string[];
  role: string;
  tone: string;
  personality: string;
  is_active: boolean;
};

export type Article = {
  id: string;
  journalist_id: string;
  website: string;
  section: string;
  topic: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  status: ArticleStatus;
  risk_level: 'low' | 'medium' | 'high';
  fact_check_status: 'passed' | 'needs_review' | 'failed';
  bias_check_status: 'passed' | 'needs_review' | 'failed';
  image_status: 'pending' | 'approved' | 'needs_regeneration';
  created_at: string;
  updated_at: string;
};
