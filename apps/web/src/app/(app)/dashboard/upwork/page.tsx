import { Suspense } from "react"
import { AutoApplySettingsCard } from "@/components/app/upwork/auto-apply-settings-card"
import { PendingApplicationsCard } from "@/components/app/upwork/pending-applications-card"
import { UpworkConnectCard } from "@/components/app/upwork/upwork-connect-card"
import { UpworkDashboardToast } from "@/components/app/upwork/upwork-dashboard-toast"
import { UpworkJobsCard } from "@/components/app/upwork/upwork-jobs-card"

export default function UpworkPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <UpworkConnectCard />
        <AutoApplySettingsCard />
      </div>
      <Suspense fallback={null}>
        <UpworkDashboardToast />
      </Suspense>
      <div className="px-4 lg:px-6 flex flex-col gap-4">
        <PendingApplicationsCard />
        <UpworkJobsCard />
      </div>
    </div>
  )
}
