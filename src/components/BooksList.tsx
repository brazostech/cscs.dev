import { useCallback, useEffect, useState } from "react";
import {
  BookOpenIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { pb } from "../lib/pocketbase";
import type { BookRecord } from "../lib/types";
import { useAuth } from "../stores/authStore";
import { Badge, BadgeButton } from "./catalyst/badge";
import { Button } from "./catalyst/button";
import { Heading, Subheading } from "./catalyst/heading";
import { Text } from "./catalyst/text";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function Spinner() {
  return (
    <div className="py-12 text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent dark:border-indigo-400"></div>
      <Text className="mt-4">Loading books...</Text>
    </div>
  );
}

function Notice({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="py-12 text-center">
      {icon}
      <Subheading level={3}>{title}</Subheading>
      <Text className="mt-1">{message}</Text>
    </div>
  );
}

/** Anything that is not "reading" reads as Completed, as the old page did. */
function StatusBadge({ status }: { status: BookRecord["status"] }) {
  return status === "reading" ? (
    <Badge color="indigo">Reading</Badge>
  ) : (
    <Badge color="zinc">Completed</Badge>
  );
}

interface BookCardProps {
  book: BookRecord;
  isPending: boolean;
  isModerator: boolean;
  onDelete: (book: BookRecord) => void;
}

function BookCard({ book, isPending, isModerator, onDelete }: BookCardProps) {
  return (
    <li className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 wrap-anywhere">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-white">
            {book.title}
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            by {book.author}
          </p>
        </div>
        <StatusBadge status={book.status} />
      </div>
      {book.description && (
        <p className="line-clamp-2 text-sm wrap-anywhere text-zinc-600 dark:text-zinc-400">
          {book.description}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Order: {book.sort_order}
        </span>
        {isModerator && (
          <div className="flex items-center gap-2">
            <BadgeButton
              href={`/app/create-book?edit=${encodeURIComponent(book.id)}`}
              aria-label={`Edit: ${book.title}`}
            >
              Edit
            </BadgeButton>
            <BadgeButton
              color="red"
              disabled={isPending}
              aria-label={`Delete: ${book.title}`}
              className="data-disabled:opacity-50"
              onClick={() => onDelete(book)}
            >
              Delete
            </BadgeButton>
          </div>
        )}
      </div>
    </li>
  );
}

export default function BooksList() {
  const { user } = useAuth();
  const isModerator = user?.role === "moderator";
  const isLoggedIn = !!user;

  const [books, setBooks] = useState<BookRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());

  const loadBooks = useCallback(async () => {
    try {
      const loaded = await pb
        .collection<BookRecord>("books")
        .getFullList({ sort: "status,-created" });
      setError(null);
      setBooks(loaded);
    } catch (err) {
      console.error("Error loading books:", err);
      setError(errorMessage(err, "Failed to load books"));
    }
  }, []);

  // Same gate as before the port: no signed-in user means the login page.
  useEffect(() => {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    loadBooks();
  }, [isLoggedIn, loadBooks]);

  async function handleDelete(book: BookRecord) {
    if (!confirm("Are you sure you want to delete this book?")) {
      return;
    }

    setPendingIds((ids) => new Set(ids).add(book.id));
    try {
      await pb.collection<BookRecord>("books").delete(book.id);
      await loadBooks();
    } catch (err) {
      console.error("Error deleting book:", err);
      alert("Failed to delete book: " + errorMessage(err, "Unknown error"));
    } finally {
      setPendingIds((ids) => {
        const next = new Set(ids);
        next.delete(book.id);
        return next;
      });
    }
  }

  let content: React.ReactNode;
  if (error) {
    content = (
      <Notice
        icon={
          <ExclamationTriangleIcon
            aria-hidden="true"
            className="mx-auto h-12 w-12 text-red-400"
          />
        }
        title="Error loading books"
        message={error}
      />
    );
  } else if (books === null) {
    content = <Spinner />;
  } else if (books.length === 0) {
    content = (
      <Notice
        icon={
          <BookOpenIcon
            aria-hidden="true"
            className="mx-auto h-12 w-12 text-zinc-400"
          />
        }
        title="No books"
        message="No books have been added yet."
      />
    );
  } else {
    content = (
      <ul className="space-y-4">
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            isPending={pendingIds.has(book.id)}
            isModerator={isModerator}
            onDelete={handleDelete}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Heading>Books</Heading>
          <Text className="mt-2">Manage book club reading list</Text>
        </div>
        {isModerator && (
          <Button color="indigo" href="/app/create-book" className="shrink-0">
            <PlusIcon data-slot="icon" />
            Add Book
          </Button>
        )}
      </div>
      {content}
    </div>
  );
}
