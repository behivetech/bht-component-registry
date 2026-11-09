import Link from "next/link";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./version-banner.module.scss";

/**
 * Above a past version's pages: which version this is, when it was
 * snapshotted, and the way to the latest. A snapshot of the version the repo
 * is at says so too — it is the permalink of that release, but the live page
 * is where the examples run.
 */
export function VersionBanner({
  base,
  title,
  version,
  current,
  date,
}: {
  base: string;
  title: string;
  version: string;
  current: string;
  date: string;
}) {
  const outdated = version !== current;
  const [rootClass, getChildClass] = getClassName({
    rootClass: "VersionBanner",
    styles,
    modifiers: { outdated },
  });
  return (
    <p className={rootClass}>
      {outdated ? (
        <>
          You are viewing <strong>{title} v{version}</strong>, snapshotted{" "}
          {date}. The latest is v{current}.{" "}
          <Link href={base} className={getChildClass("link")}>
            Go to the latest →
          </Link>
        </>
      ) : (
        <>
          This is the snapshot of <strong>v{version}</strong>, the current
          version, as recorded on {date}.{" "}
          <Link href={base} className={getChildClass("link")}>
            The live page runs its examples →
          </Link>
        </>
      )}
    </p>
  );
}
