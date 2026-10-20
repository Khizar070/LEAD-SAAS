import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { EmailProvider } from "@/server/integrations/email-provider";

export async function approveOutreachMessage(
  messageId: string,
  updatedSubject?: string,
  updatedBody?: string
) {
  const message = await prisma.outreachMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new Error(`Outreach message ${messageId} not found`);
  }

  const updated = await prisma.outreachMessage.update({
    where: { id: messageId },
    data: {
      subject: updatedSubject || message.subject,
      body: updatedBody || message.body,
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  logger.info("Outreach message approved", { messageId: message.id });
  return updated;
}

export async function sendOutreachMessage(messageId: string, customRecipientEmail?: string) {
  const message = await prisma.outreachMessage.findUnique({
    where: { id: messageId },
    include: {
      business: true,
    },
  });

  if (!message) {
    throw new Error(`Outreach message ${messageId} not found`);
  }

  const business = message.business;
  const targetEmail = (customRecipientEmail && customRecipientEmail.trim().length > 0)
    ? customRecipientEmail.trim()
    : (business.phone ? `${business.name.toLowerCase().replace(/\s+/g, "")}@example.com` : "contact@example.com");

  // 1. Suppression List Check
  const isSuppressed = await prisma.suppressionContact.findFirst({
    where: {
      workspaceId: business.workspaceId,
      email: targetEmail.toLowerCase().trim(),
    },
  });

  if (isSuppressed) {
    await prisma.outreachMessage.update({
      where: { id: messageId },
      data: { status: "UNSUBSCRIBED" },
    });
    throw new Error(`Target contact ${targetEmail} is on the workspace suppression list.`);
  }

  // 2. Dispatch Email via Provider
  const provider = new EmailProvider();
  const sendResult = await provider.sendEmail({
    to: targetEmail,
    subject: message.subject,
    body: message.body,
  });

  if (!sendResult.success) {
    await prisma.outreachMessage.update({
      where: { id: messageId },
      data: { status: "FAILED" },
    });
    throw new Error(`Email provider failed: ${sendResult.errorMessage || "Unknown dispatch failure"}`);
  }

  // 3. Update Message Status
  const sentMessage = await prisma.outreachMessage.update({
    where: { id: messageId },
    data: {
      status: "SENT",
      sentAt: new Date(),
      providerMessageId: sendResult.providerMessageId,
    },
  });

  // 4. Record Event Log
  await prisma.outreachEvent.create({
    data: {
      outreachMessageId: messageId,
      eventType: "EMAIL_SENT",
      metadataJson: JSON.stringify({
        providerMessageId: sendResult.providerMessageId,
        recipient: targetEmail,
      }),
    },
  });

  logger.info("Outreach message sent successfully", {
    messageId,
    providerMessageId: sendResult.providerMessageId,
  });

  return sentMessage;
}
