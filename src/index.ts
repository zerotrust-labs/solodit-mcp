#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Solodit API configuration
const SOLODIT_API_BASE_URL = "https://solodit.cyfrin.io/api/v1/solodit";
const SOLODIT_API_KEY = process.env.SOLODIT_API_KEY || "";

// Type definitions based on the API spec
interface SoloditFilters {
  keywords?: string;
  impact?: Array<"HIGH" | "MEDIUM" | "LOW" | "GAS">;
  firms?: Array<{ value: string; label?: string }>;
  tags?: Array<{ value: string; label?: string }>;
  protocol?: string;
  protocolCategory?: Array<{ value: string; label?: string }>;
  forked?: Array<{ value: string; label?: string }>;
  languages?: Array<{ value: string; label?: string }>;
  user?: string;
  minFinders?: string;
  maxFinders?: string;
  reported?: {
    value: "30" | "60" | "90" | "after" | "alltime";
    label?: string;
  };
  reportedAfter?: string;
  qualityScore?: number;
  rarityScore?: number;
  sortField?: "Recency" | "Quality" | "Rarity";
  sortDirection?: "Desc" | "Asc";
}

interface SoloditRequest {
  page?: number;
  pageSize?: number;
  filters?: SoloditFilters;
}

interface SoloditFinding {
  id: string;
  slug: string;
  title: string;
  content: string;
  summary: string | null;
  impact: "HIGH" | "MEDIUM" | "LOW" | "GAS";
  quality_score: number;
  general_score: number;
  report_date: string | null;
  firm_name: string | null;
  protocol_name: string | null;
  finders_count: number;
  source_link: string | null;
  issues_issue_finders: Array<{
    wardens_warden: {
      handle: string;
    };
  }>;
  issues_issuetagscore: Array<{
    tags_tag: {
      title: string;
    };
  }>;
}

interface SoloditResponse {
  findings: SoloditFinding[];
  metadata: {
    totalResults: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
    elapsed: number;
  };
  rateLimit: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

// Function to search Solodit findings
async function searchSoloditFindings(
  request: SoloditRequest
): Promise<SoloditResponse> {
  if (!SOLODIT_API_KEY) {
    throw new Error(
      "SOLODIT_API_KEY environment variable is not set. Please set it to use the Solodit API."
    );
  }

  const response = await fetch(`${SOLODIT_API_BASE_URL}/findings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Cyfrin-API-Key": SOLODIT_API_KEY,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Solodit API error (${response.status}): ${
        errorData.message || response.statusText
      }`
    );
  }

  return await response.json();
}

// Format a finding for display
function formatFinding(finding: SoloditFinding): string {
  const tags = finding.issues_issuetagscore
    .map((t) => t.tags_tag.title)
    .join(", ");
  const finders = finding.issues_issue_finders
    .map((f) => f.wardens_warden.handle)
    .join(", ");

  return `
## [${finding.impact}] ${finding.title}

**ID:** ${finding.id}
**Slug:** ${finding.slug}
**Protocol:** ${finding.protocol_name || "N/A"}
**Audit Firm:** ${finding.firm_name || "N/A"}
**Quality Score:** ${finding.quality_score}/5
**Rarity Score:** ${finding.general_score}/5
**Report Date:** ${finding.report_date || "N/A"}
**Finders:** ${finders || "N/A"} (${finding.finders_count} total)
**Tags:** ${tags || "N/A"}
**Source:** ${finding.source_link || "N/A"}

${finding.summary || finding.content.substring(0, 500) + "..."}

---
`.trim();
}

// Initialize the MCP server
const mcpServer = new McpServer(
  {
    name: "solodit-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register search_findings tool
mcpServer.registerTool(
  "search_findings",
  {
    description:
      "Search Solodit for smart contract security findings and vulnerabilities. You can filter by keywords, impact level, audit firms, tags, protocols, and more.",
    inputSchema: {
      keywords: z
        .string()
        .optional()
        .describe("Search keywords to find in title and content"),
      impact: z
        .array(z.enum(["HIGH", "MEDIUM", "LOW", "GAS"]))
        .optional()
        .describe("Filter by impact level (severity)"),
      firms: z
        .array(z.string())
        .optional()
        .describe(
          "Filter by audit firm names (e.g., Cyfrin, Sherlock, Code4rena)"
        ),
      tags: z
        .array(z.string())
        .optional()
        .describe(
          "Filter by vulnerability tags (e.g., Reentrancy, Oracle, Access Control)"
        ),
      protocol: z
        .string()
        .optional()
        .describe("Filter by protocol name (partial match)"),
      protocolCategory: z
        .array(z.string())
        .optional()
        .describe("Filter by protocol categories (e.g., DeFi, NFT, Lending)"),
      languages: z
        .array(z.string())
        .optional()
        .describe(
          "Filter by programming languages (e.g., Solidity, Rust, Cairo)"
        ),
      user: z
        .string()
        .optional()
        .describe("Filter by finder/auditor handle (partial match)"),
      minFinders: z.string().optional().describe("Minimum number of finders"),
      maxFinders: z.string().optional().describe("Maximum number of finders"),
      reportedDays: z
        .enum(["30", "60", "90", "alltime"])
        .optional()
        .describe("Filter by time period (30, 60, 90 days, or alltime)"),
      qualityScore: z
        .number()
        .min(0)
        .max(5)
        .optional()
        .describe("Minimum quality score (0-5)"),
      rarityScore: z
        .number()
        .min(0)
        .max(5)
        .optional()
        .describe("Minimum rarity score (0-5)"),
      sortField: z
        .enum(["Recency", "Quality", "Rarity"])
        .optional()
        .describe("Sort by field (default: Recency)"),
      sortDirection: z
        .enum(["Desc", "Asc"])
        .optional()
        .describe("Sort direction (default: Desc)"),
      page: z.number().min(1).optional().describe("Page number (default: 1)"),
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Results per page (default: 20, max: 100)"),
    },
  },
  async (args) => {
    // Build the filters object
    const filters: SoloditFilters = {};

    if (args.keywords) filters.keywords = args.keywords;
    if (args.impact) filters.impact = args.impact;
    if (args.firms) filters.firms = args.firms.map((f) => ({ value: f }));
    if (args.tags) filters.tags = args.tags.map((t) => ({ value: t }));
    if (args.protocol) filters.protocol = args.protocol;
    if (args.protocolCategory)
      filters.protocolCategory = args.protocolCategory.map((c) => ({
        value: c,
      }));
    if (args.languages)
      filters.languages = args.languages.map((l) => ({
        value: l,
      }));
    if (args.user) filters.user = args.user;
    if (args.minFinders) filters.minFinders = args.minFinders;
    if (args.maxFinders) filters.maxFinders = args.maxFinders;
    if (args.reportedDays)
      filters.reported = {
        value: args.reportedDays,
      };
    if (args.qualityScore !== undefined)
      filters.qualityScore = args.qualityScore;
    if (args.rarityScore !== undefined) filters.rarityScore = args.rarityScore;
    if (args.sortField) filters.sortField = args.sortField;
    if (args.sortDirection) filters.sortDirection = args.sortDirection;

    const searchRequest: SoloditRequest = {
      page: args.page || 1,
      pageSize: args.pageSize || 20,
    };

    if (Object.keys(filters).length > 0) {
      searchRequest.filters = filters;
    }

    const response = await searchSoloditFindings(searchRequest);

    // Format the findings
    const formattedFindings = response.findings
      .map((f) => formatFinding(f))
      .join("\n\n");

    const summary = `
# Solodit Search Results

**Total Results:** ${response.metadata.totalResults}
**Page:** ${response.metadata.currentPage} of ${response.metadata.totalPages}
**Results on this page:** ${response.findings.length}
**Query Time:** ${response.metadata.elapsed.toFixed(3)}s
**Rate Limit:** ${response.rateLimit.remaining}/${response.rateLimit.limit} remaining

---

${formattedFindings}
`.trim();

    return {
      content: [
        {
          type: "text",
          text: summary,
        },
      ],
    };
  }
);

// Register get_finding_by_id tool
mcpServer.registerTool(
  "get_finding_by_id",
  {
    description:
      "Get detailed information about a specific finding by its ID or slug",
    inputSchema: {
      keywords: z.string().describe("The finding ID or slug to search for"),
    },
  },
  async (args) => {
    const searchRequest: SoloditRequest = {
      page: 1,
      pageSize: 1,
      filters: {
        keywords: args.keywords,
      },
    };

    const response = await searchSoloditFindings(searchRequest);

    if (response.findings.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No finding found with ID or slug: ${args.keywords}`,
          },
        ],
      };
    }

    const finding = response.findings[0];
    if (!finding) {
      return {
        content: [
          {
            type: "text",
            text: `No finding found with ID or slug: ${args.keywords}`,
          },
        ],
      };
    }

    const formattedFinding = `
# ${finding.title}

**ID:** ${finding.id}
**Slug:** ${finding.slug}
**Impact:** ${finding.impact}
**Protocol:** ${finding.protocol_name || "N/A"}
**Audit Firm:** ${finding.firm_name || "N/A"}
**Quality Score:** ${finding.quality_score}/5
**Rarity Score:** ${finding.general_score}/5
**Report Date:** ${finding.report_date || "N/A"}
**Finders:** ${finding.issues_issue_finders.map((f) => f.wardens_warden.handle).join(", ") || "N/A"} (${finding.finders_count} total)
**Tags:** ${finding.issues_issuetagscore.map((t) => t.tags_tag.title).join(", ") || "N/A"}
**Source:** ${finding.source_link || "N/A"}

---

## Content

${finding.content}
`.trim();

    return {
      content: [
        {
          type: "text",
          text: formattedFinding,
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("Solodit MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
