import { getCollection } from "./database";
import { requireUser, type AuthUser } from "./auth";
import type { Document } from "mongodb";

type RolePermissions = Document & { permissions?: unknown };
type PermissionRecord = Document & { key: string };

export async function hasPermission(user: AuthUser, permission: string) {
  const [roles, permissions] = await Promise.all([
    getCollection<RolePermissions>("roles"),
    getCollection<PermissionRecord>("permissions"),
  ]);
  const [role, definition] = await Promise.all([
    roles.findOne({ key: user.role }),
    permissions.findOne({ key: permission }),
  ]);
  return (
    definition !== null &&
    Array.isArray(role?.permissions) &&
    role.permissions.includes(permission)
  );
}

export async function requirePermission(
  request: Request,
  permission: string,
): Promise<{ user: AuthUser } | { response: Response }> {
  const auth = await requireUser(request);
  if ("response" in auth) return auth;
  if (!(await hasPermission(auth.user, permission))) {
    return {
      response: Response.json(
        { error: "Brak wymaganych uprawnień." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
  return auth;
}
