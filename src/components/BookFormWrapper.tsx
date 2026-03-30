import { useEffect, useState } from "react";
import BookForm from "./BookForm";

export default function BookFormWrapper() {
  const [bookId, setBookId] = useState<string | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get("edit");

    if (editId) {
      setBookId(editId);
    }
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {bookId ? "Edit Book" : "Add Book"}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {bookId ? "Update book details" : "Add a new book to the book club"}
        </p>
      </div>

      <div className="max-w-2xl">
        <BookForm bookId={bookId} />
      </div>
    </div>
  );
}
