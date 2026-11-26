export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  [key: string]: unknown;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: string[];
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}

export interface PlatformCounts {
  cosmic_structures: number;
  star_systems: number;
  star_systems_embedded: number;
  celestial_bodies: number;
  celestial_bodies_embedded: number;
  cluster_snapshots: number;
  cluster_reports: number;
}

export interface PlatformConfig {
  embedding_model: string;
  embedding_api_base: string;
  embedding_dimensions: number;
  llm_model: string;
  llm_api_base: string;
  context_window: number;
  digest_char_budget: number;
}

export interface PlatformStatus {
  status: string;
  environment: string;
  timestamp: string;
  counts: PlatformCounts;
  config: PlatformConfig;
}

export interface EmbeddingStats {
  total: number;
  embedded: number;
  missing: number;
  percent: number;
}

export interface PlatformSettings {
  star_system_stats: EmbeddingStats;
  celestial_body_stats: EmbeddingStats;
  embedding_config: {
    model: string;
    api_base: string;
    dimensions: number;
  };
  llm_config: {
    model: string;
    api_base: string;
    context_window: number;
    digest_char_budget: number;
    presets: Record<string, number>;
  };
}

export interface CosmicStructure {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  star_systems_count: number;
  star_systems?: StarSystem[];
}

export interface StarSystem {
  id: number;
  cosmic_structure_id: number;
  name: string;
  description: string | null;
  themes: string[];
  celestial_bodies_count: number;
  embedded: boolean;
  embedding_model: string | null;
  embedded_at: string | null;
  embedding_dimensions: number | null;
  created_at: string;
  updated_at: string;
  neighbor_distance?: number;
  cosmic_structure?: { id: number; name: string } | null;
  celestial_bodies?: CelestialBody[];
  embedding?: number[];
}

export interface CelestialBody {
  id: number;
  star_system_id: number;
  name: string;
  description: string | null;
  themes: string[];
  embedded: boolean;
  embedding_model: string | null;
  embedded_at: string | null;
  embedding_dimensions: number | null;
  created_at: string;
  updated_at: string;
  neighbor_distance?: number;
  star_system?: {
    id: number;
    name: string;
    cosmic_structure_id: number;
    cosmic_structure_name?: string | null;
  } | null;
  embedding?: number[];
}

export interface SearchResultItem {
  type: "StarSystem" | "CelestialBody";
  score?: number;
  data: StarSystem | CelestialBody;
}

export interface LiveClusterGroup {
  id: number;
  name: string;
  shared_themes: string[];
  size: number;
  cosmic_structures: string[];
  members: (StarSystem | CelestialBody)[];
}

export interface LiveClusterResult {
  target_type: "StarSystem" | "CelestialBody";
  level: number;
  distance_threshold: number;
  full_coverage: boolean;
  total_embedded_count: number;
  unembedded_count: number;
  clusters_count: number;
  singletons_count: number;
  largest_cluster_size: number;
  generated_at: string;
  clusters: LiveClusterGroup[];
  singletons: (StarSystem | CelestialBody)[];
}

export interface ClusterSnapshot {
  id: number;
  target_type: "StarSystem" | "CelestialBody";
  level: number;
  distance_threshold: number;
  title: string;
  clusters_count: number;
  items_count: number;
  created_at: string;
  updated_at: string;
  groups?: ClusterGroup[];
  reports?: ClusterReport[];
}

export interface ClusterGroup {
  id: number;
  cluster_snapshot_id: number;
  name: string;
  shared_themes: string[];
  size: number;
  created_at: string;
  updated_at: string;
  members?: (StarSystem | CelestialBody)[];
}

export interface ClusterReportSummary {
  id: number;
  cluster_report_id: number;
  cluster_group_id: number;
  cluster_group_name?: string;
  position: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ClusterSubReport {
  id: number;
  cluster_report_id: number;
  batch_index: number;
  cluster_group_ids: number[];
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ClusterReport {
  id: number;
  cluster_snapshot_id: number;
  title: string;
  prompt: string;
  status: "queued" | "running" | "completed" | "failed" | "pending";
  phase: string;
  phase_description?: string;
  progress_percentage: number;
  is_detailed: boolean;
  batch_size?: number;
  parent_report_id?: number | null;
  detailed_report_ids?: number[];
  summarized_clusters_count: number;
  total_clusters_count: number;
  aggregated_batches_count: number;
  total_batches_count: number;
  content?: string | null;
  error_message?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  job_id?: string | null;
  timed_out?: boolean;
  is_running?: boolean;
  summaries?: ClusterReportSummary[];
  sub_reports?: ClusterSubReport[];
}

export interface JobStatus {
  job_id: string;
  job_class: string;
  arguments?: unknown[];
  status: "queued" | "running" | "completed" | "failed";
  progress?: Record<string, unknown> | null;
  message?: string | null;
  result?: unknown;
  error?: string | null;
  enqueued_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  updated_at?: string;
  timed_out?: boolean;
  is_running?: boolean;
}
