import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getClassName } from "@bht-component-registry/class-names";
import styles from "./not-found.module.scss";

/**
 * The static export ships this as 404.html; a host serves it for any path
 * that was not prerendered (an unknown scope or component included).
 */
export default function NotFound() {
  const [rootClass] = getClassName({ rootClass: "NotFoundPage", styles });
  return (
    <>
      <SiteHeader />
      <main className={rootClass}>
        <h1>Not found</h1>
        <p>
          That page doesn&apos;t exist in this registry.{" "}
          <Link href="/">Back to the start</Link>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
