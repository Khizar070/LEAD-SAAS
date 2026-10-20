import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const DEFAULT_USER_ID = "default-user-id";
export const DEFAULT_USER_EMAIL = "admin@local.host";
export const DEFAULT_WORKSPACE_NAME = "Personal Workspace";

export async function getOrCreateDefaultWorkspace() {
  try {
    // 1. Ensure default user exists
    let user = await prisma.user.findUnique({
      where: { email: DEFAULT_USER_EMAIL },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: DEFAULT_USER_ID,
          email: DEFAULT_USER_EMAIL,
          name: "Operator",
        },
      });
      logger.info("Created default MVP user", { userId: user.id });
    }

    // 2. Ensure default workspace exists
    let workspace = await prisma.workspace.findFirst({
      where: { ownerUserId: user.id },
    });

    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          name: DEFAULT_WORKSPACE_NAME,
          ownerUserId: user.id,
        },
      });
      logger.info("Created default MVP workspace", { workspaceId: workspace.id });
    }

    return workspace;
  } catch (error) {
    logger.error("Failed to resolve default workspace", { error });
    // Return fallback workspace object for development when database server is offline
    return {
      id: "default-workspace-id",
      name: DEFAULT_WORKSPACE_NAME,
      ownerUserId: DEFAULT_USER_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
