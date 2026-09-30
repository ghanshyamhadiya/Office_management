import { getLeaveTypes } from "@/lib/services/leave-service";
import { ok } from "@/lib/utils/api";

export async function GET() {
  const data = await getLeaveTypes();
  return ok("Leave types fetched.", data);
}
