import { NextRequest, NextResponse } from "next/server";
import { getPresignedUploadUrl, getUniqueFileKey } from "@/utils/s3Utils";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fileType, fileName } = body;

        // validate input
        if (!fileType || !fileName) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const allowedTypes = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "application/pdf", "application/msword"];

        if (!allowedTypes.includes(fileType)) {
            return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
        }

        const isResume = fileName.toLowerCase().includes("resume") || fileType.includes("wordprocessingml.document");

        const prefix = isResume ? "resumes" : "job-descriptions";

        const fileKey = getUniqueFileKey(`${prefix}/${fileName}`);

        const expiresIn = parseInt(process.env.PRESIGNED_URL_EXPIRY || "300", 10);

        const uploadUrl = await getPresignedUploadUrl(fileKey, fileType, expiresIn);

        return NextResponse.json({ url: uploadUrl, key: fileKey, expiresIn });
    } catch (error) {
        console.error("Error generating presigned upload URL:", error);
        return NextResponse.json({ error: "Failed to generate presigned upload URL" }, { status: 500 });
    }
}