import { redirect } from "next/navigation";

// POS moved to its own fullscreen kiosk outside the admin shell.
export const dynamic = "force-dynamic";

export default function AdminPosRedirect() {
  redirect("/pos");
}
