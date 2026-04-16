import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/config";
import {
  assertPaymentIpLimit,
  assertPaymentUserLimit,
  RepeatRateLimitError,
} from "@/lib/repeat-rate-limit";

const TRANSACTION_ID_REGEX = /^[A-Za-z0-9]{12}$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const MAX_PROOF_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

function getAccessToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new Error("Unauthorized.");
  }
  return header.slice("Bearer ".length).trim();
}

export async function POST(request: Request) {
  try {
    await assertPaymentIpLimit(request);
    const accessToken = getAccessToken(request);
    const contentType = request.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");

    const authClient = createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    await assertPaymentUserLimit(user.id);

    const admin = getSupabaseServiceRoleClient();
    let transactionId: string | null = null;
    let proofFile: File | null = null;
    let phoneNumber: string | null = null;

    if (isMultipart) {
      const formData = await request.formData();
      const rawTransactionId = formData.get("transactionId");
      const rawPhoneNumber = formData.get("phoneNumber");
      const proof = formData.get("proof");
      const normalized =
        typeof rawTransactionId === "string" ? rawTransactionId.trim() : "";
      if (normalized) {
        if (!TRANSACTION_ID_REGEX.test(normalized)) {
          return NextResponse.json(
            { error: "Transaction ID must be exactly 12 letters and numbers." },
            { status: 400 },
          );
        }
        transactionId = normalized;
      }
      const normalizedPhone =
        typeof rawPhoneNumber === "string" ? rawPhoneNumber.trim() : "";
      if (!PHONE_REGEX.test(normalizedPhone)) {
        return NextResponse.json(
          { error: "Enter a valid phone number with 10 to 15 digits." },
          { status: 400 },
        );
      }
      phoneNumber = normalizedPhone;
      if (!(proof instanceof File)) {
        return NextResponse.json(
          { error: "Upload payment proof screenshot." },
          { status: 400 },
        );
      }
      proofFile = proof;
    } else {
      const body = (await request.json().catch(() => ({}))) as {
        transactionId?: unknown;
        phoneNumber?: unknown;
      };
      const normalized =
        typeof body.transactionId === "string" ? body.transactionId.trim() : "";
      if (!TRANSACTION_ID_REGEX.test(normalized)) {
        return NextResponse.json(
          { error: "Transaction ID must be exactly 12 letters and numbers." },
          { status: 400 },
        );
      }
      transactionId = normalized;
      const normalizedPhone =
        typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
      if (!PHONE_REGEX.test(normalizedPhone)) {
        return NextResponse.json(
          { error: "Enter a valid phone number with 10 to 15 digits." },
          { status: 400 },
        );
      }
      phoneNumber = normalizedPhone;
    }

    if (proofFile) {
      if (!ALLOWED_MIME_TYPES.has(proofFile.type)) {
        return NextResponse.json(
          { error: "Proof must be PNG, JPG, or WEBP image." },
          { status: 400 },
        );
      }
      if (proofFile.size <= 0 || proofFile.size > MAX_PROOF_BYTES) {
        return NextResponse.json(
          { error: "Proof image must be under 8MB." },
          { status: 400 },
        );
      }
    }

    let proofPath: string | null = null;
    if (proofFile) {
      const ext = inferFileExtension(proofFile.type);
      proofPath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const arrayBuffer = await proofFile.arrayBuffer();
      const { error: uploadError } = await admin.storage
        .from("payment-proofs")
        .upload(proofPath, arrayBuffer, {
          contentType: proofFile.type,
          upsert: false,
        });
      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }
    }

    let aiConfidence: number | null = null;
    let aiResult: Record<string, unknown> | null = null;
    let aiScore: number | null = null;
    const status = "approved";
    let verificationSource = "ai_screening";
    let verificationNotes = "AI verification completed. Access granted.";

    if (proofFile && proofPath) {
      const ai = await runPaymentProofAiCheck(admin, proofPath);
      aiConfidence = ai.confidence;
      aiResult = ai.payload;
      aiScore = ai.score;
      verificationSource = "ai_screening";
      verificationNotes = ai.reason ?? verificationNotes;
    } else if (transactionId) {
      verificationSource = "transaction_id";
      verificationNotes = "Transaction ID submitted. Access granted.";
    }
    const combinedAiPayload: Record<string, unknown> = {
      ...(aiResult ?? {}),
      submittedPhoneNumber: phoneNumber,
    };

    const insertRow = {
      user_id: user.id,
      transaction_id: transactionId,
      proof_path: proofPath,
      status,
      verification_source: verificationSource,
      verification_confidence: aiConfidence,
      verification_score: aiScore,
      verification_notes: verificationNotes,
      ai_payload: combinedAiPayload,
    };
    let { error: insertError } = await admin
      .from("payment_transactions")
      .insert(insertRow);

    if (insertError && isMissingVerificationScoreColumn(insertError.message)) {
      const fallbackRow: typeof insertRow & { verification_score?: number | null } = {
        ...insertRow,
      };
      delete fallbackRow.verification_score;
      const retry = await admin.from("payment_transactions").insert(fallbackRow);
      insertError = retry.error;
    }

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { error: updateError } = await admin
      .from("users")
      .update({ is_paid: true })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      status,
      score: aiScore,
      message:
        "Payment submitted. AI checked your screenshot and Repeat access is active.",
    });
  } catch (error) {
    if (error instanceof RepeatRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to submit payment.";
    const status = message === "Unauthorized." ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

function isMissingVerificationScoreColumn(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("verification_score") &&
    normalized.includes("schema cache")
  );
}

function inferFileExtension(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

async function runPaymentProofAiCheck(
  admin: ReturnType<typeof getSupabaseServiceRoleClient>,
  proofPath: string,
): Promise<{
  confidence: number | null;
  score: number | null;
  reason: string | null;
  payload: Record<string, unknown> | null;
}> {
  const apiKey = process.env.HACK_CLUB_AI_API_KEY?.trim();
  if (!apiKey) {
    return {
      confidence: null,
      score: null,
      reason: "AI key missing; manual review required.",
      payload: null,
    };
  }

  const { data: signedData, error: signedError } = await admin.storage
    .from("payment-proofs")
    .createSignedUrl(proofPath, 60 * 10);

  if (signedError || !signedData?.signedUrl) {
    return {
      confidence: null,
      score: null,
      reason: "Could not generate signed URL for AI review.",
      payload: null,
    };
  }

  const model = process.env.HACK_CLUB_AI_CHAT_MODEL ?? "google/gemini-2.5-flash";
  const prompt =
    "Review this UPI payment screenshot. Return strict JSON only with keys: isSuccess(boolean), amount(number|null), currency(string|null), payeeMatch(boolean), payerName(string|null), transactionId(string|null), confidence(number 0-1), score(number 0-100), reason(string). Check whether amount is exactly 39 or 40 INR, and payee matches UPI shrit1401@oksbi or name Shrit Shrivastava. Score higher when amount and payee both match clearly.";

  const response = await fetch("https://ai.hackclub.com/proxy/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: signedData.signedUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      confidence: null,
      score: null,
      reason: `AI request failed: ${response.status} ${body.slice(0, 180)}`,
      payload: null,
    };
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return {
      confidence: null,
      score: null,
      reason: "AI returned empty response.",
      payload: null,
    };
  }

  let payload: Record<string, unknown> | null = null;
  try {
    payload = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return {
      confidence: null,
      score: null,
      reason: "AI response was not valid JSON.",
      payload: null,
    };
  }

  const confidence = typeof payload.confidence === "number" ? payload.confidence : null;
  const amount = typeof payload.amount === "number" ? payload.amount : null;
  const aiScoreRaw = typeof payload.score === "number" ? payload.score : null;
  const inExpectedAmount = amount === 39 || amount === 40;
  const computedScore =
    aiScoreRaw !== null ? Math.max(0, Math.min(100, aiScoreRaw)) : null;
  const score =
    computedScore !== null
      ? computedScore
      : Math.round((confidence ?? 0) * (inExpectedAmount ? 100 : 70));
  const reason =
    typeof payload.reason === "string" && payload.reason.trim()
      ? payload.reason.trim()
      : "AI reviewed payment proof. Manual verification required.";

  return {
    confidence,
    score,
    reason,
    payload,
  };
}
