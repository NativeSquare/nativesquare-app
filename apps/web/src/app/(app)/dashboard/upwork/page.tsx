import { Suspense } from "react"
import { UpworkDashboardToast } from "@/components/app/upwork/upwork-dashboard-toast"
import { UpworkJobsTable } from "@/components/app/upwork/upwork-jobs-table"

export default function UpworkPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <Suspense fallback={null}>
        <UpworkDashboardToast />
      </Suspense>
      <div className="px-4 lg:px-6">
        <UpworkJobsTable />
      </div>
    </div>
  )
}
