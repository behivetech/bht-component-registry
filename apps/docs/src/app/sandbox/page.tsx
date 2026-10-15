import type { Metadata } from "next";
import { Sandbox } from "@/components/docs/sandbox";

export const metadata: Metadata = {
  title: "Live preview",
  // Reached only as an embedded frame or via "Open in new tab"; never a destination.
  robots: { index: false, follow: false },
};

/**
 * The document every live example renders in. It has no chrome of its own:
 * the embedding page owns the title bar, the editor and the controls, and
 * this page owns one thing — the running program. See sandbox-protocol.ts.
 */
export default function SandboxPage() {
  return <Sandbox />;
}
