import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export interface SendEmailOutput {
  success: boolean;
  providerMessageId: string;
  errorMessage?: string;
}

export class EmailProvider {
  async sendEmail(input: SendEmailInput): Promise<SendEmailOutput> {
    const apiKey = env.EMAIL_API_KEY;
    const provider = env.EMAIL_PROVIDER || "resend";
    const fromAddress = input.from || env.EMAIL_FROM || "Lead SaaS <onboarding@resend.dev>";

    if (!apiKey || provider === "mock") {
      logger.info("[MOCK MODE] EMAIL_API_KEY is not configured or set to mock. Simulating dispatch.", {
        to: input.to,
        subject: input.subject,
        provider,
      });

      return {
        success: true,
        providerMessageId: `mock_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      };
    }

    try {
      if (provider === "sendgrid") {
        return await this.sendWithSendGrid(apiKey, fromAddress, input);
      } else {
        return await this.sendWithResend(apiKey, fromAddress, input);
      }
    } catch (error) {
      logger.error("Failed to send email via provider API", { input, provider, error });
      return {
        success: false,
        providerMessageId: "",
        errorMessage: error instanceof Error ? error.message : "Unknown email provider error",
      };
    }
  }

  private async sendWithResend(apiKey: string, from: string, input: SendEmailInput): Promise<SendEmailOutput> {
    logger.info("Sending email via Resend API", { to: input.to, subject: input.subject, from });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.body,
        html: input.body.replace(/\n/g, "<br>"),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.message || data.error?.message || `Resend API returned status ${response.status}`;
      logger.error("Resend API error", { data, status: response.status });
      return {
        success: false,
        providerMessageId: "",
        errorMessage: msg,
      };
    }

    return {
      success: true,
      providerMessageId: data.id || `resend_${Date.now()}`,
    };
  }

  private async sendWithSendGrid(apiKey: string, from: string, input: SendEmailInput): Promise<SendEmailOutput> {
    logger.info("Sending email via SendGrid API", { to: input.to, subject: input.subject, from });

    const fromMatch = from.match(/^(?:(.*)<)?([^>]+)>?$/);
    const fromEmail = fromMatch ? fromMatch[2].trim() : from;
    const fromName = fromMatch && fromMatch[1] ? fromMatch[1].trim() : undefined;

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: input.to }] }],
        from: { email: fromEmail, ...(fromName ? { name: fromName } : {}) },
        subject: input.subject,
        content: [
          { type: "text/plain", value: input.body },
          { type: "text/html", value: input.body.replace(/\n/g, "<br>") },
        ],
      }),
    });

    if (!response.ok) {
      let errorMsg = `SendGrid API error ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.errors?.[0]?.message) {
          errorMsg = errorData.errors[0].message;
        }
      } catch {
        // body error ignore
      }
      logger.error("SendGrid API error", { status: response.status, errorMsg });
      return {
        success: false,
        providerMessageId: "",
        errorMessage: errorMsg,
      };
    }

    const messageId = response.headers.get("x-message-id") || `sg_${Date.now()}`;
    return {
      success: true,
      providerMessageId: messageId,
    };
  }
}
