import { requireSession } from "@/lib/auth/session";
import { exportLeave } from "@/lib/services/export-service";

export async function GET() {
  const session = await requireSession();
  const buffer = await exportLeave({ userId: session.user.id, role: session.user.role });
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="leave.xlsx"'
    }
  });
}
