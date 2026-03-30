import { useState, useEffect } from "react";
import { getCurrentBook, type BookData } from "../lib/pocketbase";

export default function CurrentBookBadge() {
  const [book, setBook] = useState<BookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBook() {
      try {
        const current = await getCurrentBook();
        setBook(current);
      } catch {
        // Silently fail — the badge is supplementary content
      } finally {
        setIsLoading(false);
      }
    }

    fetchBook();
  }, []);

  if (isLoading) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Currently reading:{" "}
        <span className="inline-block h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></span>
      </p>
    );
  }

  if (!book) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No book currently selected
      </p>
    );
  }

  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-400">
      Currently reading:{" "}
      <span className="font-medium text-zinc-900 dark:text-white">
        {book.title}
      </span>{" "}
      by {book.author}
    </p>
  );
}
