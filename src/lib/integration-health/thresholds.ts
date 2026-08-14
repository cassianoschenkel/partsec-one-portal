export type PipelineThresholds = {
  staleAfterMs: number;
  stuckAfterMs: number;
};

export type IntegrationHealthThresholds = {
  zabbix: PipelineThresholds;
  siemAgents: PipelineThresholds;
  siemVulnerabilities: PipelineThresholds;
};

const MINUTES = 60 * 1000;

export const integrationHealthThresholds: IntegrationHealthThresholds = {
  zabbix: {
    staleAfterMs: 15 * MINUTES,
    stuckAfterMs: 10 * MINUTES,
  },
  siemAgents: {
    staleAfterMs: 15 * MINUTES,
    stuckAfterMs: 10 * MINUTES,
  },
  siemVulnerabilities: {
    staleAfterMs: 90 * MINUTES,
    stuckAfterMs: 60 * MINUTES,
  },
};
