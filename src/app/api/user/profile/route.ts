import { NextRequest, NextResponse } from "next/server";
import {
  readUserProfile,
  writeUserProfile,
  readWorkspaceFields,
  writeWorkspaceFields,
  type UserProfile,
  type WorkspaceFields,
} from "@/lib/user/profile-io";
import { route } from "@/lib/runtime/route-wrapper";

export const GET = route(async () => {
  const profile = await readUserProfile();
  const workspace = await readWorkspaceFields();
  return NextResponse.json({ profile, workspace });
});

interface PutBody {
  profile?: Partial<UserProfile>;
  workspace?: Partial<WorkspaceFields>;
}

export const PUT = route(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as PutBody;
  const profile = body.profile
    ? await writeUserProfile(body.profile)
    : await readUserProfile();
  const workspace = body.workspace
    ? await writeWorkspaceFields(body.workspace)
    : await readWorkspaceFields();
  return NextResponse.json({ profile, workspace });
});
