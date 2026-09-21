import RepeatV2Client from "../repeat-v2-client";
import "katex/dist/katex.min.css";
import "../repeat-v2.css";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ paper?: string; source?: string }>;
}) {
  const query = await searchParams;
  return (
    <RepeatV2Client
      initialPaperId={typeof query.paper === "string" ? query.paper : ""}
      initialSource={typeof query.source === "string" ? query.source : ""}
    />
  );
}
