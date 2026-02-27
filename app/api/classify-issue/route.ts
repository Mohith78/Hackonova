import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const mlApiUrl = process.env.ML_API_URL;
    if (!mlApiUrl) {
      return NextResponse.json({ error: "ML_API_URL is not configured." }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing image file." }, { status: 400 });
    }

    const forwardData = new FormData();
    forwardData.append("file", file);

    const predictUrl = `${mlApiUrl.replace(/\/$/, "")}/predict`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let mlResponse: Response;
    try {
      mlResponse = await fetch(predictUrl, {
        method: "POST",
        body: forwardData,
        signal: controller.signal,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reach ML API";
      return NextResponse.json(
        {
          error: "ML service unavailable.",
          details: `${message}. Check ML_API_URL and ensure the ML server is running.`,
        },
        { status: 503 }
      );
    } finally {
      clearTimeout(timeout);
    }

    const text = await mlResponse.text();
    if (!mlResponse.ok) {
      return NextResponse.json(
        {
          error: "ML API error.",
          details: `Status ${mlResponse.status}${text ? `: ${text}` : ""}`,
        },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "ML API returned invalid JSON." }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
