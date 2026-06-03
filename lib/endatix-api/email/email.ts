import { EndatixApi } from "../endatix-api";
import type {
  EmailProviderInfo,
  EmailTemplateSummary,
  SendTestEmailRequest,
} from "./types";

export default class Email {
  constructor(private readonly endatix: EndatixApi) {}

  async getProviderSettings() {
    return this.endatix.get<EmailProviderInfo>("/admin/email/settings");
  }

  async getTemplates() {
    return this.endatix.get<EmailTemplateSummary[]>("/admin/email/templates");
  }

  async sendTestEmail(request: SendTestEmailRequest) {
    return this.endatix.post<string>("/admin/email/test", request);
  }
}
