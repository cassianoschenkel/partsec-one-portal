import type {
  IntegrationStatus,
  IntegrationType,
} from "@/generated/prisma/enums";

export type CustomerIntegrationInput = {
  id: string;
  type: IntegrationType;
  status: IntegrationStatus;
};

export type CustomerIntegrationView = {
  id: string;
  label: string;
  description: string;
  statusLabel: string;
};

const SERVICE_LABELS: Record<
  IntegrationType,
  { label: string; description: string }
> = {
  ZABBIX: {
    label: "Monitoramento",
    description: "Disponibilidade da infraestrutura",
  },
  WAZUH: {
    label: "Segurança",
    description: "Detecção e gestão de vulnerabilidades",
  },
  ZAMMAD: { label: "Suporte", description: "Central de atendimento" },
};

/**
 * Maps internal integration rows to neutral, display-only values so that no
 * internal status code or technical identifier reaches the rendered page.
 */
export function toCustomerIntegrationView(
  integration: CustomerIntegrationInput
): CustomerIntegrationView {
  const service = SERVICE_LABELS[integration.type] ?? {
    label: "Serviço",
    description: "",
  };

  return {
    id: integration.id,
    label: service.label,
    description: service.description,
    statusLabel:
      integration.status === "ACTIVE" ? "Disponível" : "Indisponível",
  };
}
