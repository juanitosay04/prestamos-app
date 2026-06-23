import { Sidebar } from "./Sidebar"
import { getSession } from "@/lib/session"

export async function SidebarServer() {
  const session = await getSession()
  return <Sidebar role={session?.role} />
}
