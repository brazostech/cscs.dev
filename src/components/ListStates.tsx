import { Subheading } from "./catalyst/heading";
import { Text } from "./catalyst/text";

/** The message of an `Error`, else `fallback` for anything else that was thrown. */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** The loading state of a page that loads data. `label` is the visible and announced text. */
export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="py-12 text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent dark:border-indigo-400"></div>
      <Text className="mt-4">{label}</Text>
    </div>
  );
}

/**
 * The empty and error states of a page that loads data or has nothing to
 * show: an icon, a title and a message, then any `children` (such as a link)
 * below them.
 */
export function Notice({
  icon,
  title,
  message,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="py-12 text-center">
      {icon}
      <Subheading level={3}>{title}</Subheading>
      <Text className="mt-1">{message}</Text>
      {children}
    </div>
  );
}
