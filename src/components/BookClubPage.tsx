import { useState, useEffect } from "react";
import {
  getCurrentBook,
  getCompletedBooks,
  getBookCoverUrl,
  type BookData,
} from "../lib/pocketbase";
import { useAuth } from "../stores/authStore";

export default function BookClubPage() {
  const { user } = useAuth();
  const isModerator = user?.role === "moderator";

  const [currentBook, setCurrentBook] = useState<BookData | null>(null);
  const [completedBooks, setCompletedBooks] = useState<BookData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBooks() {
      try {
        const [current, completed] = await Promise.all([
          getCurrentBook(),
          getCompletedBooks(),
        ]);
        setCurrentBook(current);
        setCompletedBooks(completed);
      } catch (err) {
        console.error("Error fetching books:", err);
        setError(err instanceof Error ? err.message : "Failed to load books");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBooks();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden">
        <svg
          aria-hidden="true"
          className="absolute inset-0 -z-10 h-full w-full [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-zinc-200 dark:stroke-zinc-800"
        >
          <defs>
            <pattern
              x="50%"
              y={-1}
              id="book-pattern"
              width={200}
              height={200}
              patternUnits="userSpaceOnUse"
            >
              <path d="M.5 200V.5H200" fill="none"></path>
            </pattern>
          </defs>
          <rect
            fill="url(#book-pattern)"
            width="100%"
            height="100%"
            strokeWidth={0}
          ></rect>
        </svg>

        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl dark:text-white">
              Book Club
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              Learning about Computer Science, Product Development, and AI
              through collaborative reading and discussion.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          {/* About Section */}
          <div className="mb-16">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
              What We&apos;re About
            </h2>
            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <p className="text-lg text-zinc-600 dark:text-zinc-400">
                Our book club brings together a group of friends passionate
                about deepening their understanding of technology, product
                development, and artificial intelligence. We meet regularly to
                discuss technical literature, share insights, and learn from
                each other&apos;s perspectives.
              </p>
            </div>
          </div>

          {/* Moderator Actions */}
          {isModerator && (
            <div className="mb-8">
              <a
                href="/app/books"
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
              >
                Manage Books
              </a>
            </div>
          )}

          {/* Dynamic Content */}
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent dark:border-indigo-400"></div>
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                Loading books...
              </p>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">
                Error loading books
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {error}
              </p>
            </div>
          ) : (
            <>
              {/* Current Book */}
              {currentBook ? (
                <div className="mb-16 rounded-2xl bg-indigo-50 p-8 ring-1 ring-indigo-100 dark:bg-indigo-950/20 dark:ring-indigo-900/30">
                  <div className="mb-4 flex items-center gap-x-3">
                    <span className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1 text-sm font-medium text-white">
                      Currently Reading
                    </span>
                  </div>
                  <div className="flex flex-col gap-6 sm:flex-row">
                    {currentBook.cover_image && (
                      <img
                        src={getBookCoverUrl(currentBook) ?? undefined}
                        alt={`Cover of ${currentBook.title}`}
                        className="h-48 w-32 flex-shrink-0 rounded-lg object-cover shadow-md"
                      />
                    )}
                    <div>
                      <h3 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
                        {currentBook.title}
                      </h3>
                      <p className="mb-1 text-base text-zinc-600 dark:text-zinc-400">
                        by {currentBook.author}
                      </p>
                      {currentBook.description && (
                        <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
                          {currentBook.description}
                        </p>
                      )}
                      {currentBook.purchase_link && (
                        <a
                          href={currentBook.purchase_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          Find this book &rarr;
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-16 rounded-2xl bg-zinc-50 p-8 ring-1 ring-zinc-200 dark:bg-zinc-900/50 dark:ring-zinc-800">
                  <p className="text-base text-zinc-600 dark:text-zinc-400">
                    No book is currently being read. Check back soon for our
                    next selection!
                  </p>
                </div>
              )}

              {/* Past Books */}
              {completedBooks.length > 0 && (
                <div>
                  <h2 className="mb-6 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
                    Books We&apos;ve Read
                  </h2>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {completedBooks.map((book) => (
                      <div
                        key={book.id}
                        className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800"
                      >
                        <div className="flex gap-4">
                          {book.cover_image && (
                            <img
                              src={getBookCoverUrl(book) ?? undefined}
                              alt={`Cover of ${book.title}`}
                              className="h-24 w-16 flex-shrink-0 rounded object-cover shadow-sm"
                            />
                          )}
                          <div>
                            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
                              {book.title}
                            </h3>
                            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                              by {book.author}
                            </p>
                            {book.description && (
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {book.description}
                              </p>
                            )}
                            {book.purchase_link && (
                              <a
                                href={book.purchase_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                              >
                                Find this book &rarr;
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Membership Notice */}
          <div className="mt-16 rounded-2xl bg-zinc-50 p-8 ring-1 ring-zinc-200 dark:bg-zinc-900/50 dark:ring-zinc-800">
            <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-white">
              Interested in Joining?
            </h2>
            <p className="mb-6 text-base text-zinc-600 dark:text-zinc-400">
              We&apos;re currently not accepting new members, but we may open up
              membership in the future. Stay tuned by following our updates!
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="/blog"
                className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                Read Our Blog
              </a>
              <a
                href="/#newsletter"
                className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
              >
                Join Newsletter
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
