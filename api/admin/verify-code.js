import { timingSafeEqual } from "node:crypto";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const expected = process.env.SAHAAYA_ADMIN_ACCESS_CODE;
  if (!expected) {
    return res.status(503).json({
      error: "Administrator access verification is not configured yet."
    });
  }

  const submitted = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  const expectedBuffer = Buffer.from(expected, "utf8");
  const submittedBuffer = Buffer.from(submitted, "utf8");
  const sameLength = expectedBuffer.length === submittedBuffer.length;
  const valid = sameLength && timingSafeEqual(expectedBuffer, submittedBuffer);

  if (!valid) {
    return res.status(401).json({ error: "The administrator access code is incorrect." });
  }

  return res.status(200).json({ verified: true });
}
