import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { dodoWebhook } from "./dodoWebhook";

const http = httpRouter();
auth.addHttpRoutes(http);

// Dodo Payments → https://<deployment>.convex.site/dodo/webhook
http.route({ path: "/dodo/webhook", method: "POST", handler: dodoWebhook });

export default http;
