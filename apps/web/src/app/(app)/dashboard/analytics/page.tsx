import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 px-4 py-6 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>
            Funnel and performance analytics will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Coming later.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
