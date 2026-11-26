import axios, { AxiosInstance, AxiosError } from "axios";
import { ServerConfig } from "../config.js";
import {
  ApiResponse,
  PlatformStatus,
  PlatformSettings,
  CosmicStructure,
  StarSystem,
  CelestialBody,
  LiveClusterResult,
  ClusterSnapshot,
  ClusterGroup,
  ClusterReport,
  ClusterReportSummary,
  ClusterSubReport,
  JobStatus
} from "./types.js";

export class AstronomerApiError extends Error {
  public code: string;
  public status?: number;
  public details?: string[];

  constructor(message: string, code = "api_error", status?: number, details?: string[]) {
    super(message);
    this.name = "AstronomerApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class AstronomerApiClient {
  private http: AxiosInstance;
  public readonly apiUrl: string;

  constructor(config: ServerConfig) {
    this.apiUrl = config.apiUrl;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json"
    };

    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    this.http = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeoutMs,
      headers
    });
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosErr = error as AxiosError<{ error?: { code?: string; message?: string; details?: string[] } }>;
      const status = axiosErr.response?.status;
      const errorPayload = axiosErr.response?.data?.error;

      if (errorPayload) {
        throw new AstronomerApiError(
          errorPayload.message || axiosErr.message,
          errorPayload.code || "api_error",
          status,
          errorPayload.details
        );
      }

      throw new AstronomerApiError(
        axiosErr.message,
        status ? `http_${status}` : "network_error",
        status
      );
    }

    if (error instanceof Error) {
      throw new AstronomerApiError(error.message);
    }

    throw new AstronomerApiError(String(error));
  }

  // System & Status
  async getStatus(): Promise<PlatformStatus> {
    try {
      const res = await this.http.get<ApiResponse<PlatformStatus>>("/status");
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async getOpenApiSpec(): Promise<Record<string, unknown>> {
    try {
      const res = await this.http.get<Record<string, unknown>>("/openapi.json");
      return res.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async getSettings(): Promise<PlatformSettings> {
    try {
      const res = await this.http.get<ApiResponse<PlatformSettings>>("/settings");
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async updateContextWindow(contextWindow: number): Promise<unknown> {
    try {
      const res = await this.http.patch<ApiResponse<unknown>>("/settings/context_window", {
        context_window: contextWindow
      });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async generateBulkEmbeddings(modelType: "StarSystem" | "CelestialBody", onlyMissing = true): Promise<unknown> {
    try {
      const res = await this.http.post<ApiResponse<unknown>>("/settings/generate_embeddings", {
        model_type: modelType,
        only_missing: onlyMissing
      });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  // Global Search
  async search(params: {
    q: string;
    mode?: "semantic" | "keyword" | "auto";
    target_type?: "all" | "star_system" | "celestial_body";
    limit?: number;
  }): Promise<ApiResponse<unknown>> {
    try {
      const res = await this.http.get<ApiResponse<unknown>>("/search", { params });
      return res.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  // Cosmic Structures
  async listCosmicStructures(params?: {
    q?: string;
    include_star_systems?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<CosmicStructure[]>> {
    try {
      const res = await this.http.get<ApiResponse<CosmicStructure[]>>("/cosmic_structures", { params });
      return res.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async getCosmicStructure(id: number, params?: { include_star_systems?: boolean }): Promise<CosmicStructure> {
    try {
      const res = await this.http.get<ApiResponse<CosmicStructure>>(`/cosmic_structures/${id}`, { params });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async createCosmicStructure(cosmic_structure: { name: string; description?: string }): Promise<CosmicStructure> {
    try {
      const res = await this.http.post<ApiResponse<CosmicStructure>>("/cosmic_structures", { cosmic_structure });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async updateCosmicStructure(id: number, cosmic_structure: { name?: string; description?: string }): Promise<CosmicStructure> {
    try {
      const res = await this.http.patch<ApiResponse<CosmicStructure>>(`/cosmic_structures/${id}`, { cosmic_structure });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async deleteCosmicStructure(id: number): Promise<{ id: number; name: string; deleted: boolean }> {
    try {
      const res = await this.http.delete<ApiResponse<{ id: number; name: string; deleted: boolean }>>(`/cosmic_structures/${id}`);
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async upsertCosmicStructuresBatch(
    cosmic_structures: Array<{ name: string; description?: string }>
  ): Promise<ApiResponse<CosmicStructure[]>> {
    try {
      const res = await this.http.post<ApiResponse<CosmicStructure[]>>("/cosmic_structures/upsert_batch", {
        cosmic_structures
      });
      return res.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async populateCosmicStructures(sync = false): Promise<unknown> {
    try {
      const res = await this.http.post<ApiResponse<unknown>>(
        "/cosmic_structures/populate",
        {},
        {
          params: { sync }
        }
      );
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async populateCosmicStructureStarSystems(cosmicStructureId: number, sync = true): Promise<unknown> {
    try {
      const res = await this.http.post<ApiResponse<unknown>>(
        `/cosmic_structures/${cosmicStructureId}/populate_star_systems`,
        {},
        {
          params: { sync }
        }
      );
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  // Star Systems
  async listStarSystems(params?: {
    cosmic_structure_id?: number;
    cosmic_structure?: string;
    theme?: string;
    q?: string;
    embedded?: boolean;
    include_celestial_bodies?: boolean;
    include_embedding?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<StarSystem[]>> {
    try {
      const res = await this.http.get<ApiResponse<StarSystem[]>>("/star_systems", { params });
      return res.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async getStarSystem(id: number, params?: { include_embedding?: boolean; include_celestial_bodies?: boolean }): Promise<StarSystem> {
    try {
      const res = await this.http.get<ApiResponse<StarSystem>>(`/star_systems/${id}`, { params });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async createStarSystem(star_system: {
    cosmic_structure_id: number;
    name: string;
    description?: string;
    themes?: string[];
  }): Promise<StarSystem> {
    try {
      const res = await this.http.post<ApiResponse<StarSystem>>("/star_systems", { star_system });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async updateStarSystem(
    id: number,
    star_system: {
      name?: string;
      description?: string;
      themes?: string[];
      cosmic_structure_id?: number;
    }
  ): Promise<StarSystem> {
    try {
      const res = await this.http.patch<ApiResponse<StarSystem>>(`/star_systems/${id}`, { star_system });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async deleteStarSystem(id: number): Promise<{ id: number; name: string; deleted: boolean }> {
    try {
      const res = await this.http.delete<ApiResponse<{ id: number; name: string; deleted: boolean }>>(`/star_systems/${id}`);
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async upsertStarSystemsBatch(
    cosmicStructureId: number,
    star_systems: Array<{
      name: string;
      description?: string;
      themes?: string[];
    }>
  ): Promise<ApiResponse<StarSystem[]>> {
    try {
      const res = await this.http.post<ApiResponse<StarSystem[]>>("/star_systems/upsert_batch", {
        cosmic_structure_id: cosmicStructureId,
        star_systems
      });
      return res.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async getStarSystemNeighbors(
    id: number,
    params?: { limit?: number; cosmic_structure_id?: number; include_embedding?: boolean }
  ): Promise<StarSystem[]> {
    try {
      const res = await this.http.get<ApiResponse<StarSystem[]>>(`/star_systems/${id}/neighbors`, { params });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async generateStarSystemEmbedding(id: number, sync = true): Promise<unknown> {
    try {
      const res = await this.http.post<ApiResponse<unknown>>(
        `/star_systems/${id}/generate_embedding`,
        {},
        {
          params: { sync }
        }
      );
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async populateStarSystemCelestialBodies(id: number, sync = true): Promise<unknown> {
    try {
      const res = await this.http.post<ApiResponse<unknown>>(
        `/star_systems/${id}/populate_celestial_bodies`,
        {},
        {
          params: { sync }
        }
      );
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async populateStarSystems(cosmicStructureId?: number, sync = false): Promise<unknown> {
    try {
      const res = await this.http.post<ApiResponse<unknown>>(
        "/star_systems/populate",
        {},
        {
          params: { cosmic_structure_id: cosmicStructureId, sync }
        }
      );
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  // Celestial Bodies
  async listCelestialBodies(params?: {
    star_system_id?: number;
    cosmic_structure_id?: number;
    theme?: string;
    q?: string;
    embedded?: boolean;
    include_embedding?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<CelestialBody[]>> {
    try {
      const res = await this.http.get<ApiResponse<CelestialBody[]>>("/celestial_bodies", { params });
      return res.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async getCelestialBody(id: number, params?: { include_embedding?: boolean }): Promise<CelestialBody> {
    try {
      const res = await this.http.get<ApiResponse<CelestialBody>>(`/celestial_bodies/${id}`, { params });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async createCelestialBody(celestial_body: {
    star_system_id: number;
    name: string;
    description?: string;
    themes?: string[];
  }): Promise<CelestialBody> {
    try {
      const res = await this.http.post<ApiResponse<CelestialBody>>("/celestial_bodies", { celestial_body });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async updateCelestialBody(
    id: number,
    celestial_body: {
      name?: string;
      description?: string;
      themes?: string[];
      star_system_id?: number;
    }
  ): Promise<CelestialBody> {
    try {
      const res = await this.http.patch<ApiResponse<CelestialBody>>(`/celestial_bodies/${id}`, { celestial_body });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async deleteCelestialBody(id: number): Promise<{ id: number; star_system_id: number; deleted: boolean }> {
    try {
      const res = await this.http.delete<ApiResponse<{ id: number; star_system_id: number; deleted: boolean }>>(
        `/celestial_bodies/${id}`
      );
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async upsertCelestialBodiesBatch(
    starSystemId: number,
    celestial_bodies: Array<{
      name: string;
      description?: string;
      themes?: string[];
    }>
  ): Promise<ApiResponse<CelestialBody[]>> {
    try {
      const res = await this.http.post<ApiResponse<CelestialBody[]>>("/celestial_bodies/upsert_batch", {
        star_system_id: starSystemId,
        celestial_bodies
      });
      return res.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async getCelestialBodyNeighbors(
    id: number,
    params?: { limit?: number; star_system_id?: number; cosmic_structure_id?: number; include_embedding?: boolean }
  ): Promise<CelestialBody[]> {
    try {
      const res = await this.http.get<ApiResponse<CelestialBody[]>>(`/celestial_bodies/${id}/neighbors`, { params });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async generateCelestialBodyEmbedding(id: number, sync = true): Promise<unknown> {
    try {
      const res = await this.http.post<ApiResponse<unknown>>(
        `/celestial_bodies/${id}/generate_embedding`,
        {},
        {
          params: { sync }
        }
      );
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async populateCelestialBodies(starSystemId?: number, sync = false): Promise<unknown> {
    try {
      const res = await this.http.post<ApiResponse<unknown>>(
        "/celestial_bodies/populate",
        {},
        {
          params: { star_system_id: starSystemId, sync }
        }
      );
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  // Clusters & Snapshots
  async computeClusters(params?: {
    target_type?: "StarSystem" | "CelestialBody";
    level?: number;
    full_coverage?: boolean;
    force?: boolean;
  }): Promise<LiveClusterResult> {
    try {
      const res = await this.http.get<ApiResponse<LiveClusterResult>>("/clusters", { params });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async createClusterSnapshot(data: {
    target_type: "StarSystem" | "CelestialBody";
    level: number;
    full_coverage?: boolean;
    title: string;
  }): Promise<ClusterSnapshot> {
    try {
      const res = await this.http.post<ApiResponse<ClusterSnapshot>>("/clusters/snapshot", data);
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async listClusterSnapshots(params?: {
    target_type?: "StarSystem" | "CelestialBody";
    include_groups?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<ClusterSnapshot[]>> {
    try {
      const res = await this.http.get<ApiResponse<ClusterSnapshot[]>>("/cluster_snapshots", { params });
      return res.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async getClusterSnapshot(
    id: number,
    params?: {
      include_groups?: boolean;
      include_members?: boolean;
      include_reports?: boolean;
    }
  ): Promise<ClusterSnapshot> {
    try {
      const res = await this.http.get<ApiResponse<ClusterSnapshot>>(`/cluster_snapshots/${id}`, { params });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async deleteClusterSnapshot(id: number): Promise<{ id: number; title: string; deleted: boolean }> {
    try {
      const res = await this.http.delete<ApiResponse<{ id: number; title: string; deleted: boolean }>>(
        `/cluster_snapshots/${id}`
      );
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async listClusterGroups(
    clusterSnapshotId: number,
    params?: { include_members?: boolean }
  ): Promise<ApiResponse<ClusterGroup[]>> {
    try {
      const res = await this.http.get<ApiResponse<ClusterGroup[]>>(
        `/cluster_snapshots/${clusterSnapshotId}/cluster_groups`,
        { params }
      );
      return res.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async getClusterGroup(id: number, params?: { include_members?: boolean }): Promise<ClusterGroup> {
    try {
      const res = await this.http.get<ApiResponse<ClusterGroup>>(`/cluster_groups/${id}`, { params });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  // Synthesis Reports
  async listClusterReports(params?: {
    cluster_snapshot_id?: number;
    target_type?: "StarSystem" | "CelestialBody";
    status?: string;
    is_detailed?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<ClusterReport[]>> {
    try {
      const res = await this.http.get<ApiResponse<ClusterReport[]>>("/cluster_reports", { params });
      return res.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async getClusterReport(
    id: number,
    params?: {
      include_summaries?: boolean;
      include_sub_reports?: boolean;
    }
  ): Promise<ClusterReport> {
    try {
      const res = await this.http.get<ApiResponse<ClusterReport>>(`/cluster_reports/${id}`, { params });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async createClusterReport(data: {
    cluster_snapshot_id: number;
    prompt: string;
  }): Promise<ClusterReport> {
    try {
      const res = await this.http.post<ApiResponse<ClusterReport>>("/cluster_reports", data);
      const report = res.data.data;
      if (res.data.meta && (res.data.meta as Record<string, unknown>).job_id) {
        report.job_id = (res.data.meta as Record<string, unknown>).job_id as string;
      }
      return report;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async deleteClusterReport(id: number): Promise<{ id: number; title: string; deleted: boolean }> {
    try {
      const res = await this.http.delete<ApiResponse<{ id: number; title: string; deleted: boolean }>>(
        `/cluster_reports/${id}`
      );
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async deepSynthesis(reportId: number, data?: { batch_size?: number }): Promise<ClusterReport> {
    try {
      const res = await this.http.post<ApiResponse<ClusterReport>>(
        `/cluster_reports/${reportId}/deep_synthesis`,
        data || {}
      );
      const report = res.data.data;
      if (res.data.meta && (res.data.meta as Record<string, unknown>).job_id) {
        report.job_id = (res.data.meta as Record<string, unknown>).job_id as string;
      }
      return report;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async waitForClusterReport(
    id: number,
    pollIntervalMs = 5000,
    timeoutMs = 600000
  ): Promise<ClusterReport> {
    const startTime = Date.now();
    let lastReport: ClusterReport | null = null;
    while (Date.now() - startTime < timeoutMs) {
      const report = await this.getClusterReport(id, {
        include_summaries: false,
        include_sub_reports: false
      });
      lastReport = report;
      if (report.status === "completed") {
        return await this.getClusterReport(id, {
          include_summaries: false,
          include_sub_reports: true
        });
      }
      if (report.status === "failed") {
        throw new AstronomerApiError(
          report.error_message || `Cluster report ${id} failed`,
          "report_failed"
        );
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    if (lastReport && (lastReport.status === "running" || lastReport.status === "queued")) {
      return {
        ...lastReport,
        timed_out: true,
        is_running: true
      };
    }
    throw new AstronomerApiError(
      `Cluster report ${id} timed out after ${timeoutMs}ms while waiting for completion`,
      "report_timeout"
    );
  }

  async listClusterReportSummaries(clusterReportId: number): Promise<ClusterReportSummary[]> {
    try {
      const res = await this.http.get<ApiResponse<ClusterReportSummary[]>>(
        `/cluster_reports/${clusterReportId}/summaries`
      );
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async getClusterReportSummary(id: number): Promise<ClusterReportSummary> {
    try {
      const res = await this.http.get<ApiResponse<ClusterReportSummary>>(`/cluster_report_summaries/${id}`);
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async listClusterSubReports(clusterReportId: number): Promise<ClusterSubReport[]> {
    try {
      const res = await this.http.get<ApiResponse<ClusterSubReport[]>>(
        `/cluster_reports/${clusterReportId}/sub_reports`
      );
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async getClusterSubReport(id: number): Promise<ClusterSubReport> {
    try {
      const res = await this.http.get<ApiResponse<ClusterSubReport>>(`/cluster_sub_reports/${id}`);
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  // Jobs
  async listJobs(limit = 20): Promise<JobStatus[]> {
    try {
      const res = await this.http.get<ApiResponse<JobStatus[]>>("/jobs", { params: { limit } });
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async getJob(jobId: string): Promise<JobStatus> {
    try {
      const res = await this.http.get<ApiResponse<JobStatus>>(`/jobs/${jobId}`);
      return res.data.data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async waitForJob(jobId: string, pollIntervalMs = 2000, timeoutMs = 60000): Promise<JobStatus> {
    const startTime = Date.now();
    let lastJob: JobStatus | null = null;
    while (Date.now() - startTime < timeoutMs) {
      const job = await this.getJob(jobId);
      lastJob = job;
      if (job.status === "completed") {
        return job;
      }
      if (job.status === "failed") {
        throw new AstronomerApiError(
          job.error || job.message || `Job ${jobId} failed`,
          "job_failed"
        );
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    if (lastJob && (lastJob.status === "running" || lastJob.status === "queued")) {
      return {
        ...lastJob,
        timed_out: true,
        is_running: true,
        message: `Job ${jobId} is still ${lastJob.status} in the background after ${timeoutMs}ms. Do NOT retry or duplicate.`
      };
    }
    throw new AstronomerApiError(
      `Job ${jobId} timed out after ${timeoutMs}ms while waiting for completion`,
      "job_timeout"
    );
  }
}
