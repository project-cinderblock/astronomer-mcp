import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { AstronomerApiClient } from "../src/client/index.js";
import { registerAllTools } from "../src/tools/index.js";
import { registerResources } from "../src/resources/index.js";
import { registerPrompts } from "../src/prompts/index.js";

describe("MCP Server Tool, Resource, and Prompt Execution", () => {
  let mock: MockAdapter;
  let server: McpServer;
  let client: AstronomerApiClient;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    server = new McpServer(
      { name: "astronomer-test", version: "1.0.0" },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );
    client = new AstronomerApiClient({
      apiUrl: "http://localhost:3000/api/v1",
      timeoutMs: 5000
    });
    registerAllTools(server, client);
    registerResources(server, client);
    registerPrompts(server);
  });

  afterEach(() => {
    mock.restore();
  });

  it("registers all 51 expected tools across all 8 domains", () => {
    const registeredToolNames = Object.keys((server as any)._registeredTools);

    const expectedTools = [
      // Search (2)
      "search",
      "find_counterparts",
      // Cosmic Structures (8)
      "list_cosmic_structures",
      "get_cosmic_structure",
      "create_cosmic_structure",
      "update_cosmic_structure",
      "delete_cosmic_structure",
      "upsert_cosmic_structures_batch",
      "populate_cosmic_structures",
      "populate_cosmic_structure_star_systems",
      // Star Systems (9)
      "list_star_systems",
      "get_star_system",
      "create_star_system",
      "update_star_system",
      "delete_star_system",
      "upsert_star_systems_batch",
      "generate_star_system_embedding",
      "populate_star_system_celestial_bodies",
      "populate_star_systems_bulk",
      // Celestial Bodies (8)
      "list_celestial_bodies",
      "get_celestial_body",
      "create_celestial_body",
      "update_celestial_body",
      "delete_celestial_body",
      "upsert_celestial_bodies_batch",
      "generate_celestial_body_embedding",
      "populate_celestial_bodies_bulk",
      // Clusters & Snapshots (7)
      "compute_clusters",
      "create_cluster_snapshot",
      "list_cluster_snapshots",
      "get_cluster_snapshot",
      "delete_cluster_snapshot",
      "list_cluster_groups",
      "get_cluster_group",
      // Reports (10)
      "list_cluster_reports",
      "get_cluster_report",
      "create_cluster_report",
      "delete_cluster_report",
      "generate_deep_synthesis",
      "wait_for_cluster_report",
      "list_report_summaries",
      "get_report_summary",
      "list_report_sub_reports",
      "get_report_sub_report",
      // Jobs (3)
      "list_jobs",
      "get_job_status",
      "wait_for_job",
      // System (5)
      "get_platform_status",
      "get_settings",
      "update_context_window",
      "trigger_bulk_embeddings",
      "get_openapi_spec"
    ];

    for (const tool of expectedTools) {
      expect(registeredToolNames).toContain(tool);
    }
    expect(registeredToolNames.length).toBe(expectedTools.length);
  });

  it("executes the search tool handler successfully", async () => {
    const searchTool = (server as any)._registeredTools["search"];
    expect(searchTool).toBeDefined();

    mock.onGet("http://localhost:3000/api/v1/search").reply(200, {
      data: [{ type: "StarSystem", score: 0.94, data: { id: 1, name: "TRAPPIST-1" } }]
    });

    const result = await searchTool.handler({
      q: "ultra-cool red dwarf habitable exoplanets",
      mode: "auto",
      target_type: "all",
      limit: 10
    });
    expect(result.content).toBeDefined();
    expect(result.content[0].text).toContain("TRAPPIST-1");
  });

  it("executes get_star_system and handles 404 errors gracefully", async () => {
    const getStarSystemTool = (server as any)._registeredTools["get_star_system"];
    expect(getStarSystemTool).toBeDefined();

    mock.onGet("http://localhost:3000/api/v1/star_systems/42").reply(200, {
      data: { id: 42, name: "Sirius", themes: ["binary", "white dwarf", "main sequence"] }
    });

    const result = await getStarSystemTool.handler({
      id: 42,
      include_celestial_bodies: true,
      include_embedding: false
    });
    expect(result.content[0].text).toContain("Sirius");

    // Test error case
    mock.onGet("http://localhost:3000/api/v1/star_systems/999").reply(404, {
      error: { code: "not_found", message: "Star system not found" }
    });

    const errorResult = await getStarSystemTool.handler({
      id: 999,
      include_celestial_bodies: true,
      include_embedding: false
    });
    expect(errorResult.isError).toBe(true);
    expect(errorResult.content[0].text).toContain("Star system not found");
  });

  it("executes upsert_celestial_bodies_batch and find_counterparts for celestial bodies", async () => {
    const upsertBodiesTool = (server as any)._registeredTools["upsert_celestial_bodies_batch"];
    mock.onPost("http://localhost:3000/api/v1/celestial_bodies/upsert_batch").reply(200, {
      data: [{ id: 10, name: "Europa", themes: ["subsurface ocean"] }],
      meta: { star_system_id: 3, count: 1 }
    });

    const upsertRes = await upsertBodiesTool.handler({
      star_system_id: 3,
      celestial_bodies: [{ name: "Europa", themes: ["subsurface ocean"] }]
    });
    expect(upsertRes.content[0].text).toContain("Europa");

    const counterpartsTool = (server as any)._registeredTools["find_counterparts"];
    mock.onGet("http://localhost:3000/api/v1/celestial_bodies/10/neighbors").reply(200, {
      data: [{ id: 11, name: "Enceladus", neighbor_distance: 0.05 }]
    });

    const neighborsRes = await counterpartsTool.handler({
      entity_type: "celestial_body",
      id: 10,
      limit: 5,
      include_embedding: false
    });
    expect(neighborsRes.content[0].text).toContain("Enceladus");
  });

  it("registers resources correctly", () => {
    const registeredResources = (server as any)._registeredResources;
    const registeredTemplates = (server as any)._registeredResourceTemplates;

    expect(registeredResources["astronomer://status"]).toBeDefined();
    expect(registeredResources["astronomer://cosmic-structures"]).toBeDefined();
    expect(Object.keys(registeredTemplates)).toHaveLength(2);
  });

  it("registers prompts correctly", () => {
    const registeredPrompts = (server as any)._registeredPrompts;
    expect(registeredPrompts["comparative_astrophysics_analysis"]).toBeDefined();
    expect(registeredPrompts["astrophysical_cluster_synthesis"]).toBeDefined();

    const promptObj = registeredPrompts["comparative_astrophysics_analysis"];
    const generated = promptObj.callback({
      entity_a: "TRAPPIST-1",
      entity_b: "Proxima Centauri",
      entity_type: "star_system"
    });
    expect(generated.messages[0].content.text).toContain("TRAPPIST-1");
    expect(generated.messages[0].content.text).toContain("Proxima Centauri");
  });
});
