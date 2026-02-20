import migrations from "@convex-dev/migrations/convex.config";
import resend from "@convex-dev/resend/convex.config";
import upwork from "@nativesquare/upwork/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(migrations);
app.use(resend);
app.use(upwork);

export default app;
